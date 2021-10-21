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
    uint256 private _count;
    address public hub;
    address public implementation; // TODO: this will be the SingleAsset contract
    IVaultRegistry public vaultRegistry;

    constructor(
        address _hub,
        address _implementation,
        address _vaultRegistry
    ) {
        hub = _hub;
        implementation = _implementation;
        vaultRegistry = IVaultRegistry(_vaultRegistry);
    }

    /// @inheritdoc IVaultFactory
    function create(bytes memory _encodedArgs)
        external
        override
        returns (address vaultAddress)
    {
        require(msg.sender == hub, "!hub");
        require(_encodedArgs.length > 0, "_encodedArgs.length == 0");
        address token = abi.decode(_encodedArgs, (address));

        vaultAddress = Clones.cloneDeterministic(
            implementation,
            bytes32(_count++)
        );

        // create our vault
        // SingleAssetVault(vaultAddress).initialize(token);

        // Add vault to vaultRegistry
        // vaultRegistry.register(vaultAddress);

        emit Create(vaultAddress);
    }
}
