// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IHubFacet} from "../interfaces/IHubFacet.sol";
import {IMeTokenRegistryFacet} from "../interfaces/IMeTokenRegistryFacet.sol";
import {IMigration} from "../interfaces/IMigration.sol";
import {ISingleAssetVault} from "../interfaces/ISingleAssetVault.sol";
import {ISwapRouter} from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import {HubInfo} from "../libs/LibHub.sol";
import {MeTokenInfo} from "../libs/LibMeToken.sol";
import {Vault} from "../vaults/Vault.sol";

/// @title Same asset vault migrator
/// @author Parv Garg (@parv3213), Carter Carlson (@cartercarlson)
/// @notice create a vault to hold an asset if a meToken is resubscribing
///         to a different hub with the same asset
contract SameAssetTransferMigration is ReentrancyGuard, Vault, IMigration {
    using SafeERC20 for IERC20;

    struct SameAssetMigration {
        // if migration is active
        bool isMigrating;
        // if startMigration() has been triggered
        bool started;
    }

    mapping(address => SameAssetMigration) private _sameAssetMigration;

    modifier onlyDiamond() {
        require(msg.sender == diamond, "!diamond");
        _;
    }

    constructor(address _dao, address _diamond) Vault(_dao, _diamond) {}

    /// @inheritdoc IMigration
    function initMigration(
        address meToken,
        bytes memory /* encodedArgs */
    ) external override onlyDiamond {
        MeTokenInfo memory meTokenInfo = IMeTokenRegistryFacet(diamond)
            .getMeTokenInfo(meToken);

        require(
            IHubFacet(diamond).getHubInfo(meTokenInfo.hubId).asset ==
                IHubFacet(diamond).getHubInfo(meTokenInfo.targetHubId).asset,
            "same asset"
        );

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
        if (
            usts.isMigrating && // this is to ensure the meToken is resubscribing
            block.timestamp > meTokenInfo.startTime && // swap can only happen after resubscribe
            !usts.started // should skip if already started
        ) {
            ISingleAssetVault(hubInfo.vault).startMigration(meToken);
            usts.started = true;
        }
    }

    /// @inheritdoc IMigration
    function finishMigration(address meToken)
        external
        override
        nonReentrant
        onlyDiamond
    {
        MeTokenInfo memory meTokenInfo = IMeTokenRegistryFacet(diamond)
            .getMeTokenInfo(meToken);
        HubInfo memory targetHubInfo = IHubFacet(diamond).getHubInfo(
            meTokenInfo.targetHubId
        );

        if (!_sameAssetMigration[meToken].started) {
            ISingleAssetVault(
                IHubFacet(diamond).getHubInfo(meTokenInfo.hubId).vault
            ).startMigration(meToken);
        }
        uint256 amountOut = meTokenInfo.balancePooled +
            meTokenInfo.balanceLocked;

        // Send asset to new vault only if there's a migration vault
        IERC20(targetHubInfo.asset).safeTransfer(
            targetHubInfo.vault,
            amountOut
        );

        // reset mappings
        delete _sameAssetMigration[meToken];
    }

    /// @inheritdoc IMigration
    function isStarted(address meToken) external view override returns (bool) {
        return _sameAssetMigration[meToken].started;
    }

    function getDetails(address meToken)
        external
        view
        returns (SameAssetMigration memory usts)
    {
        usts = _sameAssetMigration[meToken];
    }

    /// @inheritdoc Vault
    function isValid(
        bytes memory /* encodedArgs */
    ) external view override returns (bool) {
        return true;
    }

    /// @inheritdoc IMigration
    function migrationStarted(address meToken)
        external
        view
        override
        returns (bool started)
    {
        return _sameAssetMigration[meToken].started;
    }

    function canCancelResubscribe(address meToken)
        external
        view
        override
        returns (bool)
    {
        return !_sameAssetMigration[meToken].started;
    }
}
