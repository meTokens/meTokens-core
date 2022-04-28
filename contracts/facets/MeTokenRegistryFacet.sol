// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IHubFacet} from "../interfaces/IHubFacet.sol";
import {IMeToken} from "../interfaces/IMeToken.sol";
import {IMeTokenFactory} from "../interfaces/IMeTokenFactory.sol";
import {IMeTokenRegistryFacet} from "../interfaces/IMeTokenRegistryFacet.sol";
import {IMigration} from "../interfaces/IMigration.sol";
import {IMigrationRegistry} from "../interfaces/IMigrationRegistry.sol";
import {IVault} from "../interfaces/IVault.sol";
import {LibCurve} from "../libs/LibCurve.sol";
import {LibDiamond} from "../libs/LibDiamond.sol";
import {LibHub, HubInfo} from "../libs/LibHub.sol";
import {LibMeta} from "../libs/LibMeta.sol";
import {LibMeToken, MeTokenInfo} from "../libs/LibMeToken.sol";
import {Modifiers} from "../libs/LibAppStorage.sol";

/// @title meTokens Registry Facet
/// @author @cbobrobison, @cartercarlson, @zgorizzo69, @parv3213
/// @notice This contract tracks info about a meToken within meTokens protocol
contract MeTokenRegistryFacet is
    IMeTokenRegistryFacet,
    Modifiers,
    ReentrancyGuard
{
    using SafeERC20 for IERC20;

    constructor() {}

    /// @inheritdoc IMeTokenRegistryFacet
    function subscribe(
        string calldata name,
        string calldata symbol,
        uint256 hubId,
        uint256 assetsDeposited
    ) external override nonReentrant {
        address sender = LibMeta.msgSender();
        require(!isOwner(sender), "msg.sender already owns a meToken");
        HubInfo memory hubInfo = s.hubs[hubId];
        require(hubInfo.active, "Hub inactive");
        require(!hubInfo.updating, "Hub updating");
        if (assetsDeposited > 0) {
            IERC20(hubInfo.asset).safeTransferFrom(
                sender,
                hubInfo.vault,
                assetsDeposited
            );
        }
        // Create meToken erc20 contract
        address meTokenAddr = IMeTokenFactory(s.meTokenFactory).create(
            name,
            symbol,
            address(this)
        );

        // Mint meToken to user
        uint256 meTokensMinted;
        if (assetsDeposited > 0) {
            meTokensMinted = LibCurve.viewMeTokensMinted(
                assetsDeposited, // deposit_amount
                hubId, // hubId
                0, // supply
                0 // balancePooled
            );
            IMeToken(meTokenAddr).mint(sender, meTokensMinted);
        }

        // Register the address which created a meToken
        s.meTokenOwners[sender] = meTokenAddr;

        // Add meToken to registry
        s.meTokens[meTokenAddr].owner = sender;
        s.meTokens[meTokenAddr].hubId = hubId;
        s.meTokens[meTokenAddr].balancePooled = assetsDeposited;

        emit Subscribe(
            meTokenAddr,
            sender,
            meTokensMinted,
            hubInfo.asset,
            assetsDeposited,
            name,
            symbol,
            hubId
        );
    }

    /// @inheritdoc IMeTokenRegistryFacet
    function initResubscribe(
        address meToken,
        uint256 targetHubId,
        address migration,
        bytes memory encodedMigrationArgs
    ) external override {
        MeTokenInfo storage meTokenInfo = s.meTokens[meToken];
        HubInfo memory hubInfo = s.hubs[meTokenInfo.hubId];
        HubInfo memory targetHubInfo = s.hubs[targetHubId];

        require(LibMeta.msgSender() == meTokenInfo.owner, "!owner");
        require(
            block.timestamp >= meTokenInfo.endCooldown,
            "Cooldown not complete"
        );
        require(meTokenInfo.hubId != targetHubId, "same hub");
        require(targetHubInfo.active, "targetHub inactive");
        require(!hubInfo.updating, "hub updating");
        require(!targetHubInfo.updating, "targetHub updating");

        require(migration != address(0), "migration address(0)");

        // Ensure the migration we're using is approved
        require(
            s.migrationRegistry.isApproved(
                hubInfo.vault,
                targetHubInfo.vault,
                migration
            ),
            "!approved"
        );
        require(
            IVault(migration).isValid(meToken, encodedMigrationArgs),
            "Invalid encodedMigrationArgs"
        );
        meTokenInfo.startTime = block.timestamp + s.meTokenWarmup;
        meTokenInfo.endTime =
            block.timestamp +
            s.meTokenWarmup +
            s.meTokenDuration;
        meTokenInfo.endCooldown =
            block.timestamp +
            s.meTokenWarmup +
            s.meTokenDuration +
            s.meTokenCooldown;
        meTokenInfo.targetHubId = targetHubId;
        meTokenInfo.migration = migration;

        IMigration(migration).initMigration(meToken, encodedMigrationArgs);

        emit InitResubscribe(
            meToken,
            targetHubId,
            migration,
            encodedMigrationArgs
        );
    }

    /// @inheritdoc IMeTokenRegistryFacet
    function cancelResubscribe(address meToken) external override {
        MeTokenInfo storage meTokenInfo = s.meTokens[meToken];
        require(LibMeta.msgSender() == meTokenInfo.owner, "!owner");
        require(meTokenInfo.targetHubId != 0, "!resubscribing");
        // TODO: validiate !IMigration(meTokenInfo.migration).migrationStarted(meToken)
        // and do this interface for sameAssetMigration
        require(
            IMigration(meTokenInfo.migration).canCancelResubscribe(meToken),
            "cannot cancel resubscribe"
        );

        meTokenInfo.startTime = 0;
        meTokenInfo.endTime = 0;
        meTokenInfo.targetHubId = 0;
        meTokenInfo.migration = address(0);

        emit CancelResubscribe(meToken);
    }

    /// @inheritdoc IMeTokenRegistryFacet
    function finishResubscribe(address meToken)
        external
        override
        returns (MeTokenInfo memory)
    {
        return LibMeToken.finishResubscribe(meToken);
    }

    /// @inheritdoc IMeTokenRegistryFacet
    function updateBalances(address meToken, uint256 newBalance)
        external
        override
    {
        MeTokenInfo storage meTokenInfo = s.meTokens[meToken];

        require(LibMeta.msgSender() == meTokenInfo.migration, "!migration");
        uint256 balancePooled = meTokenInfo.balancePooled;
        uint256 balanceLocked = meTokenInfo.balanceLocked;
        uint256 oldBalance = balancePooled + balanceLocked;
        uint256 p = s.PRECISION;

        meTokenInfo.balancePooled =
            (balancePooled * p * newBalance) /
            (oldBalance * p);
        meTokenInfo.balanceLocked =
            (balanceLocked * p * newBalance) /
            (oldBalance * p);

        emit UpdateBalances(meToken, newBalance);
    }

    /// @inheritdoc IMeTokenRegistryFacet
    function transferMeTokenOwnership(address newOwner) external override {
        address sender = LibMeta.msgSender();
        require(
            s.pendingMeTokenOwners[sender] == address(0),
            "transfer ownership already pending"
        );
        require(!isOwner(newOwner), "_newOwner already owns a meToken");
        require(newOwner != address(0), "Cannot transfer to 0 address");
        address meToken = s.meTokenOwners[sender];
        require(meToken != address(0), "meToken does not exist");
        s.pendingMeTokenOwners[sender] = newOwner;

        emit TransferMeTokenOwnership(sender, newOwner, meToken);
    }

    /// @inheritdoc IMeTokenRegistryFacet
    function cancelTransferMeTokenOwnership() external override {
        address sender = LibMeta.msgSender();
        address meToken = s.meTokenOwners[sender];
        require(meToken != address(0), "meToken does not exist");

        require(
            s.pendingMeTokenOwners[sender] != address(0),
            "transferMeTokenOwnership() not initiated"
        );

        delete s.pendingMeTokenOwners[sender];
        emit CancelTransferMeTokenOwnership(sender, meToken);
    }

    /// @inheritdoc IMeTokenRegistryFacet
    function claimMeTokenOwnership(address oldOwner) external override {
        address sender = LibMeta.msgSender();
        require(!isOwner(sender), "Already owns a meToken");
        require(sender == s.pendingMeTokenOwners[oldOwner], "!_pendingOwner");

        address meToken = s.meTokenOwners[oldOwner];

        s.meTokens[meToken].owner = sender;
        s.meTokenOwners[sender] = meToken;

        delete s.meTokenOwners[oldOwner];
        delete s.pendingMeTokenOwners[oldOwner];

        emit ClaimMeTokenOwnership(oldOwner, sender, meToken);
    }

    /// @inheritdoc IMeTokenRegistryFacet
    function setMeTokenWarmup(uint256 warmup) external onlyDurationsController {
        require(warmup != s.meTokenWarmup, "same warmup");
        require(warmup + s.meTokenDuration < s.hubWarmup, "too long");
        s.meTokenWarmup = warmup;
    }

    /// @inheritdoc IMeTokenRegistryFacet
    function setMeTokenDuration(uint256 duration)
        external
        onlyDurationsController
    {
        require(duration != s.meTokenDuration, "same duration");
        require(s.meTokenWarmup + duration < s.hubWarmup, "too long");
        s.meTokenDuration = duration;
    }

    /// @inheritdoc IMeTokenRegistryFacet
    function setMeTokenCooldown(uint256 cooldown)
        external
        onlyDurationsController
    {
        require(cooldown != s.meTokenCooldown, "same cooldown");
        s.meTokenCooldown = cooldown;
    }

    /// @inheritdoc IMeTokenRegistryFacet
    function getMeTokenInfo(address meToken)
        external
        view
        override
        returns (MeTokenInfo memory)
    {
        return LibMeToken.getMeTokenInfo(meToken);
    }

    /// @inheritdoc IMeTokenRegistryFacet
    function getOwnerMeToken(address owner)
        external
        view
        override
        returns (address)
    {
        return s.meTokenOwners[owner];
    }

    /// @inheritdoc IMeTokenRegistryFacet
    function getPendingOwner(address oldOwner)
        external
        view
        override
        returns (address)
    {
        return s.pendingMeTokenOwners[oldOwner];
    }

    /// @inheritdoc IMeTokenRegistryFacet
    function meTokenWarmup() external view returns (uint256) {
        return LibMeToken.warmup();
    }

    /// @inheritdoc IMeTokenRegistryFacet
    function meTokenDuration() external view returns (uint256) {
        return LibMeToken.duration();
    }

    /// @inheritdoc IMeTokenRegistryFacet
    function meTokenCooldown() external view returns (uint256) {
        return LibMeToken.cooldown();
    }

    /// @inheritdoc IMeTokenRegistryFacet
    function isOwner(address owner) public view override returns (bool) {
        return s.meTokenOwners[owner] != address(0);
    }
}
