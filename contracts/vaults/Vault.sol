// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../interfaces/I_VaultRegistry.sol";
import "../interfaces/I_ERC20.sol";


/// @title Vault
/// @author Carl Farterson (@carlfarterson)
/// @notice Base vault contract inherited by all vaults
contract Vault {

    event WithdrawFees(uint256 amount, address to);

    uint256 private PRECISION = 10**18;
    
    address foundry = address(0x0);  // TODO
    address gov = address(0x0);  // TODO
    I_VaultRegistry public vaultRegistry = I_VaultRegistry(address(0)); // TODO

    address public owner;
	address public collateralAsset;
    uint256 accruedFees;

    function addFee(uint256 amount) external {
        accruedFees = accruedFees + amount;
    }


    function withdrawFees(bool _max, uint256 _amount, address _to) external {
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


    function getCollateralAsset() external view returns (address) {
        return collateralAsset;
    }

}