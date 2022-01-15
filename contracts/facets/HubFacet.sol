// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibDiamond} from "../libs/LibDiamond.sol";
import {LibHub, HubInfo} from "../libs/LibHub.sol";
import "../interfaces/IHub.sol";
import "../interfaces/IVault.sol";
import "../interfaces/IRegistry.sol";
import "../interfaces/ICurve.sol";
import "../interfaces/IFoundry.sol";

contract HubFacet {
    event Register(
        address _owner,
        address _asset,
        address _vault,
        address _curve,
        uint256 _refundRatio,
        bytes _encodedCurveDetails,
        bytes _encodedVaultArgs
    );
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
    event CancelUpdate(uint256 _id);
    event TransferHubOwnership(uint256 _id, address _newOwner);
    event FinishUpdate(uint256 _id);

    AppStorage internal s;

    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }

    function initialize(
        address _foundry,
        address _vaultRegistry,
        address _curveRegistry
    ) external {
        // Do nothing
    }

    function register(
        address _owner,
        address _asset,
        IVault _vault,
        ICurve _curve,
        uint256 _refundRatio,
        bytes memory _encodedCurveDetails,
        bytes memory _encodedVaultArgs
    ) external {
        // TODO: access control
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
        _curve.register(++s.hubCount, _encodedCurveDetails);

        // Save the hub to the registry
        Details.Hub storage hub_ = s.hubs[s.hubCount];
        hub_.active = true;
        hub_.owner = _owner;
        hub_.asset = _asset;
        hub_.vault = address(_vault);
        hub_.curve = address(_curve);
        hub_.refundRatio = _refundRatio;
        emit Register(
            _owner,
            _asset,
            address(_vault),
            address(_curve),
            _refundRatio,
            _encodedCurveDetails,
            _encodedVaultArgs
        );
    }

    function initUpdate(
        uint256 _id,
        address _targetCurve,
        uint256 _targetRefundRatio,
        bytes memory _encodedCurveDetails
    ) external {
        Details.Hub storage hub_ = s.hubs[_id];
        require(msg.sender == hub_.owner, "!owner");
        if (hub_.updating && block.timestamp > hub_.endTime) {
            this.finishUpdate(_id);
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

    function cancelUpdate(uint256 _id) external {
        Details.Hub storage hub_ = s.hubs[_id];
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

    function getDetails(uint256 _id) external view returns (HubInfo memory) {
        return LibHub.getHub(_id);
    }

    function transferHubOwnership(uint256 _id, address _newOwner) external {
        Details.Hub storage hub_ = s.hubs[_id];
        require(msg.sender == hub_.owner, "!owner");
        require(_newOwner != hub_.owner, "Same owner");
        hub_.owner = _newOwner;

        emit TransferHubOwnership(_id, _newOwner);
    }

    function setWarmup(uint256 _warmup) external onlyOwner {
        require(_warmup != s.hubWarmup, "_warmup == s.hubWarmup");
        s.hubWarmup = _warmup;
    }

    function setDuration(uint256 _duration) external onlyOwner {
        require(_duration != s.hubDuration, "_duration == s.hubDuration");
        s.hubDuration = _duration;
    }

    function setCooldown(uint256 _cooldown) external onlyOwner {
        require(_cooldown != s.hubCooldown, "_cooldown == s.hubCooldown");
        s.hubCooldown = _cooldown;
    }

    function count() external view returns (uint256) {
        return s.hubCount;
    }

    function warmup() external view returns (uint256) {
        return s.hubWarmup;
    }

    function duration() external view returns (uint256) {
        return s.hubDuration;
    }

    function cooldown() external view returns (uint256) {
        return s.hubCooldown;
    }

    function finishUpdate(uint256 id) external returns (Details.Hub memory) {
        Details.Hub storage hub_ = s.hubs[id];
        require(block.timestamp > hub_.endTime, "Still updating");

        if (hub_.targetRefundRatio != 0) {
            hub_.refundRatio = hub_.targetRefundRatio;
            hub_.targetRefundRatio = 0;
        }

        if (hub_.reconfigure) {
            ICurve(hub_.curve).finishReconfigure(id);
            hub_.reconfigure = false;
        }
        if (hub_.targetCurve != address(0)) {
            hub_.curve = hub_.targetCurve;
            hub_.targetCurve = address(0);
        }

        hub_.updating = false;
        hub_.startTime = 0;
        hub_.endTime = 0;

        emit FinishUpdate(id);
        return hub_;
    }
}
