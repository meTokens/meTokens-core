// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibMeta} from "../libs/LibMeta.sol";
import {LibDiamond} from "../libs/LibDiamond.sol";
import {LibHub, HubInfo} from "../libs/LibHub.sol";
import {Modifiers} from "../libs/Details.sol";
import {IHubFacet} from "../interfaces/IHubFacet.sol";
import {IVault} from "../interfaces/IVault.sol";
import {IRegistry} from "../interfaces/IRegistry.sol";
import {ICurve} from "../interfaces/ICurve.sol";
import {IFoundryFacet} from "../interfaces/IFoundryFacet.sol";

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
        HubInfo storage hubInfo = s.hubs[s.hubCount];
        hubInfo.active = true;
        hubInfo.owner = owner;
        hubInfo.asset = asset;
        hubInfo.vault = address(vault);
        hubInfo.curve = address(curve);
        hubInfo.refundRatio = refundRatio;
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
        HubInfo storage hubInfo = s.hubs[id];
        require(
            sender == hubInfo.owner || sender == s.deactivateController,
            "!owner && !deactivateController"
        );
        require(hubInfo.active, "!active");
        hubInfo.active = false;
        emit Deactivate(id);
    }

    function initUpdate(
        uint256 id,
        address targetCurve,
        uint256 targetRefundRatio,
        bytes memory encodedCurveDetails
    ) external {
        HubInfo storage hubInfo = s.hubs[id];
        address sender = LibMeta.msgSender();
        require(sender == hubInfo.owner, "!owner");
        if (hubInfo.updating && block.timestamp > hubInfo.endTime) {
            LibHub.finishUpdate(id);
        }
        require(!hubInfo.updating, "already updating");

        require(block.timestamp >= hubInfo.endCooldown, "Still cooling down");
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
                targetRefundRatio != hubInfo.refundRatio,
                "targetRefundRatio == refundRatio"
            );
            hubInfo.targetRefundRatio = targetRefundRatio;
        }

        bool reconfigure;
        if (encodedCurveDetails.length > 0) {
            if (targetCurve == address(0)) {
                ICurve(hubInfo.curve).initReconfigure(id, encodedCurveDetails);
                reconfigure = true;
            } else {
                require(
                    s.curveRegistry.isApproved(targetCurve),
                    "targetCurve !approved"
                );
                require(targetCurve != hubInfo.curve, "targetCurve==curve");
                ICurve(targetCurve).register(id, encodedCurveDetails);
                hubInfo.targetCurve = targetCurve;
            }
        }

        hubInfo.reconfigure = reconfigure;
        hubInfo.updating = true;
        hubInfo.startTime = block.timestamp + s.hubWarmup;
        hubInfo.endTime = block.timestamp + s.hubWarmup + s.hubDuration;
        hubInfo.endCooldown =
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
            hubInfo.startTime,
            hubInfo.endTime,
            hubInfo.endCooldown
        );
    }

    function finishUpdate(uint256 id) external {
        LibHub.finishUpdate(id);
    }

    function cancelUpdate(uint256 id) external {
        HubInfo storage hubInfo = s.hubs[id];
        address sender = LibMeta.msgSender();
        require(sender == hubInfo.owner, "!owner");
        require(hubInfo.updating, "!updating");
        require(block.timestamp < hubInfo.startTime, "Update has started");

        hubInfo.targetRefundRatio = 0;
        hubInfo.reconfigure = false;
        hubInfo.targetCurve = address(0);
        hubInfo.updating = false;
        hubInfo.startTime = 0;
        hubInfo.endTime = 0;
        hubInfo.endCooldown = 0;

        emit CancelUpdate(id);
    }

    function transferHubOwnership(uint256 id, address newOwner) external {
        HubInfo storage hubInfo = s.hubs[id];
        address sender = LibMeta.msgSender();
        require(sender == hubInfo.owner, "!owner");
        require(newOwner != hubInfo.owner, "Same owner");
        hubInfo.owner = newOwner;

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

    function getHubInfo(uint256 id) external view returns (HubInfo memory) {
        return LibHub.getHubInfo(id);
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
