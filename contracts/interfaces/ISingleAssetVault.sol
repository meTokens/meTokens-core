// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

/// @title Vanilla erc20 vault interface
/// @author Carl Farterson (@carlfarterson)
interface ISingleAssetVault {
    /// @notice Event of starting a meTokens' migration to a new vault
    /// @param _meToken address of meToken
    event StartMigration(address _meToken);

    /// @notice Start a meTokens' migration to a new vault
    /// @param _meToken address of meToken
    function startMigration(address _meToken) external;
}
