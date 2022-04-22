// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {IFoundryFacet} from "../interfaces/IFoundryFacet.sol";
import {IHubFacet} from "../interfaces/IHubFacet.sol";
import {IVault} from "../interfaces/IVault.sol";
import {LibCurve} from "../libs/LibCurve.sol";
import {LibDiamond} from "../libs/LibDiamond.sol";
import {LibHub, HubInfo} from "../libs/LibHub.sol";
import {LibMeta} from "../libs/LibMeta.sol";
import {Modifiers} from "../libs/LibAppStorage.sol";

/// @title meTokens Hub Facet
/// @author @cartercarlson, @zgorizzo69, @parv3213
/// @notice This contract manages all hub configurations for meTokens protocol
contract HubFacet is IHubFacet, Modifiers {
    /// @inheritdoc IHubFacet
    function register(
        address owner,
        address asset,
        IVault vault,
        uint256 refundRatio,
        uint256 baseY,
        uint32 reserveWeight,
        bytes memory encodedVaultArgs
    ) external override onlyRegisterController {
        require(s.vaultRegistry.isApproved(address(vault)), "vault !approved");
        require(refundRatio < s.MAX_REFUND_RATIO, "refundRatio > MAX");
        require(refundRatio > 0, "refundRatio == 0");

        // Ensure asset is valid based on encoded args and vault validation logic
        require(vault.isValid(asset, encodedVaultArgs), "asset !valid");

        // Store value set base parameters to `{CurveName}.sol`
        uint256 id = ++s.hubCount;
        LibCurve.register(id, baseY, reserveWeight);
        // Save the hub to the registry
        HubInfo storage hubInfo = s.hubs[s.hubCount];
        hubInfo.active = true;
        hubInfo.owner = owner;
        hubInfo.asset = asset;
        hubInfo.vault = address(vault);
        hubInfo.refundRatio = refundRatio;
        emit Register(
            id,
            owner,
            asset,
            address(vault),
            refundRatio,
            baseY,
            reserveWeight,
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
        uint256 targetRefundRatio,
        uint32 targetReserveWeight
    ) external override {
        HubInfo storage hubInfo = s.hubs[id];

        require(LibMeta.msgSender() == hubInfo.owner, "!owner");
        if (hubInfo.updating && block.timestamp > hubInfo.endTime) {
            LibHub.finishUpdate(id);
        }
        require(!hubInfo.updating, "already updating");

        require(block.timestamp >= hubInfo.endCooldown, "Still cooling down");
        // Make sure at least one of the values is different
        require(
            (targetRefundRatio != 0) || (targetReserveWeight > 0),
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

        if (targetReserveWeight > 0) {
            LibCurve.initReconfigure(id, targetReserveWeight);
            hubInfo.reconfigure = true;
        }

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
            targetRefundRatio,
            targetReserveWeight,
            hubInfo.reconfigure,
            hubInfo.startTime,
            hubInfo.endTime,
            hubInfo.endCooldown
        );
    }

    /// @inheritdoc IHubFacet
    function finishUpdate(uint256 id) external override {
        LibHub.finishUpdate(id);
    }

    /// @inheritdoc IHubFacet
    function cancelUpdate(uint256 id) external override {
        HubInfo storage hubInfo = s.hubs[id];

        require(LibMeta.msgSender() == hubInfo.owner, "!owner");
        require(hubInfo.updating, "!updating");
        require(block.timestamp < hubInfo.startTime, "Update has started");

        hubInfo.targetRefundRatio = 0;
        hubInfo.reconfigure = false;
        hubInfo.updating = false;
        hubInfo.startTime = 0;
        hubInfo.endTime = 0;
        hubInfo.endCooldown = 0;

        emit CancelUpdate(id);
    }

    /// @inheritdoc IHubFacet
    function transferHubOwnership(uint256 id, address newOwner)
        external
        override
    {
        HubInfo storage hubInfo = s.hubs[id];

        require(LibMeta.msgSender() == hubInfo.owner, "!owner");
        require(newOwner != hubInfo.owner, "Same owner");
        hubInfo.owner = newOwner;

        emit TransferHubOwnership(id, newOwner);
    }

    /// @inheritdoc IHubFacet
    function setHubWarmup(uint256 warmup)
        external
        override
        onlyDurationsController
    {
        require(warmup != s.hubWarmup, "same warmup");
        // NOTE: this check is done to ensure a meToken is not still resubscribing
        //  when the hub it points to has its' update live
        require(
            warmup >= s.meTokenWarmup + s.meTokenDuration,
            "warmup < meTokenWarmup + meTokenDuration"
        );
        s.hubWarmup = warmup;
    }

    /// @inheritdoc IHubFacet
    function setHubDuration(uint256 duration)
        external
        override
        onlyDurationsController
    {
        require(duration != s.hubDuration, "same duration");
        s.hubDuration = duration;
    }

    /// @inheritdoc IHubFacet
    function setHubCooldown(uint256 cooldown)
        external
        override
        onlyDurationsController
    {
        require(cooldown != s.hubCooldown, "same cooldown");
        s.hubCooldown = cooldown;
    }

    /// @inheritdoc IHubFacet
    function getHubInfo(uint256 id)
        external
        view
        override
        returns (HubInfo memory)
    {
        return LibHub.getHubInfo(id);
    }

    /// @inheritdoc IHubFacet
    function count() external view override returns (uint256) {
        return s.hubCount;
    }

    /// @inheritdoc IHubFacet
    function hubWarmup() external view override returns (uint256) {
        return LibHub.warmup();
    }

    /// @inheritdoc IHubFacet
    function hubDuration() external view override returns (uint256) {
        return LibHub.duration();
    }

    /// @inheritdoc IHubFacet
    function hubCooldown() external view override returns (uint256) {
        return LibHub.cooldown();
    }
}
