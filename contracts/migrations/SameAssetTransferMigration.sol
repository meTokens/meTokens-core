// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../libs/Details.sol";
import "../vaults/Vault.sol";
import "../interfaces/IMigration.sol";
import "../interfaces/ISingleAssetVault.sol";

import {ISwapRouter} from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Vault} from "../vaults/Vault.sol";
import {IMigration} from "../interfaces/IMigration.sol";
import {ISingleAssetVault} from "../interfaces/ISingleAssetVault.sol";
import {MeTokenInfo} from "../libs/LibMeToken.sol";
import {HubInfo} from "../libs/LibHub.sol";

/// @title Same asset vault migrator
/// @author Carl Farterson (@carlfarterson)
/// @notice create a vault to hold an asset if a meToken is resubscribing
///         to a different hub with the same asset
contract SameAssetTransferMigration is ReentrancyGuard, Vault, IMigration {
    struct SameAssetMigration {
        // if migration is active
        bool isMigrating;
        // if startMigration() has been triggered
        bool started;
    }

    mapping(address => SameAssetMigration) private _sameAssetMigration;

    constructor(
        address dao,
        address foundry,
        IHub hub,
        IMeTokenRegistry meTokenRegistry,
        IMigrationRegistry migrationRegistry
    ) Vault(dao, foundry, hub, meTokenRegistry, migrationRegistry) {}

    function initMigration(
        address meToken,
        bytes memory /* encodedArgs */
    ) external override {
        require(msg.sender == address(meTokenRegistry), "!meTokenRegistry");

        MeTokenInfo memory info = meTokenRegistry.getMeTokenDetails(meToken);
        HubInfo memory hubInfo = hub.getHubDetails(info.hubId);
        HubInfo memory targetHub = hub.getHubDetails(info.targetHubId);

        require(hubInfo.asset == targetHub.asset, "asset different");

        _sameAssetMigration[meToken].isMigrating = true;
    }

    function poke(address meToken) external override nonReentrant {
        SameAssetMigration storage usts = _sameAssetMigration[meToken];
        MeTokenInfo memory info = meTokenRegistry.getMeTokenDetails(meToken);
        HubInfo memory hubInfo = hub.getHubDetails(info.hubId);
        if (usts.isMigrating && !usts.started) {
            ISingleAssetVault(hubInfo.vault).startMigration(meToken);
            usts.started = true;
        }
    }

    function finishMigration(address meToken)
        external
        override
        nonReentrant
        returns (uint256 amountOut)
    {
        require(msg.sender == address(meTokenRegistry), "!meTokenRegistry");
        SameAssetMigration storage usts = _sameAssetMigration[meToken];
        require(usts.isMigrating, "!migrating");

        MeTokenInfo memory info = meTokenRegistry.getMeTokenDetails(meToken);
        HubInfo memory hubInfo = hub.getHubDetails(info.hubId);
        HubInfo memory targetHub = hub.getHubDetails(info.targetHubId);

        if (!usts.started) {
            ISingleAssetVault(hubInfo.vault).startMigration(meToken);
            usts.started = true;
        }
        amountOut = info.balancePooled + info.balanceLocked;

        // Send asset to new vault only if there's a migration vault
        IERC20(targetHub.asset).transfer(targetHub.vault, amountOut);

        // reset mappings
        delete _sameAssetMigration[meToken];
    }

    function getDetails(address meToken)
        external
        view
        returns (SameAssetMigration memory usts)
    {
        usts = _sameAssetMigration[meToken];
    }

    // Kicks off meToken warmup period
    function isValid(
        address meToken,
        bytes memory /* encodedArgs */
    ) external view override returns (bool) {
        MeTokenInfo memory info = meTokenRegistry.getMeTokenDetails(meToken);
        // MeToken not subscribed to a hub
        if (info.hubId == 0) return false;
        return true;
    }
}
