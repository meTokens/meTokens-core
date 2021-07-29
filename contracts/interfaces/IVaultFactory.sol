// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IVaultFactory {

    /// @notice function to create and register a new vault to the vault registry
    /// @param _name name of vault
    /// @param _collateralAsset address of vault collateral asset
    /// @param _encodedAdditionalArgs Additional arguments passed to create a vault
    /// @return address of new vault
    function create(
        string calldata _name,
        address _collateralAsset,
        bytes memory _encodedAdditionalArgs) external returns (address);
}