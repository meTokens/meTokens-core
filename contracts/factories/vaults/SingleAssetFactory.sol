// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "../../vaults/SingleAsset.sol";

import "../../interfaces/IVaultRegistry.sol";
import "../../interfaces/IVaultFactory.sol";

// TODO: Should IHub be imported?

/// @title Factory contract to erc20-collateral vaults
/// @author Carl Farterson (@carlfarterson)
/// @notice Deploys a single collateral vault (non-LP token)
contract SingleAssetFactory is IVaultFactory {

    modifier onlyHub() {
        require(msg.sender == hub, "!hub");
        _;
    }

    event Create(address vault);

    uint256 private count;
    address public hub;
    address public implementation;  // TODO: this will be the SingleAsset contract
    IVaultRegistry public vaultRegistry;

    constructor(address _hub, address _vaultRegistry, address _implementation) {
        hub = _hub;
        vaultRegistry = IVaultRegistry(_vaultRegistry);
        implementation = _implementation;
    }
    
    /// @inheritdoc IVaultFactory
    function create(
        string calldata _name,
        address _owner,
        address _collateralAsset,
        bytes calldata _encodedVaultAdditionalArgs // NOTE: potentially needed for other vaults 
    ) external override returns (address) {
        address vaultAddress = Clones.cloneDeterministic(
            implementation,
            bytes32(count)
        );

        // create our vault
        SingleAsset(vaultAddress).initialize(
            _owner,
            _collateralAsset
        );

        // Add vault to vaultRegistry
        vaultRegistry.register(_name, vaultAddress, address(this));

        count++;
        emit Create(vaultAddress);
        return vaultAddress;
    }
}