// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

// TODO: ROLES
// import "../Roles.sol";
import "../interfaces/IVaultRegistry.sol";

/// @title vault registry
/// @author Carl Farterson (@carlfarterson)
/// @notice Keeps track of all active _vaults and available vault factories
contract VaultRegistry is IVaultRegistry {
    mapping(address => bool) private _vaults;
    // NOTE: _approved vault factories could be for
    // Vanilla erc20 vaults, Uniswap-LP vaults, Balancer LP  vaults, etc.
    mapping(address => bool) private _approved;

    /// @inheritdoc IVaultRegistry
    function approve(address _vault) external override {
        // TODO: access control
        require(!_approved[_vault], "_vault approved");
        _approved[_vault] = true;
        emit Approve(_vault);
    }

    /// @inheritdoc IVaultRegistry
    function unapprove(address _vault) external override {
        // TODO: access control
        require(_approved[_vault], "_vault !approved");
        _approved[_vault] = false;
        emit Unapprove(_vault);
    }

    /// @inheritdoc IVaultRegistry
    function isApproved(address _vault) external view override returns (bool) {
        return _approved[_vault];
    }
}
