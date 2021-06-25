// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "../../vaults/SingleAsset.sol";

import "../../interfaces/I_VaultRegistry.sol";
import "../../interfaces/I_VaultFactory.sol";

// TODO: Should I_Hub be imported?

/// @title Factory contract to erc20-collateral vaults
/// @author Carl Farterson (@carlfarterson)
/// @notice Deploys a single collateral vault (non-LP token)
abstract contract SingleAssetFactory is I_VaultFactory {

    modifier onlyHub() {
        require(msg.sender == hub, "!hub");
        _;
    }

    event CreateVault(address vault);

    uint256 private deployCount;
    address public hub;
    address public implementation;  // TODO: this will be the SingleAsset contract
    I_VaultRegistry public vaultRegistry;

    constructor(address _hub, address _vaultRegistry, address _implementation) {
        hub = _hub;
        vaultRegistry = I_VaultRegistry(_vaultRegistry);
        implementation = _implementation;
    }
    
    /// @inheritdoc I_VaultFactory
    function createVault(
        string calldata _name,
        address _owner,
        address _collateralAsset,
        bytes calldata _encodedVaultAdditionalArgs // NOTE: potentially needed for other vaults 
    ) external override returns (address) {
        address vaultAddress = Clones.cloneDeterministic(
            implementation,
            bytes32(deployCount)
        );

        // create our vault
        SingleAsset(vaultAddress).initialize(
            _owner,
            _collateralAsset
        );

        // Add vault to vaultRegistry
        vaultRegistry.registerVault(_name, vaultAddress, address(this));

        deployCount++;
        emit CreateVault(vaultAddress);
        return vaultAddress;
    }
}