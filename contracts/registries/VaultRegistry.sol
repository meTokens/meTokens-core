pragma solidity ^0.8.0;


/// @title vault registry
/// @author Carl Farterson (@carlfarterson)
/// @notice Keeps track of all active vaults and available vault factories 
contract VaultRegistry {

    event RegisterVault(string name, address vault, address factory);
    event DeactivateVault(address vault);
    event ApproveVaultFactory(address factory);
    event UnapproveVaultFactory(address factory);

    mapping (address => VaultDetails) private vaults;
	mapping (address => bool) private approvedVaultFactories;

    struct VaultDetails {
        string name;
        address factory; // NOTE: references factories/VaultFactories/{}.sol
        bool active;  // NOTE: can be inactive after vault migration
    }

    /// @notice add a vault to the vault registry
    /// @param _name name of new vault
    /// @param _vault address of new vault
    /// @param _factory address of vault factory used to create the vault
    function registerVault(string calldata _name, address _vault, address _factory) external {
        // TODO: access control
        // Add vault details to storage
        // TODO: validate memory vs. storage usage
        VaultDetails memory vaultDetails = VaultDetails(_name, _factory, true);
        vaults[_vault] = vaultDetails;

        emit RegisterVault(_name, _vault, _factory);
    }

    /// @notice TODO
    /// @param _factory TODO
    function approveVaultFactory(address _factory) external {
        // TODO: access control
        require(!approvedVaultFactories[_factory], "Factory already approved");
        approvedVaultFactories[_factory] = true;
        emit ApproveVaultFactory(_factory);
    }

    /// @notice TODO
    /// @param _vault TODO
    function deactivateVault(address _vault) external {
        // TODO: access control
        VaultDetails storage vaultDetails = vaults[_vault];
        require(vaultDetails.active != false, "Vault not active");
        vaultDetails.active = false;
    }

    /// @notice TODO
    /// @param _factory TODO
    function unapproveVaultFactory(address _factory) external {
        // TODO: access control
        require(approvedVaultFactories[_factory], "Factory not approved");
        approvedVaultFactories[_factory] = false;
        emit UnapproveVaultFactory(_factory);
    }

    // TODO: are reactivate funcs needed?
    // function reactivateVault(uint256 vaultId) public {}

    // TODO: Does this view need to be external to work with I_VaultRegistry.sol?
    /// @notice TODO
    /// @param _vault TODO
    function isActiveVault(address _vault) external view returns (bool) {
        VaultDetails memory vaultDetails = vaults[_vault];
        return vaultDetails.active;
    }

    function isApprovedVaultFactory(address _factory) external view returns (bool) {
        return approvedVaultFactories[_factory];
    }

}