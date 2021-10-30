// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

import "../interfaces/IERC20.sol";
import "./Vault.sol";
import "../interfaces/ISingleAssetVault.sol";

/// @title Vault
/// @author Carl Farterson (@carlfarterson)
/// @notice Implementation contract for SingleAssetFactory.sol
contract SingleAssetVault is Ownable, Vault, ISingleAssetVault {
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
        require(msg.sender == address(hub), "!hub");
        Details.MeToken memory meToken_ = meTokenRegistry.getDetails(_meToken);
        Details.Hub memory hub_ = hub.getDetails(meToken_.hubId);
        uint256 balance = meToken_.balancePooled + meToken_.balanceLocked;

        if (
            meToken_.migration != address(0) &&
            address(this) != meToken_.migration
        ) {
            IERC20(hub_.asset).transfer(meToken_.migration, balance);
        }
    }

    // solhint-disable-next-line
    function isValid(address _asset, bytes memory _encodedArgs)
        public
        pure
        override
        returns (bool)
    {
        return true;
    }
}
