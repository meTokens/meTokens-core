// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../interfaces/I_VaultRegistry.sol";


/// @title vault registry
/// @author Carl Farterson (@carlfarterson)
/// @notice Keeps track of all active vaults and available vault factories 
contract VaultRegistry is I_VaultRegistry {

    event RegisterVault(string name, address vault, address factory);
    event DeactivateVault(address vault);
    event ApproveVaultFactory(address factory);
    event UnapproveVaultFactory(address factory);

    mapping (address => VaultDetails) private vaults;
    // NOTE: approved vault factories could be for
    // Vanilla erc20 vaults, Uniswap-LP vaults, Balancer LP  vaults, etc.
	mapping (address => bool) private approvedVaultFactories;

    struct VaultDetails {
        string name;
        address factory; // NOTE: references factories/VaultFactories/{}.sol
        bool active;  // NOTE: can be inactive after vault migration
    }

    /// @inheritdoc I_VaultRegistry
    function registerVault(
        string calldata _name,
        address _vault,
        address _factory
    ) external override {
        require(approvedVaultFactories[msg.sender], "Only vault factories can register vaults");
        // Add vault details to storage
        VaultDetails memory vaultDetails = VaultDetails(_name, _factory, true);
        vaults[_vault] = vaultDetails;

        emit RegisterVault(_name, _vault, _factory);
    }

    /// @inheritdoc I_VaultRegistry
    function approveVaultFactory(address _factory) external override {
        // TODO: access control
        require(!approvedVaultFactories[_factory], "Factory already approved");
        approvedVaultFactories[_factory] = true;
        emit ApproveVaultFactory(_factory);
    }


    /// @inheritdoc I_VaultRegistry
    function deactivateVault(address _vault) external override {
        // TODO: access control
        VaultDetails storage vaultDetails = vaults[_vault];
        require(vaultDetails.active != false, "Vault not active");
        vaultDetails.active = false;
    }

    /// @inheritdoc I_VaultRegistry
    function unapproveVaultFactory(address _factory) external override {
        // TODO: access control
        require(approvedVaultFactories[_factory], "Factory not approved");
        approvedVaultFactories[_factory] = false;
        emit UnapproveVaultFactory(_factory);
    }

    // TODO: are reactivate funcs needed?
    // function reactivateVault(uint256 vaultId) public {}


    /// @inheritdoc I_VaultRegistry
    function isActiveVault(address _vault) external view override returns (bool) {
        // TODO: import VaultDetails struct
        VaultDetails memory vaultDetails = vaults[_vault];
        return vaultDetails.active;
    }


    /// @inheritdoc I_VaultRegistry
    function isApprovedVaultFactory(address _factory) external view override returns (bool) {
        return approvedVaultFactories[_factory];
    }

    
    /// @inheritdoc I_VaultRegistry
    function getDetails(address vault) external view override returns (
        string memory name,
        address factory,
        bool active
    ) {
        VaultDetails memory vaultDetails = vaults[vault];
        name = vaultDetails.name;
        factory = vaultDetails.factory;
        active = vaultDetails.active;
    }
}