pragma solidity ^0.8.0;

import "../../vaults/SingleAsset.sol";
import "../../interfaces/I_VaultRegistry.sol";

/// @title Factory contract to erc20-collateral vaults
/// @author Carl Farterson (@carlfarterson)
/// @notice Deploys a single collateral vault (non-LP token)
contract SingleAssetFactory {

    event CreateVault(address vault);

    I_VaultRegistry public vaultRegistry;

    constructor(address _vaultRegistry) public {
        vaultRegistry = _vaultRegistry;
    }
    
	/// @notice function to create and register a new vault to the vault registry
    /// @param _name name of vault
    /// @param _owner owner of vault
    /// @param _valueSetAddress address of {Curve}ValueSet.sol
    /// @param _collateralAsset address of vault collateral asset
    /// @param _encodedVaultAdditionalArgs Additional arguments passed to create a vault
    /// @return address of new vault
    function createVault(
        string calldata _name,
        address _owner,
        address _valueSetAddress,
        address _collateralAsset,
        bytes4 _encodedVaultAdditionalArgs // NOTE: this is _refundRatio, base_x, & base_y
    ) public returns (address) {
        uint256 vaultId = vaultRegistry.vaultCount();
        // create our vault
        // TODO: create2 shit
        address vaultAddress = Create2.deploy(vaultId, type(SingleAsset).creationCode);

        SingleAsset(vaultAddress).initialize(
            vaultId,
            _owner,
            _valueSetAddress,
            _encodedVaultAdditionalArgs
        );

        // Add vault to vaultRegistry
        vaultRegistry.registerVault(_name, vault, address(this));

        emit CreateVault(vaultAddress);
        return vaultAddress;
    }
}