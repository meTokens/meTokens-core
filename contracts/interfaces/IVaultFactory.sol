// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IVaultFactory {
    event Create(address vault);

    /// @notice function to create and register a new vault to the vault registry
    /// @param _encodedArgs Additional arguments passed to create a vault
    /// @return address of new vault
    function create(bytes memory _encodedArgs) external returns (address);
}
