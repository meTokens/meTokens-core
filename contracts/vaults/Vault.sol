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
    uint256 public constant PRECISION = 10**18;

    // TODO
    address public constant DAO = address(0);
    address public token;
    uint256 public accruedFees;
    bytes public encodedAdditionalArgs;

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

    function _withdraw(bool _max, uint256 _amount) internal {
        if (_max) {
            _amount = accruedFees;
        } else {
            require(
                _amount <= accruedFees,
                "_amount cannot exceed accruedFees"
            );
        }

        accruedFees -= _amount;

        IERC20(token).transfer(DAO, _amount);
        emit Withdraw(_amount, DAO);
    }

    function getAccruedFees() external view override returns (uint256) {
        return accruedFees;
    }

    /// @inheritdoc IVault
    function getToken() external view override returns (address) {
        return token;
    }
}
