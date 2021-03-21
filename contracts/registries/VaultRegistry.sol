pragma solidity ^0.8.0;

contract VaultRegistry {

    event RegisterVault(string name, address vault, address factory);
    event DeactivateVault(uint256 vaultId);
    event ReactivateVault(uint256 vaultId);
    // event RegisterFactory(address factory);
    // event DeactivateFactory(address factory);

	mapping (address => bool) private approvedVaultFactories;
    mapping (address => VaultDetails) public vaults;
    // uint256 private _vaultCount;

    struct VaultDetails {
        string name;
        address factory; // reference vaultBalancerFactory.sol as an example of a vault factory
        bool active;
    }

    // TODO: argument check
    // TODO: access control
    function registerVault(string calldata name, address _vault, address _factory) {
        require(isApprovedVaultFactory(_factory), "Factory not approved");

        // Add vault details to storage
        VaultDetails storage vaultDetails = VaultDetails(name, _vault, _factory, true);
        vaults[_vault] = vaultDetails;

        emit RegisterVault(name, _vault, _factory);
    }

    function deactivateVault(uint256 vaultId) public {
        emit DeactivateVault(vaultId);
    }
    function reactivateVault(uint256 vaultId) public {
        emit ReactivateVault(vaultId);
    }

    // TODO: access control
    function registerVaultFactory(address factory) public {
        require(!approvedVaultFactories[factory], "Factory already approved");
        require(factory != address(0), "Factory cannot equal 0 address");
        approvedVaultFactories[factory] = true;
        emit RegisterVaultFactory(factory);
    }

    function deactivateVaultFactory(uint256 factory) public {
        require(approvedVaultFactories[factory], "Factory not approved");
        approvedVaultFactories[factory] = false;
        emit DeactivateVaultFactory(vaultId);
    }

    function getVaultFactoryCount() public view returns (uint256) {
        return _vaultFactoryCount;
    }

    function isApprovedVaultFactory(address factory) public view returns (bool) {
        return approvedVaultFactories[factory];
    }

}