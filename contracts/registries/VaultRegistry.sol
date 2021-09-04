// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../Roles.sol";
import "../interfaces/IVaultRegistry.sol";


/// @title vault registry
/// @author Carl Farterson (@carlfarterson)
/// @notice Keeps track of all active vaults and available vault factories 
contract VaultRegistry is IVaultRegistry, Roles {

    mapping (address => bool) private vaults;
    // NOTE: approved vault factories could be for
    // Vanilla erc20 vaults, Uniswap-LP vaults, Balancer LP  vaults, etc.
	mapping (address => bool) private approved;

    /// @inheritdoc IVaultRegistry
    function register(
        address _vault
    ) external override {
        require(approved[msg.sender], "Only vault factories can register vaults");

        // Add vault details to storage
        vaults[_vault] = true;

        emit Register(_vault, msg.sender);
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
        require(vaults[_vault], "Vault not active");
        vaults[_vault] = false;
        emit Deactivate(_vault);
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
        return vaults[_vault];
    }

    /// @inheritdoc IVaultRegistry
    function isApproved(address _factory) external view override returns (bool) {
        return approved[_factory];
    }

    // TODO: array of vaults to loop through?
}