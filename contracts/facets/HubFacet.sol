// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibDiamond} from "../libs/LibDiamond.sol";
import {LibHub, HubInfo} from "../libs/LibHub.sol";
import "../libs/Details.sol";
import {IHub} from "../interfaces/IHub.sol";
import {IVault} from "../interfaces/IVault.sol";
import {IRegistry} from "../interfaces/IRegistry.sol";
import {ICurve} from "../interfaces/ICurve.sol";
import {IFoundry} from "../interfaces/IFoundry.sol";

contract HubFacet is Modifiers {
    event Register(
        uint256 _id,
        address _owner,
        address _asset,
        address _vault,
        address _curve,
        uint256 _refundRatio,
        bytes _encodedCurveDetails,
        bytes _encodedVaultArgs
    );
    event Deactivate(uint256 _id);
    event InitUpdate(
        uint256 _id,
        address _targetCurve,
        uint256 _targetRefundRatio,
        bytes _encodedCurveDetails,
        bool _reconfigure,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _endCooldown
    );
    event FinishUpdate(uint256 _id);
    event CancelUpdate(uint256 _id);
    event TransferHubOwnership(uint256 _id, address _newOwner);

    function register(
        address _owner,
        address _asset,
        IVault _vault,
        ICurve _curve,
        uint256 _refundRatio,
        bytes memory _encodedCurveDetails,
        bytes memory _encodedVaultArgs
    ) external onlyRegisterController {
        require(
            s.curveRegistry.isApproved(address(_curve)),
            "_curve !approved"
        );
        require(
            s.vaultRegistry.isApproved(address(_vault)),
            "_vault !approved"
        );

        require(_refundRatio < s.MAX_REFUND_RATIO, "_refundRatio > MAX");
        require(_refundRatio > 0, "_refundRatio == 0");

        // Ensure asset is valid based on encoded args and vault validation logic
        require(_vault.isValid(_asset, _encodedVaultArgs), "asset !valid");

        // Store value set base parameters to `{CurveName}.sol`
        uint256 id = ++s.hubCount;
        _curve.register(id, _encodedCurveDetails);

        // Save the hub to the registry
        HubInfo storage hub_ = s.hubs[s.hubCount];
        hub_.active = true;
        hub_.owner = _owner;
        hub_.asset = _asset;
        hub_.vault = address(_vault);
        hub_.curve = address(_curve);
        hub_.refundRatio = _refundRatio;
        emit Register(
            id,
            _owner,
            _asset,
            address(_vault),
            address(_curve),
            _refundRatio,
            _encodedCurveDetails,
            _encodedVaultArgs
        );
    }

    function deactivate(uint256 _id) external {
        HubInfo storage hub_ = s.hubs[_id];
        require(
            msg.sender == hub_.owner || msg.sender == s.deactivateController,
            "!owner && !deactivateController"
        );
        require(hub_.active, "!active");
        hub_.active = false;
        emit Deactivate(_id);
    }

    function initUpdate(
        uint256 _id,
        address _targetCurve,
        uint256 _targetRefundRatio,
        bytes memory _encodedCurveDetails
    ) external {
        HubInfo storage hub_ = s.hubs[_id];
        require(msg.sender == hub_.owner, "!owner");
        if (hub_.updating && block.timestamp > hub_.endTime) {
            LibHub.finishUpdate(_id);
        }
        require(!hub_.updating, "already updating");

        require(block.timestamp >= hub_.endCooldown, "Still cooling down");
        // Make sure at least one of the values is different
        require(
            (_targetRefundRatio != 0) || (_encodedCurveDetails.length > 0),
            "Nothing to update"
        );

        if (_targetRefundRatio != 0) {
            require(
                _targetRefundRatio < s.MAX_REFUND_RATIO,
                "_targetRefundRatio >= MAX"
            );
            require(
                _targetRefundRatio != hub_.refundRatio,
                "_targetRefundRatio == refundRatio"
            );
            hub_.targetRefundRatio = _targetRefundRatio;
        }

        bool reconfigure;
        if (_encodedCurveDetails.length > 0) {
            if (_targetCurve == address(0)) {
                ICurve(hub_.curve).initReconfigure(_id, _encodedCurveDetails);
                reconfigure = true;
            } else {
                require(
                    s.curveRegistry.isApproved(_targetCurve),
                    "_targetCurve !approved"
                );
                require(_targetCurve != hub_.curve, "targetCurve==curve");
                ICurve(_targetCurve).register(_id, _encodedCurveDetails);
                hub_.targetCurve = _targetCurve;
            }
        }

        hub_.reconfigure = reconfigure;
        hub_.updating = true;
        hub_.startTime = block.timestamp + s.hubWarmup;
        hub_.endTime = block.timestamp + s.hubWarmup + s.hubDuration;
        hub_.endCooldown =
            block.timestamp +
            s.hubWarmup +
            s.hubDuration +
            s.hubCooldown;

        emit InitUpdate(
            _id,
            _targetCurve,
            _targetRefundRatio,
            _encodedCurveDetails,
            reconfigure,
            hub_.startTime,
            hub_.endTime,
            hub_.endCooldown
        );
    }

    function finishUpdate(uint256 id) external {
        LibHub.finishUpdate(id);
    }

    function cancelUpdate(uint256 _id) external {
        HubInfo storage hub_ = s.hubs[_id];
        require(msg.sender == hub_.owner, "!owner");
        require(hub_.updating, "!updating");
        require(block.timestamp < hub_.startTime, "Update has started");

        hub_.targetRefundRatio = 0;
        hub_.reconfigure = false;
        hub_.targetCurve = address(0);
        hub_.updating = false;
        hub_.startTime = 0;
        hub_.endTime = 0;
        hub_.endCooldown = 0;

        emit CancelUpdate(_id);
    }

    function transferHubOwnership(uint256 _id, address _newOwner) external {
        HubInfo storage hub_ = s.hubs[_id];
        require(msg.sender == hub_.owner, "!owner");
        require(_newOwner != hub_.owner, "Same owner");
        hub_.owner = _newOwner;

        emit TransferHubOwnership(_id, _newOwner);
    }

    function setHubWarmup(uint256 _warmup) external onlyDurationsController {
        require(_warmup != s.hubWarmup, "same warmup");
        s.hubWarmup = _warmup;
    }

    function setHubDuration(uint256 _duration)
        external
        onlyDurationsController
    {
        require(_duration != s.hubDuration, "same duration");
        s.hubDuration = _duration;
    }

    function setHubCooldown(uint256 _cooldown)
        external
        onlyDurationsController
    {
        require(_cooldown != s.hubCooldown, "same cooldown");
        s.hubCooldown = _cooldown;
    }

    function getDetails(uint256 _id) external view returns (HubInfo memory) {
        return LibHub.getHub(_id);
    }

    function count() external view returns (uint256) {
        return s.hubCount;
    }

    function hubWarmup() external view returns (uint256) {
        return LibHub.warmup();
    }

    function hubDuration() external view returns (uint256) {
        return LibHub.duration();
    }

    function hubCooldown() external view returns (uint256) {
        return LibHub.cooldown();
    }
}
