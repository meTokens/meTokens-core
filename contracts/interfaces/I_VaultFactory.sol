// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface I_VaultFactory {

    /// @notice function to create and register a new vault to the vault registry
    /// @param _name name of vault
    /// @param _owner owner of vault
    /// @param _collateralAsset address of vault collateral asset
    /// @param _encodedVaultAdditionalArgs Additional arguments passed to create a vault
    /// @return address of new vault
    function createVault(
        string calldata _name,
        address _owner,
        address _collateralAsset,
        bytes calldata _encodedVaultAdditionalArgs) external returns (address);
}