pragma solidity ^0.8.0;

import "../../vaults/SingleAsset.sol";
import "../../interfaces/I_VaultRegistry.sol";


contract SingleAssetFactory {

    I_VaultRegistry public vaultRegistry;
    Vault public vault;

    constructor(address _vaultRegistry) public {
        require(_vaultRegistry != address(0), "Cannot be 0 address");
        vaultRegistry = _vaultRegistry;
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
            vaultRegistry.vaultCount(),
            _owner,
            _hubId,
            _valueSetAddress,
            _encodedVaultAdditionalArgs
        );

        // Add vault to vaultRegistry
        vaultRegistry.registerVault(name, vault, address(this));
        
        return address(vault);
    }
}