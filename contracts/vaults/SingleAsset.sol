pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "./Vault.sol";
import "../interfaces/I_VaultRegistry.sol";
import "../interfaces/I_ERC20.sol";

/// @title ERC-20 (non-LP) token vault
/// @author Carl Farterson (@carlfarterson)
/// @notice Base single asset vault contract
/// @dev Only callable by the vault factory
contract SingleAsset is Vault, Initializable {

    // TODO: does hub need to be included in vault details?

    I_VaultRegistry public vaultRegistry = I_VaultRegistry(0x0); // TODO: address

    constructor() {}

    function initialize(
        address _owner,
        address _collateralAsset
    ) initializer public {
        require(vaultRegistry.isApprovedVaultFactory(msg.sender), "msg.sender not approved vault factory");
        owner = _owner;
        collateralAsset = I_ERC20(_collateralAsset);
    }


}