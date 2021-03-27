pragma solidity ^0.8.0;

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
        bool active;
    }

    // TODO: argument check
    function registerVault(string calldata name, address _vault, address _factory) external {
        // TODO: access control
        require(approvedVaultFactories[_factory], "Factory not approved");

        // Add vault details to storage
        // TODO: validate memory vs. storage usage
        VaultDetails memory vaultDetails = VaultDetails(name, _factory, true);
        vaults[_vault] = vaultDetails;

        emit RegisterVault(name, _vault, _factory);
    }

    function approveVaultFactory(address _factory) external {
        // TODO: access control
        require(!approvedVaultFactories[_factory], "Factory already approved");
        approvedVaultFactories[_factory] = true;
        emit ApproveVaultFactory(_factory);
    }

    function deactivateVault(address _vault) external {
        // TODO: access control
        require(isActiveVault(_vault), "Vault not active");
        VaultDetails storage vaultDetails = vaults[_vault];
        vaultDetails.active = false;
    }

    function unapproveVaultFactory(address _factory) external {
        // TODO: access control
        require(approvedVaultFactories[_factory], "Factory not approved");
        approvedVaultFactories[_factory] = false;
        emit UnapproveVaultFactory(_factory);
    }

    // TODO: are reactivate funcs needed?
    // function reactivateVault(uint256 vaultId) public {}

    // TODO: Does this view need to be external to work with I_VaultRegistry.sol?
    function isActiveVault(address _vault) public view returns (bool) {
        VaultDetails memory vaultDetails = vaults[_vault];
        return vaultDetails.active;
    }

    function isApprovedVaultFactory(address _factory) external view returns (bool) {
        return approvedVaultFactories[_factory];
    }

}