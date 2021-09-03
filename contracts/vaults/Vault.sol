// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

import "../interfaces/IVaultRegistry.sol";
import "../interfaces/IVault.sol";
import "../interfaces/IERC20.sol";

/// @title Vault
/// @author Carl Farterson (@carlfarterson)
/// @notice Base vault contract inherited by all vaults
contract Vault is IVault, Ownable {

    uint256 private PRECISION = 10**18;
    
    address foundry = address(0x0);  // TODO
    address gov = address(0x0);  // TODO
    IVaultRegistry public vaultRegistry = IVaultRegistry(address(0)); // TODO

	address internal token;
    uint256 public accruedFees;
    bytes public encodedAdditionalArgs;
    
    /// @inheritdoc IVault
    function addFee(uint256 amount) external onlyOwner override {
        accruedFees = accruedFees + amount;
        emit AddFee(amount);
    }


    /// @inheritdoc IVault
    function withdraw(bool _max, uint256 _amount, address _to) external onlyOwner override {
        if (_max) {
            _amount = accruedFees;
        } else {
            require(_amount <= accruedFees, "_amount cannot exceed accruedFees");
        }

        IERC20(token).transfer(_to, _amount);
        accruedFees = accruedFees - _amount;

        emit Withdraw(_amount, _to);
    }


    /// @inheritdoc IVault
    function getToken() external view override returns (address) {
        return token;
    }
}