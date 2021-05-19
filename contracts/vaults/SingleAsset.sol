pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "../interfaces/I_ERC20.sol";
import "./Vault.sol";


/// @title ERC-20 (non-LP) token vault
/// @author Carl Farterson (@carlfarterson)
/// @notice Base single asset vault contract
/// @dev Only callable by the vault factory
contract SingleAsset is Vault, Initializable {

    constructor() {}

    function initialize(
        address _owner,
        address _collateralAsset
    ) initializer public {
        require(vaultRegistry.isApprovedVaultFactory(msg.sender), "msg.sender not approved vault factory");

        owner = _owner;
        collateralAsset = _collateralAsset;

        // Approve Foundry to spend all collateral in vault
        I_ERC20(collateralAsset).approve(foundry, 2**256 - 1);
    }

}