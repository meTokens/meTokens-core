// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../interfaces/IVaultRegistry.sol";


/// @title vault registry
/// @author Carl Farterson (@carlfarterson)
/// @notice Keeps track of all active vaults and available vault factories 
contract VaultRegistry is IVaultRegistry {

    event Register(string name, address vault, address factory);
    event DeactivateVault(address vault);
    event Approve(address factory);
    event Unapprove(address factory);

    mapping (address => VaultDetails) private vaults;
    // NOTE: approved vault factories could be for
    // Vanilla erc20 vaults, Uniswap-LP vaults, Balancer LP  vaults, etc.
	mapping (address => bool) private approvedFactories;

    struct VaultDetails {
        string name;
        address factory; // NOTE: references factories/VaultFactories/{}.sol
        bool active;  // NOTE: can be inactive after vault migration
    }

    /// @inheritdoc IVaultRegistry
    function register(
        string calldata _name,
        address _vault,
        address _factory
    ) external override {
        require(approvedFactories[msg.sender], "Only vault factories can register vaults");
        // Add vault details to storage
        VaultDetails memory vaultDetails = VaultDetails(_name, _factory, true);
        vaults[_vault] = vaultDetails;

        emit Register(_name, _vault, _factory);
    }

    /// @inheritdoc IVaultRegistry
    function approve(address _factory) external override {
        // TODO: access control
        require(!approvedFactories[_factory], "Factory already approved");
        approvedFactories[_factory] = true;
        emit Approve(_factory);
    }


    /// @inheritdoc IVaultRegistry
    function deactivateVault(address _vault) external override {
        // TODO: access control
        VaultDetails storage vaultDetails = vaults[_vault];
        require(vaultDetails.active != false, "Vault not active");
        vaultDetails.active = false;
    }

    /// @inheritdoc IVaultRegistry
    function unapprove(address _factory) external override {
        // TODO: access control
        require(approvedFactories[_factory], "Factory not approved");
        approvedFactories[_factory] = false;
        emit Unapprove(_factory);
    }

    // TODO: are reactivate funcs needed?
    // function reactivateVault(uint256 vaultId) public {}


    /// @inheritdoc IVaultRegistry
    function isActiveVault(address _vault) external view override returns (bool) {
        // TODO: import VaultDetails struct
        VaultDetails memory vaultDetails = vaults[_vault];
        return vaultDetails.active;
    }


    /// @inheritdoc IVaultRegistry
    function isApprovedVaultFactory(address _factory) external view override returns (bool) {
        return approvedFactories[_factory];
    }

    
    /// @inheritdoc IVaultRegistry
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