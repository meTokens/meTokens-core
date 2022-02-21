// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Vault} from "./Vault.sol";
import {ISingleAssetVault} from "../interfaces/ISingleAssetVault.sol";
import {IHub} from "../interfaces/IHub.sol";
import {IMeTokenRegistry} from "../interfaces/IMeTokenRegistry.sol";
import {IMigrationRegistry} from "../interfaces/IMigrationRegistry.sol";
import {MeTokenInfo} from "../libs/LibMeToken.sol";
import {HubInfo} from "../libs/LibHub.sol";

/// @title Vault
/// @author Carl Farterson (@carlfarterson), Parv Garg (@parv3213), @zgorizzo69
/// @notice Implementation contract for SingleAssetFactory.sol
contract SingleAssetVault is Vault, ISingleAssetVault {
    using SafeERC20 for IERC20;

    constructor(
        address dao,
        address foundry,
        IHub hub,
        IMeTokenRegistry meTokenRegistry,
        IMigrationRegistry migrationRegistry
    ) Vault(dao, foundry, hub, meTokenRegistry, migrationRegistry) {}

    // After warmup period, if there's a migration vault,
    // Send meTokens' collateral to the migration
    function startMigration(address meToken) external override {
        MeTokenInfo memory info = meTokenRegistry.getMeTokenDetails(meToken);
        HubInfo memory hubInfo = hub.getHubDetails(info.hubId);

        require(msg.sender == (info.migration), "!migration");
        uint256 balance = info.balancePooled + info.balanceLocked;

        if (info.migration != address(0) && address(this) != info.migration) {
            IERC20(hubInfo.asset).safeTransfer(info.migration, balance);
        }
        emit StartMigration(meToken);
    }

    // solhint-disable-next-line
    function isValid(
        address asset,
        bytes memory /*encodedArgs */
    ) public pure override returns (bool) {
        if (asset == address(0)) {
            return false;
        }
        return true;
    }
}
