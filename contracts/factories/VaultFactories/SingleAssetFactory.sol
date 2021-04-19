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
    
	/// @notice function to create and register a new vault to the vault registry
    /// @param _name name of vault
    /// @param _owner owner of vault
    /// @param _hub hub identifier
    /// @param _valueSetAddress address of {Curve}ValueSet.sol
    /// @param _collateralAsset address of vault collateral asset
    /// @param _encodedVaultAdditionalArgs Additional arguments passed to create a vault
    function createVault(
        string calldata _name,
        address _owner,
        uint256 _hub,
        address _valueSetAddress,
        address _collateralAsset,
        bytes4 _encodedVaultAdditionalArgs // NOTE: this is _refundRatio, base_x, & base_y
    ) public returns (address) {

        // create our vault
        // TODO: create2 shit
        Vault vault = new Vault_SingleAsset();
        vault.initialize(
            vaultRegistry.vaultCount(),
            _owner,
            _hub,
            _valueSetAddress,
            _encodedVaultAdditionalArgs
        );

        // Add vault to vaultRegistry
        vaultRegistry.registerVault(_name, vault, address(this));
        
        return address(vault);
    }
}