// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "../../vaults/SingleAssetVault.sol";

import "../../interfaces/IVaultRegistry.sol";
import "../../interfaces/IVaultFactory.sol";

// TODO: Should IHub be imported?

/// @title Factory contract to erc20-collateral vaults
/// @author Carl Farterson (@carlfarterson)
/// @notice Deploys a single collateral vault (non-LP token)
contract SingleAssetFactory is IVaultFactory {
    uint256 private count;
    address public implementation; // TODO: this will be the SingleAsset contract
    address public foundry;
    IVaultRegistry public vaultRegistry;

    constructor(
        address _implementation,
        address _foundry,
        address _vaultRegistry
    ) {
        implementation = _implementation;
        foundry = _foundry;
        vaultRegistry = IVaultRegistry(_vaultRegistry);
    }

    /// @inheritdoc IVaultFactory
    function create(address _token, bytes memory _encodedAdditionalArgs)
        external
        override
        returns (address vaultAddress)
    {
        // TODO: access control
        vaultAddress = Clones.cloneDeterministic(
            implementation,
            bytes32(count++)
        );

        // create our vault
        SingleAssetVault(vaultAddress).initialize(
            foundry,
            _token,
            _encodedAdditionalArgs
        );

        // Add vault to vaultRegistry
        vaultRegistry.register(vaultAddress);

        emit Create(vaultAddress);
    }
}
