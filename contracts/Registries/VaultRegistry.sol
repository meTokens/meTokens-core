pragma solidity ^0.8.0;

contract VaultRegistry {

    event RegisterVault(address factory, string name, uint256 vaultId);
    event DeactivateVault(uint256 vaultId);
    event ReactivateVault(uint256 vaultId);
    // event RegisterFactory(address factory);
    // event DeactivateFactory(address factory);

	mapping (uint256 => VaultDetails) vaultFactories;
    mapping (address => bool) vaults;
    uint256 private _vaultFactoryCount;

    // struct VaultDetails {
    //     address factory; // reference vaultBalancerFactory.sol as an example of a vault factory
    // 	string name;
    //     bool active;
    // }

    struct VaultFactoryDetails {
        address factory; // reference vaultBalancerFactory.sol as an example of a vault factory
        string name;
        bool active;
    }

    // TODO: argument check
    // TODO: access control
    function registerVault(address factory, string calldata name) {
        require(vaultFactories[factory], "Factory is not registered factory");

        // Create vault
        

        // Add vault details to storage
        VaultDetails memory v = VaultDetails(factory, name, true);
        vaults[++_vaultFactoryCount] = v;

        emit RegisterVault(factory, name, _vaultFactoryCount);
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