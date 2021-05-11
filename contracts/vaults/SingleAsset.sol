pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "../interfaces/I_ERC20.sol";
import "./Vault.sol";


/// @title ERC-20 (non-LP) token vault
/// @author Carl Farterson (@carlfarterson)
/// @notice Base single asset vault contract
/// @dev Only callable by the vault factory
contract SingleAsset is Vault, Initializable {

    I_VaultRegistry public vaultRegistry = I_VaultRegistry(0x0); // TODO

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

    function withdrawFees(bool _max, uint256 _amount, address _to) external {
        require(msg.sender == gov, "!gov");
        if (_max) {
            _amount = accruedFees;
        } else {
            require(_amount <= accruedFees, "_amount cannot exceed feeBalance");
        }

        I_ERC20(collateralAsset).transfer(_to, _amount);
        emit WithdrawFees(_amount, _to);
    }


}