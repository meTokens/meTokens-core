// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../interfaces/IVaultRegistry.sol";


/// @title vault registry
/// @author Carl Farterson (@carlfarterson)
/// @notice Keeps track of all active vaults and available vault factories 
contract VaultRegistry is IVaultRegistry {

    mapping (address => Details) private vaults;
    // NOTE: approved vault factories could be for
    // Vanilla erc20 vaults, Uniswap-LP vaults, Balancer LP  vaults, etc.
	mapping (address => bool) private approved;

    struct Details {
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
        require(approved[msg.sender], "Only vault factories can register vaults");
        // Add vault details to storage
        Details memory details = Details(_name, _factory, true);
        vaults[_vault] = details;

        emit Register(_name, _vault, _factory);
    }

    /// @inheritdoc IVaultRegistry
    function approve(address _factory) external override {
        // TODO: access control
        require(!approved[_factory], "Factory already approved");
        approved[_factory] = true;
        emit Approve(_factory);
    }


    /// @inheritdoc IVaultRegistry
    function deactivate(address _vault) external override {
        // TODO: access control
        Details storage details = vaults[_vault];
        require(details.active != false, "Vault not active");
        details.active = false;
    }

    /// @inheritdoc IVaultRegistry
    function unapprove(address _factory) external override {
        // TODO: access control
        require(approved[_factory], "Factory not approved");
        approved[_factory] = false;
        emit Unapprove(_factory);
    }

    // TODO: are reactivate funcs needed?
    // function reactivateVault(uint256 vaultId) public {}


    /// @inheritdoc IVaultRegistry
    function isActive(address _vault) external view override returns (bool) {
        Details memory details = vaults[_vault];
        return details.active;
    }


    /// @inheritdoc IVaultRegistry
    function isApproved(address _factory) external view override returns (bool) {
        return approved[_factory];
    }

    
    /// @inheritdoc IVaultRegistry
    function getDetails(address vault) external view override returns (
        string memory name,
        address factory,
        bool active
    ) {
        Details memory details = vaults[vault];
        name = details.name;
        factory = details.factory;
        active = details.active;
    }
}