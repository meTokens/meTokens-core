// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IVaultFactory {

    event Create(address vault);

    /// @notice function to create and register a new vault to the vault registry
    /// @param _token address of vault collateral asset
    /// @param _encodedAdditionalArgs Additional arguments passed to create a vault
    /// @return address of new vault
    function create(
        address _token,
        bytes memory _encodedAdditionalArgs) external returns (address);
}