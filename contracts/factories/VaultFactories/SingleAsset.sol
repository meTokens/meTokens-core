pragma solidity ^0.8.0;

import "../interfaces/I_VaultRegistry.sol";
import "../vaults/Vault_SingleAsset.sol";

contract SingleAsset {

    I_VaultRegistry public registry;
    Vault public vault;

    constructor(address _registry) public {
        require(_registry != address(0), "Cannot be 0 address");
        registry = _registry;
    }
    
    // TODO: access control
	function createVault(
        string calldata name,
        address _owner,
        uint256 _hubId,
        address _valueSetAddress,
        bytes4 _encodedVaultAdditionalArgs // NOTE: this is _refundRatio and _collateralAsset hashed
    ) public returns (address) {

        // create our vault
        Vault memory vault = new Vault_SingleAsset();
        vault.initialize(
            registry.vaultCount(),
            _owner,
            _hubId,
            _valueSetAddress,
            _encodedVaultAdditionalArgs
        );

        // Add vault to registry
        registry.registerVault(name, vault, address(this));
        
        return address(vault);
    }
}