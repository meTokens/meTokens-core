// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {LibMeta} from "../libs/LibMeta.sol";
import {LibDiamond} from "../libs/LibDiamond.sol";
import {LibHub, HubInfo} from "../libs/LibHub.sol";
import {Modifiers} from "../libs/LibAppStorage.sol";
import {IHubFacet} from "../interfaces/IHubFacet.sol";
import {IVault} from "../interfaces/IVault.sol";
import {IRegistry} from "../interfaces/IRegistry.sol";
import {ICurve} from "../interfaces/ICurve.sol";
import {IFoundryFacet} from "../interfaces/IFoundryFacet.sol";

contract HubFacet is IHubFacet, Modifiers {
    /// @inheritdoc IHubFacet
    function register(
        address owner,
        address asset,
        IVault vault,
        ICurve curve,
        uint256 refundRatio,
        bytes memory encodedCurveInfo,
        bytes memory encodedVaultArgs
    ) external override onlyRegisterController {
        require(s.curveRegistry.isApproved(address(curve)), "curve !approved");
        require(s.vaultRegistry.isApproved(address(vault)), "vault !approved");
        require(refundRatio < s.MAX_REFUND_RATIO, "refundRatio > MAX");
        require(refundRatio > 0, "refundRatio == 0");

        // Ensure asset is valid based on encoded args and vault validation logic
        require(vault.isValid(asset, encodedVaultArgs), "asset !valid");

        // Store value set base parameters to `{CurveName}.sol`
        uint256 id = ++s.hubCount;
        curve.register(id, encodedCurveInfo);
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
            encodedCurveInfo,
            encodedVaultArgs
        );
    }

    /// @inheritdoc IHubFacet
    function deactivate(uint256 id) external override {
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

    /// @inheritdoc IHubFacet
    function initUpdate(
        uint256 id,
        address targetCurve,
        uint256 targetRefundRatio,
        bytes memory encodedCurveInfo
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
            (targetRefundRatio != 0) || (encodedCurveInfo.length > 0),
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
        if (encodedCurveInfo.length > 0) {
            if (targetCurve == address(0)) {
                ICurve(hubInfo.curve).initReconfigure(id, encodedCurveInfo);
                reconfigure = true;
            } else {
                require(
                    s.curveRegistry.isApproved(targetCurve),
                    "targetCurve !approved"
                );
                require(targetCurve != hubInfo.curve, "targetCurve==curve");
                ICurve(targetCurve).register(id, encodedCurveInfo);
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
            encodedCurveInfo,
            reconfigure,
            hubInfo.startTime,
            hubInfo.endTime,
            hubInfo.endCooldown
        );
    }

    /// @inheritdoc IHubFacet
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

    /// @inheritdoc IHubFacet
    function finishUpdate(uint256 id) external {
        LibHub.finishUpdate(id);
    }

    /// @inheritdoc IHubFacet
    function transferHubOwnership(uint256 id, address newOwner) external {
        HubInfo storage hubInfo = s.hubs[id];
        address sender = LibMeta.msgSender();
        require(sender == hubInfo.owner, "!owner");
        require(newOwner != hubInfo.owner, "Same owner");
        hubInfo.owner = newOwner;

        emit TransferHubOwnership(id, newOwner);
    }

    /// @inheritdoc IHubFacet
    function setHubWarmup(uint256 amount) external onlyDurationsController {
        require(amount != s.hubWarmup, "same warmup");
        s.hubWarmup = amount;
    }

    /// @inheritdoc IHubFacet
    function setHubDuration(uint256 amount) external onlyDurationsController {
        require(amount != s.hubDuration, "same duration");
        s.hubDuration = amount;
    }

    /// @inheritdoc IHubFacet
    function setHubCooldown(uint256 amount) external onlyDurationsController {
        require(amount != s.hubCooldown, "same cooldown");
        s.hubCooldown = amount;
    }

    /// @inheritdoc IHubFacet
    function getHubInfo(uint256 id) external view returns (HubInfo memory) {
        return LibHub.getHubInfo(id);
    }

    /// @inheritdoc IHubFacet
    function count() external view returns (uint256) {
        return s.hubCount;
    }

    /// @inheritdoc IHubFacet
    function hubWarmup() external view returns (uint256) {
        return LibHub.warmup();
    }

    /// @inheritdoc IHubFacet
    function hubDuration() external view returns (uint256) {
        return LibHub.duration();
    }

    /// @inheritdoc IHubFacet
    function hubCooldown() external view returns (uint256) {
        return LibHub.cooldown();
    }
}
