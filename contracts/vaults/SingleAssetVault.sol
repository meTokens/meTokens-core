// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Vault} from "./Vault.sol";
import {ISingleAssetVault} from "../interfaces/ISingleAssetVault.sol";
import {IMeTokenRegistry} from "../interfaces/IMeTokenRegistry.sol";
import {IHub} from "../interfaces/IHub.sol";
import {IMigrationRegistry} from "../interfaces/IMigrationRegistry.sol";
import {MeTokenInfo} from "../libs/LibMeToken.sol";
import {HubInfo} from "../libs/LibHub.sol";

/// @title Vault
/// @author Carter Carlson (@cartercarlson), Parv Garg (@parv3213), @zgorizzo69
/// @notice Implementation contract for SingleAssetFactory.sol
contract SingleAssetVault is Vault, ISingleAssetVault {
    using SafeERC20 for IERC20;

    constructor(address _dao, address _diamond) Vault(_dao, _diamond) {}

    // After warmup period, if there's a migration vault,
    // Send meTokens' collateral to the migration
    /// @dev not adding reentrancy guard as no state changes after external call
    function startMigration(address meToken) external override {
        MeTokenInfo memory meTokenInfo = IMeTokenRegistry(diamond)
            .getMeTokenDetails(meToken);
        HubInfo memory hubInfo = IHub(diamond).getHubDetails(meTokenInfo.hubId);

        require(msg.sender == (meTokenInfo.migration), "!migration");
        uint256 balance = meTokenInfo.balancePooled + meTokenInfo.balanceLocked;

        if (
            meTokenInfo.migration != address(0) &&
            address(this) != meTokenInfo.migration
        ) {
            IERC20(hubInfo.asset).safeTransfer(meTokenInfo.migration, balance);
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
