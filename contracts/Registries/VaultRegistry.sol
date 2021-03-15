pragma solidity ^0.8.0;

contract VaultRegistry {

    event RegisterVault(string name, address vault, address factory);
    event DeactivateVault(uint256 vaultId);
    event ReactivateVault(uint256 vaultId);
    // event RegisterFactory(address factory);
    // event DeactivateFactory(address factory);

	mapping (address => bool) private vaultFactories;
    mapping (address => VaultDetails) public vaults;
    uint256 private _vaultCount;

    struct VaultDetails {
        string name;
        address factory; // reference vaultBalancerFactory.sol as an example of a vault factory
        bool active;
    }

    // TODO: argument check
    // TODO: access control
    function registerVault(string calldata name, address _vault, address _factory) {

        // Add vault details to storage
        VaultDetails memory v = VaultDetails(name, _vault, _factory, false);
        vaults[_vault] = v;

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
        require(!vaultFactories[factory], "Factory already registered");
        require(factory != address(0), "Factory cannot equal 0 address");
        vaultFactories[factory] = true;
        emit RegisterVaultFactory(factory);
    }

    function deactivateVaultFactory(uint256 factory) public {
        require(vaultFactories[factory], "Factory not registered");
        vaultFactories[factory] = false;
        emit DeactivateVaultFactory(vaultId);
    }

    function getVaultFactoryCount() public view returns (uint256) {
        return _vaultFactoryCount;
    }

    function isApprovedVaultFactory(address factory) public view returns (bool) {
        return vaultFactories[factory];
    }

}