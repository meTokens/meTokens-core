// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./Vault.sol";
import "../interfaces/ISingleAssetVault.sol";

/// @title Vault
/// @author Carl Farterson (@carlfarterson)
/// @notice Implementation contract for SingleAssetFactory.sol
contract SingleAssetVault is Ownable, Vault, ISingleAssetVault {
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
        Details.MeToken memory meToken_ = meTokenRegistry.getDetails(_meToken);
        Details.Hub memory hub_ = hub.getDetails(meToken_.hubId);

        require(
            msg.sender == address(hub) ||
                // TODO: Ensure meToken can actually start migrating from the migration addr
                // and properly check these arguments
                migrationRegistry.isApproved(
                    address(this),
                    address(this),
                    meToken_.migration
                ),
            "!hub || !migrationRegistry.approved"
        );
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
    function isValid(address _asset, bytes memory _encodedArgs)
        public
        pure
        override
        returns (bool)
    {
        if (_asset == address(0)) {
            return false;
        }
        return true;
    }
}
