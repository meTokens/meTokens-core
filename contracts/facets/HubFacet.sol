// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibDiamond} from "../libs/LibDiamond.sol";
import {LibHub, HubInfo} from "../libs/LibHub.sol";
import {Modifiers} from "../libs/Details.sol";
import {IHub} from "../interfaces/IHub.sol";
import {IVault} from "../interfaces/IVault.sol";
import {IRegistry} from "../interfaces/IRegistry.sol";
import {ICurve} from "../interfaces/ICurve.sol";
import {IFoundry} from "../interfaces/IFoundry.sol";

contract HubFacet is Modifiers {
    event Register(
        uint256 id,
        address owner,
        address asset,
        address vault,
        address curve,
        uint256 refundRatio,
        bytes encodedCurveDetails,
        bytes encodedVaultArgs
    );
    event Deactivate(uint256 id);
    event InitUpdate(
        uint256 id,
        address targetCurve,
        uint256 targetRefundRatio,
        bytes encodedCurveDetails,
        bool reconfigure,
        uint256 startTime,
        uint256 endTime,
        uint256 endCooldown
    );
    event FinishUpdate(uint256 id);
    event CancelUpdate(uint256 id);
    event TransferHubOwnership(uint256 id, address newOwner);

    function register(
        address owner,
        address asset,
        IVault vault,
        ICurve curve,
        uint256 refundRatio,
        bytes memory encodedCurveDetails,
        bytes memory encodedVaultArgs
    ) external onlyRegisterController {
        require(s.curveRegistry.isApproved(address(curve)), "curve !approved");
        require(s.vaultRegistry.isApproved(address(vault)), "vault !approved");
        require(refundRatio < s.MAX_REFUND_RATIO, "refundRatio > MAX");
        require(refundRatio > 0, "refundRatio == 0");

        // Ensure asset is valid based on encoded args and vault validation logic
        require(vault.isValid(asset, encodedVaultArgs), "asset !valid");

        // Store value set base parameters to `{CurveName}.sol`
        uint256 id = ++s.hubCount;
        curve.register(id, encodedCurveDetails);
        // Save the hub to the registry
        HubInfo storage hub = s.hubs[s.hubCount];
        hub.active = true;
        hub.owner = owner;
        hub.asset = asset;
        hub.vault = address(vault);
        hub.curve = address(curve);
        hub.refundRatio = refundRatio;
        emit Register(
            id,
            owner,
            asset,
            address(vault),
            address(curve),
            refundRatio,
            encodedCurveDetails,
            encodedVaultArgs
        );
    }

    function deactivate(uint256 id) external {
        address sender = LibMeta.msgSender();
        HubInfo storage hub = s.hubs[id];
        require(
            sender == hub.owner || sender == s.deactivateController,
            "!owner && !deactivateController"
        );
        require(hub.active, "!active");
        hub.active = false;
        emit Deactivate(id);
    }

    function initUpdate(
        uint256 id,
        address targetCurve,
        uint256 targetRefundRatio,
        bytes memory encodedCurveDetails
    ) external {
        HubInfo storage hub = s.hubs[id];
        address sender = LibMeta.msgSender();
        require(sender == hub.owner, "!owner");
        if (hub.updating && block.timestamp > hub.endTime) {
            LibHub.finishUpdate(id);
        }
        require(!hub.updating, "already updating");

        require(block.timestamp >= hub.endCooldown, "Still cooling down");
        // Make sure at least one of the values is different
        require(
            (targetRefundRatio != 0) || (encodedCurveDetails.length > 0),
            "Nothing to update"
        );

        if (targetRefundRatio != 0) {
            require(
                targetRefundRatio < s.MAX_REFUND_RATIO,
                "targetRefundRatio >= MAX"
            );
            require(
                targetRefundRatio != hub.refundRatio,
                "targetRefundRatio == refundRatio"
            );
            hub.targetRefundRatio = targetRefundRatio;
        }

        bool reconfigure;
        if (encodedCurveDetails.length > 0) {
            if (targetCurve == address(0)) {
                ICurve(hub.curve).initReconfigure(id, encodedCurveDetails);
                reconfigure = true;
            } else {
                require(
                    s.curveRegistry.isApproved(targetCurve),
                    "targetCurve !approved"
                );
                require(targetCurve != hub.curve, "targetCurve==curve");
                ICurve(targetCurve).register(id, encodedCurveDetails);
                hub.targetCurve = targetCurve;
            }
        }

        hub.reconfigure = reconfigure;
        hub.updating = true;
        hub.startTime = block.timestamp + s.hubWarmup;
        hub.endTime = block.timestamp + s.hubWarmup + s.hubDuration;
        hub.endCooldown =
            block.timestamp +
            s.hubWarmup +
            s.hubDuration +
            s.hubCooldown;

        emit InitUpdate(
            id,
            targetCurve,
            targetRefundRatio,
            encodedCurveDetails,
            reconfigure,
            hub.startTime,
            hub.endTime,
            hub.endCooldown
        );
    }

    function finishUpdate(uint256 id) external {
        LibHub.finishUpdate(id);
    }

    function cancelUpdate(uint256 id) external {
        HubInfo storage hub = s.hubs[id];
        address sender = LibMeta.msgSender();
        require(sender == hub.owner, "!owner");
        require(hub.updating, "!updating");
        require(block.timestamp < hub.startTime, "Update has started");

        hub.targetRefundRatio = 0;
        hub.reconfigure = false;
        hub.targetCurve = address(0);
        hub.updating = false;
        hub.startTime = 0;
        hub.endTime = 0;
        hub.endCooldown = 0;

        emit CancelUpdate(id);
    }

    function transferHubOwnership(uint256 id, address newOwner) external {
        HubInfo storage hub = s.hubs[id];
        address sender = LibMeta.msgSender();
        require(sender == hub.owner, "!owner");
        require(newOwner != hub.owner, "Same owner");
        hub.owner = newOwner;

        emit TransferHubOwnership(id, newOwner);
    }

    function setHubWarmup(uint256 warmup) external onlyDurationsController {
        require(warmup != s.hubWarmup, "same warmup");
        s.hubWarmup = warmup;
    }

    function setHubDuration(uint256 duration) external onlyDurationsController {
        require(duration != s.hubDuration, "same duration");
        s.hubDuration = duration;
    }

    function setHubCooldown(uint256 cooldown) external onlyDurationsController {
        require(cooldown != s.hubCooldown, "same cooldown");
        s.hubCooldown = cooldown;
    }

    function getHubDetails(uint256 id) external view returns (HubInfo memory) {
        return LibHub.getHub(id);
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
