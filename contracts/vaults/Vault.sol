// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../interfaces/I_VaultRegistry.sol";
import "../interfaces/I_Vault.sol";
import "../interfaces/I_ERC20.sol";


/// @title Vault
/// @author Carl Farterson (@carlfarterson)
/// @notice Base vault contract inherited by all vaults
abstract contract Vault is I_Vault {

    event WithdrawFees(uint256 amount, address to);

    uint256 private PRECISION = 10**18;
    
    address foundry = address(0x0);  // TODO
    address gov = address(0x0);  // TODO
    I_VaultRegistry public vaultRegistry = I_VaultRegistry(address(0)); // TODO

    address public owner;
	address public collateralAsset;
    uint256 accruedFees;

    
    /// @inheritdoc I_Vault
    function addFee(uint256 amount) external override {
        accruedFees = accruedFees + amount;
    }


    /// @inheritdoc I_Vault
    function withdrawFees(bool _max, uint256 _amount, address _to) external override {
        require(msg.sender == gov, "!gov");
        if (_max) {
            _amount = accruedFees;
        } else {
            require(_amount <= accruedFees, "_amount cannot exceed feeBalance");
        }

        I_ERC20(collateralAsset).transfer(_to, _amount);
        accruedFees = accruedFees - _amount;

        emit WithdrawFees(_amount, _to);
    }


    /// @inheritdoc I_Vault
    function getCollateralAsset() external view override returns (address) {
        return collateralAsset;
    }

}