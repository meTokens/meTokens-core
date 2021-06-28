// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../interfaces/IVaultRegistry.sol";
import "../interfaces/IVault.sol";
import "../interfaces/IERC20.sol";


/// @title Vault
/// @author Carl Farterson (@carlfarterson)
/// @notice Base vault contract inherited by all vaults
abstract contract Vault is IVault {

    event WithdrawFees(uint256 amount, address to);

    uint256 private PRECISION = 10**18;
    
    address foundry = address(0x0);  // TODO
    address gov = address(0x0);  // TODO
    IVaultRegistry public vaultRegistry = IVaultRegistry(address(0)); // TODO

    address public owner;
	address public collateralAsset;
    uint256 accruedFees;

    
    /// @inheritdoc IVault
    function addFee(uint256 amount) external override {
        accruedFees = accruedFees + amount;
    }


    /// @inheritdoc IVault
    function withdrawFees(bool _max, uint256 _amount, address _to) external override {
        require(msg.sender == gov, "!gov");
        if (_max) {
            _amount = accruedFees;
        } else {
            require(_amount <= accruedFees, "_amount cannot exceed feeBalance");
        }

        IERC20(collateralAsset).transfer(_to, _amount);
        accruedFees = accruedFees - _amount;

        emit WithdrawFees(_amount, _to);
    }


    /// @inheritdoc IVault
    function getCollateralAsset() external view override returns (address) {
        return collateralAsset;
    }

}