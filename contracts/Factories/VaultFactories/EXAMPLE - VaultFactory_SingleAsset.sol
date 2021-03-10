pragma solidity ^0.8.0;

import "../Interfaces/I_VaultRegistry.sol";
import "../VaultOptions/Vault_SingleAsset.sol";

contract VaultFactory_SingleAsset{

    I_VaultRegistry public registry;
    Vault public vault;

    constructor(address _registry) public {
        require(_registry != address(0), "Cannot be 0 address");
        registry = _registry;
    }
    
    // TODO: access control
	function createVault (
        address _owner,
        uint256 _hubId,
        uint256 _refundRatio,
        address _collateralAsset,
        address _curveZeroValues,
        string calldata name
    ) public {

        // create our vault
        vault v = new Vault();
        vault.initialize(
            registry.vaultCount(),
            _owner,
            _hubId,
            _refundRatio,
            _collateralAsset,
            _curveZeroValues
        );

        // Add vault to registry
        registry.registerVault(address(this), name);
        
    }
}