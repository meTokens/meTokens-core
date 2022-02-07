// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "./Vault.sol";
import "../interfaces/ISingleAssetVault.sol";

/// @title Vault
/// @author Carl Farterson (@carlfarterson), Parv Garg (@parv3213), @zgorizzo69
/// @notice Implementation contract for SingleAssetFactory.sol
contract SingleAssetVault is Vault, ISingleAssetVault {
    using SafeERC20 for IERC20;

    constructor(
        address _dao,
        address _foundry,
        IHub _hub,
        IMeTokenRegistry _meTokenRegistry,
        IMigrationRegistry _migrationRegistry
    ) Vault(_dao, _foundry, _hub, _meTokenRegistry, _migrationRegistry) {}

    // After warmup period, if there's a migration vault,
    // Send meTokens' collateral to the migration
    function startMigration(address _meToken) external override {
        MeTokenInfo memory meToken_ = meTokenRegistry.getMeTokenDetails(
            _meToken
        );
        HubInfo memory hub_ = hub.getHubDetails(meToken_.hubId);

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
