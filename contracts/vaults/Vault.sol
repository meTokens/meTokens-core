// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "../libs/Details.sol";
import "../interfaces/IVault.sol";
import "../interfaces/IERC20.sol";
import "hardhat/console.sol";

/// @title Vault
/// @author Carl Farterson (@carlfarterson)
/// @notice Implementation contract for SingleAssetFactory.sol
contract Vault is Ownable, IVault {
    // TODO
    address public token;
    uint256 public accruedFees;
    mapping(address => uint256) public accruedMapFees;
    mapping(address => address) public tokens; // key: users meToken addr, value: collateral token

    function addMapFee(address _token, uint256 _amount) external {
        accruedMapFees[_token] += _amount;
        // emit AddMapFee(_token, _amount);
    }

    /// @inheritdoc IVault
    function addFee(uint256 _amount) external override {
        // TODO: access control
        accruedFees += _amount;
        emit AddFee(_amount);
    }

    /// @inheritdoc IVault
    function withdraw(bool _max, uint256 _amount) external override onlyOwner {
        _withdraw(_max, _amount);
    }

    function getAccruedFees() external view override returns (uint256) {
        return accruedFees;
    }

    /// @inheritdoc IVault
    function getToken() external view override returns (address) {
        return token;
    }

    function getMapToken(address _meToken) external view returns (address) {
        return tokens[_meToken];
    }

    function _withdraw(bool _max, uint256 _amount) internal {
        if (_max) {
            _amount = accruedFees;
        } else {
            require(_amount <= accruedFees, "_amount > accruedFees");
        }
        uint256 balance = IERC20(token).balanceOf(token);
        require(_amount <= balance, "_amount > balance");

        accruedFees -= _amount;

        IERC20(token).transfer(DAO, _amount);
        emit Withdraw(_amount, DAO);
    }
}
