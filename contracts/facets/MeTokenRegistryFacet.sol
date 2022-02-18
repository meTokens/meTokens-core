// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {LibDiamond} from "../libs/LibDiamond.sol";
import {LibHub, HubInfo} from "../libs/LibHub.sol";
import {LibMeToken, MeTokenInfo} from "../libs/LibMeToken.sol";
import {MeToken} from "../MeToken.sol";
import {IMigration} from "../interfaces/IMigration.sol";
import {IMigrationRegistry} from "../interfaces/IMigrationRegistry.sol";
import {IMeTokenRegistry} from "../interfaces/IMeTokenRegistry.sol";
import {IMeTokenFactory} from "../interfaces/IMeTokenFactory.sol";
import {IHub} from "../interfaces/IHub.sol";
import {IVault} from "../interfaces/IVault.sol";
import {ICurve} from "../interfaces/ICurve.sol";
import {IMeToken} from "../interfaces/IMeToken.sol";
import {HubInfo, MeTokenInfo, Modifiers} from "../libs/Details.sol";

/// @title meToken registry
/// @author Carl Farterson (@carlfarterson)
/// @notice This contract tracks basic information about all meTokens
contract MeTokenRegistryFacet is Modifiers, ReentrancyGuard {
    event Subscribe(
        address indexed meToken,
        address indexed owner,
        uint256 minted,
        address asset,
        uint256 assetsDeposited,
        string name,
        string symbol,
        uint256 hubId
    );
    event InitResubscribe(
        address indexed meToken,
        uint256 targetHubId,
        address migration,
        bytes encodedMigrationArgs
    );
    event CancelResubscribe(address indexed meToken);
    event FinishResubscribe(address indexed meToken);
    event UpdateBalances(address meToken, uint256 newBalance);
    event TransferMeTokenOwnership(address from, address to, address meToken);
    event CancelTransferMeTokenOwnership(address from, address meToken);
    event ClaimMeTokenOwnership(address from, address to, address meToken);
    event UpdateBalancePooled(bool add, address meToken, uint256 amount);
    event UpdateBalanceLocked(bool add, address meToken, uint256 amount);

    constructor() {}

    function subscribe(
        string calldata name,
        string calldata symbol,
        uint256 hubId,
        uint256 assetsDeposited
    ) external nonReentrant {
        address sender = LibMeta.msgSender();
        require(!isOwner(sender), "msg.sender already owns a meToken");
        HubInfo memory hub = s.hubs[hubId];
        require(hub.active, "Hub inactive");
        require(!hub.updating, "Hub updating");

        if (assetsDeposited > 0) {
            require(
                IERC20(hub.asset).transferFrom(
                    sender,
                    hub.vault,
                    assetsDeposited
                ),
                "transfer failed"
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
            meTokensMinted = ICurve(hub.curve).viewMeTokensMinted(
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
            hub.asset,
            assetsDeposited,
            name,
            symbol,
            hubId
        );
    }

    function initResubscribe(
        address meToken,
        uint256 targetHubId,
        address migration,
        bytes memory encodedMigrationArgs
    ) external {
        address sender = LibMeta.msgSender();
        MeTokenInfo storage info = s.meTokens[meToken];
        HubInfo memory hub = s.hubs[info.hubId];
        HubInfo memory targetHub = s.hubs[targetHubId];

        require(sender == info.owner, "!owner");
        require(block.timestamp >= info.endCooldown, "Cooldown not complete");
        require(info.hubId != targetHubId, "same hub");
        require(targetHub.active, "targetHub inactive");
        require(!hub.updating, "hub updating");
        require(!targetHub.updating, "targetHub updating");

        require(migration != address(0), "migration address(0)");

        // Ensure the migration we're using is approved
        require(
            s.migrationRegistry.isApproved(
                hub.vault,
                targetHub.vault,
                migration
            ),
            "!approved"
        );
        require(
            IVault(migration).isValid(meToken, encodedMigrationArgs),
            "Invalid encodedMigrationArgs"
        );
        info.startTime = block.timestamp + s.meTokenWarmup;
        info.endTime = block.timestamp + s.meTokenWarmup + s.meTokenDuration;
        info.endCooldown =
            block.timestamp +
            s.meTokenWarmup +
            s.meTokenDuration +
            s.meTokenCooldown;
        info.targetHubId = targetHubId;
        info.migration = migration;

        IMigration(migration).initMigration(meToken, encodedMigrationArgs);

        emit InitResubscribe(
            meToken,
            targetHubId,
            migration,
            encodedMigrationArgs
        );
    }

    function finishResubscribe(address meToken)
        external
        returns (MeTokenInfo memory)
    {
        return LibMeToken.finishResubscribe(meToken);
    }

    function cancelResubscribe(address meToken) external {
        address sender = LibMeta.msgSender();
        MeTokenInfo storage info = s.meTokens[meToken];
        require(sender == info.owner, "!owner");
        require(info.targetHubId != 0, "!resubscribing");
        require(block.timestamp < info.startTime, "Resubscription has started");

        info.startTime = 0;
        info.endTime = 0;
        info.targetHubId = 0;
        info.migration = address(0);

        emit CancelResubscribe(meToken);
    }

    function updateBalances(address meToken, uint256 newBalance) external {
        MeTokenInfo storage info = s.meTokens[meToken];
        address sender = LibMeta.msgSender();
        require(sender == info.migration, "!migration");
        uint256 balancePooled = info.balancePooled;
        uint256 balanceLocked = info.balanceLocked;
        uint256 oldBalance = balancePooled + balanceLocked;
        uint256 p = s.PRECISION;

        info.balancePooled =
            (balancePooled * p * newBalance) /
            (oldBalance * p);
        info.balanceLocked =
            (balanceLocked * p * newBalance) /
            (oldBalance * p);

        emit UpdateBalances(meToken, newBalance);
    }

    function transferMeTokenOwnership(address newOwner) external {
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

    function cancelTransferMeTokenOwnership() external {
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

    function claimMeTokenOwnership(address oldOwner) external {
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

    function setMeTokenWarmup(uint256 warmup) external onlyDurationsController {
        require(warmup != s.meTokenWarmup, "same warmup");
        require(warmup + s.meTokenDuration < s.hubWarmup, "too long");
        s.meTokenWarmup = warmup;
    }

    function setMeTokenDuration(uint256 duration)
        external
        onlyDurationsController
    {
        require(duration != s.meTokenDuration, "same duration");
        require(s.meTokenWarmup + duration < s.hubWarmup, "too long");
        s.meTokenDuration = duration;
    }

    function setMeTokenCooldown(uint256 cooldown)
        external
        onlyDurationsController
    {
        require(cooldown != s.meTokenCooldown, "same cooldown");
        s.meTokenCooldown = cooldown;
    }

    function meTokenWarmup() external view returns (uint256) {
        return LibMeToken.warmup();
    }

    function meTokenDuration() external view returns (uint256) {
        return LibMeToken.duration();
    }

    function meTokenCooldown() external view returns (uint256) {
        return LibMeToken.cooldown();
    }

    function getOwnerMeToken(address owner) external view returns (address) {
        return s.meTokenOwners[owner];
    }

    function getPendingOwner(address oldOwner) external view returns (address) {
        return s.pendingMeTokenOwners[oldOwner];
    }

    function getMeTokenDetails(address meToken)
        external
        view
        returns (MeTokenInfo memory)
    {
        return LibMeToken.getMeToken(meToken);
    }

    function isOwner(address owner) public view returns (bool) {
        return s.meTokenOwners[owner] != address(0);
    }
}
