// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Vault} from "./Vault.sol";
import {ISingleAssetVault} from "../interfaces/ISingleAssetVault.sol";
import {IMeTokenRegistry} from "../interfaces/IMeTokenRegistry.sol";
import {IHub} from "../interfaces/IHub.sol";
import {MeTokenInfo} from "../libs/LibMeToken.sol";
import {HubInfo} from "../libs/LibHub.sol";

/// @title Vault
/// @author Carl Farterson (@carlfarterson), Parv Garg (@parv3213), @zgorizzo69
/// @notice Implementation contract for SingleAssetFactory.sol
contract SingleAssetVault is Vault, ISingleAssetVault {
    using SafeERC20 for IERC20;

    constructor(address _dao, address _diamond) Vault(_dao, _diamond) {}

    // After warmup period, if there's a migration vault,
    // Send meTokens' collateral to the migration
    function startMigration(address _meToken) external override {
        MeTokenInfo memory meToken_ = IMeTokenRegistry(diamond)
            .getMeTokenDetails(_meToken);
        HubInfo memory hub_ = IHub(diamond).getHubDetails(meToken_.hubId);

        require(msg.sender == (meToken_.migration), "!migration");
        uint256 balance = meToken_.balancePooled + meToken_.balanceLocked;

        if (
            meToken_.migration != address(0) &&
            address(this) != meToken_.migration
        ) {
            IERC20(hub_.asset).safeTransfer(meToken_.migration, balance);
        }
        emit StartMigration(_meToken);
    }

    // solhint-disable-next-line
    function isValid(
        address _asset,
        bytes memory /*_encodedArgs */
    ) public pure override returns (bool) {
        if (_asset == address(0)) {
            return false;
        }
        return true;
    }
}
