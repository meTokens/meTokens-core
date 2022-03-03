// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Vault} from "../vaults/Vault.sol";
import {ISingleAssetVault} from "../interfaces/ISingleAssetVault.sol";
import {IHubFacet} from "../interfaces/IHubFacet.sol";
import {IMeTokenRegistryFacet} from "../interfaces/IMeTokenRegistryFacet.sol";
import {IMigration} from "../interfaces/IMigration.sol";
import {MeTokenInfo} from "../libs/LibMeToken.sol";
import {HubInfo} from "../libs/LibHub.sol";

import {ISwapRouter} from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Vault} from "../vaults/Vault.sol";
import {IMigration} from "../interfaces/IMigration.sol";
import {ISingleAssetVault} from "../interfaces/ISingleAssetVault.sol";
import {MeTokenInfo} from "../libs/LibMeToken.sol";
import {HubInfo} from "../libs/LibHub.sol";

/// @title Same asset vault migrator
/// @author Parv Garg (@parv3213), Carter Carlson (@cartercarlson)
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

    constructor(address _dao, address _diamond) Vault(_dao, _diamond) {}

    /// @inheritdoc IMigration
    function initMigration(
        address meToken,
        bytes memory /* encodedArgs */
    ) external override {
        require(msg.sender == diamond, "!diamond");

        MeTokenInfo memory meTokenInfo = IMeTokenRegistryFacet(diamond)
            .getMeTokenInfo(meToken);
        HubInfo memory hubInfo = IHubFacet(diamond).getHubInfo(
            meTokenInfo.hubId
        );
        HubInfo memory targetHubInfo = IHubFacet(diamond).getHubInfo(
            meTokenInfo.targetHubId
        );

        require(hubInfo.asset == targetHubInfo.asset, "asset different");

        _sameAssetMigration[meToken].isMigrating = true;
    }

    /// @inheritdoc IMigration
    function poke(address meToken) external override nonReentrant {
        SameAssetMigration storage usts = _sameAssetMigration[meToken];
        MeTokenInfo memory meTokenInfo = IMeTokenRegistryFacet(diamond)
            .getMeTokenInfo(meToken);
        HubInfo memory hubInfo = IHubFacet(diamond).getHubInfo(
            meTokenInfo.hubId
        );
        if (usts.isMigrating && !usts.started) {
            ISingleAssetVault(hubInfo.vault).startMigration(meToken);
            usts.started = true;
        }
    }

    /// @inheritdoc IMigration
    function finishMigration(address meToken)
        external
        override
        nonReentrant
        returns (uint256 amountOut)
    {
        require(msg.sender == diamond, "!diamond");
        SameAssetMigration storage usts = _sameAssetMigration[meToken];
        require(usts.isMigrating, "!migrating");

        MeTokenInfo memory meTokenInfo = IMeTokenRegistryFacet(diamond)
            .getMeTokenInfo(meToken);
        HubInfo memory hubInfo = IHubFacet(diamond).getHubInfo(
            meTokenInfo.hubId
        );
        HubInfo memory targetHubInfo = IHubFacet(diamond).getHubInfo(
            meTokenInfo.targetHubId
        );

        if (!usts.started) {
            ISingleAssetVault(hubInfo.vault).startMigration(meToken);
            usts.started = true;
        }
        amountOut = meTokenInfo.balancePooled + meTokenInfo.balanceLocked;

        // Send asset to new vault only if there's a migration vault
        IERC20(targetHubInfo.asset).transfer(targetHubInfo.vault, amountOut);

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
    /// @inheritdoc Vault
    function isValid(
        address meToken,
        bytes memory /* encodedArgs */
    ) external view override returns (bool) {
        MeTokenInfo memory meTokenInfo = IMeTokenRegistryFacet(diamond)
            .getMeTokenInfo(meToken);
        // MeToken not subscribed to a hub
        if (meTokenInfo.hubId == 0) return false;
        return true;
    }
}
