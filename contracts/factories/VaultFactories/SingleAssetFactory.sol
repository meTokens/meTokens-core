pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Create2.sol";

import "../../vaults/SingleAsset.sol";
import "../../interfaces/I_VaultRegistry.sol";

// TODO: Should I_Hub be imported?

/// @title Factory contract to erc20-collateral vaults
/// @author Carl Farterson (@carlfarterson)
/// @notice Deploys a single collateral vault (non-LP token)
contract SingleAssetFactory {

    modifier onlyHub() {
        require(msg.sender == hub, "!hub");
        _;
    }

    event CreateVault(address vault);

    address public hub;
    I_VaultRegistry public vaultRegistry;

    constructor(address _hub, address _vaultRegistry) public {
        hub = _hub;
        vaultRegistry = I_VaultRegistry(_vaultRegistry);
    }
    
	/// @notice function to create and register a new vault to the vault registry
    /// @param _name name of vault
    /// @param _owner owner of vault
    /// @param _collateralAsset address of vault collateral asset
    /// @param _encodedVaultAdditionalArgs Additional arguments passed to create a vault
    /// @return address of new vault
    function createVault(
        string calldata _name,
        address _owner,
        address _collateralAsset,
        bytes4 _encodedVaultAdditionalArgs // NOTE: potentially needed for other vaults 
    ) onlyHub external returns (address) {
        uint256 vaultId = vaultRegistry.vaultCount();
        // TODO: validate salt of vaultId is correct type
        address vaultAddress = Create2.deploy(vaultId, type(SingleAsset).creationCode);

        // create our vault
        SingleAsset(vaultAddress).initialize(
            _owner,
            _collateralAsset
        );

        // Add vault to vaultRegistry
        vaultRegistry.registerVault(_name, vaultAddress, address(this));

        emit CreateVault(vaultAddress);
        return vaultAddress;
    }
}