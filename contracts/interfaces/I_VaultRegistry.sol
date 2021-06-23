// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface I_VaultRegistry {

    /// @notice add a vault to the vault registry
    /// @param _name name of new vault
    /// @param _vault address of new vault
    /// @param _factory address of vault factory used to create the vault
    function registerVault(
        string calldata _name,
        address _vault,
        address _factory) external;
    
    /// @notice TODO
    /// @param _factory TODO
    function approveVaultFactory(address _factory) external;

    /// @notice TODO
    /// @param _vault TODO    
    function deactivateVault(address _vault) external;

    /// @notice TODO
    /// @param _factory TODO
    function unapproveVaultFactory(address _factory) external;

    /// @notice TODO
    /// @param _vault TODO
    /// @return TODO
    function isActiveVault(address _vault) external view returns (bool);


    /// @notice TODO
    /// @param _factory TODO
    /// @return TODO
    function isApprovedVaultFactory(address _factory) external view returns (bool);

    /// @notice TODO
    /// @param TODO
    /// @return TODO
    /// @return TODO
    /// @return TODO
    function getDetails(address vault) external view returns (
        string memory name,
        address factory,
        bool active
    );
}