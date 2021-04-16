pragma solidity ^0.8.0;

import "../../vaults/SingleAsset.sol";
import "../../interfaces/I_VaultRegistry.sol";

/// @title Factory contract to erc20-collateral vaults
/// @author Carl Farterson (@carlfarterson)
/// @notice Deploys a single collateral vault (non-LP token)
contract SingleAssetFactory {

    I_VaultRegistry public vaultRegistry;
    Vault public vault;

    constructor(address _hub, address _vaultRegistry) public {
        hub = _hub;
        vaultRegistry = _vaultRegistry;
    }
    
    // TODO: access control
	function createVault(
        string calldata name,
        address _owner,
        uint256 _hub,
        address _valueSetAddress,
        address _collateralAsset,
        bytes4 _encodedVaultAdditionalArgs // NOTE: this is _refundRatio, base_x, & base_y
    ) public returns (address) {

        // create our vault
        // TODO: create2 shit
        Vault memory vault = new Vault_SingleAsset();
        vault.initialize(
            vaultRegistry.vaultCount(),
            _owner,
            _hub,
            _valueSetAddress,
            _encodedVaultAdditionalArgs
        );

        // Add vault to vaultRegistry
        vaultRegistry.registerVault(name, vault, address(this));
        
        return address(vault);
    }
}