// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "../interfaces/IVaultRegistry.sol";
import "../interfaces/IVault.sol";
import "../interfaces/IERC20.sol";
import "hardhat/console.sol";

/// @title Vault
/// @author Carl Farterson (@carlfarterson)
/// @notice Implementation contract for SingleAssetFactory.sol
contract SingleAssetVault is IVault, Ownable, Initializable {
    uint256 public constant PRECISION = 10**18;

    address public token;
    uint256 public accruedFees;
    bytes public encodedAdditionalArgs;

    function initialize(
        address _foundry,
        address _token,
        bytes memory _encodedAdditionalArgs
    ) external initializer {
        // TODO: access control?
        token = _token;
        encodedAdditionalArgs = _encodedAdditionalArgs;

        // Approve Foundry to spend all collateral in vault
        IERC20(token).approve(_foundry, 2**256 - 1);
    }

    /// @inheritdoc IVault
    function addFee(uint256 _amount) external override {
        // TODO: access control
        accruedFees = accruedFees + _amount;
        emit AddFee(_amount);
    }

    /// @inheritdoc IVault
    function withdraw(
        bool _max,
        uint256 _amount,
        address _to
    ) external override onlyOwner {
        if (_max) {
            _amount = accruedFees;
        } else {
            require(
                _amount <= accruedFees,
                "_amount cannot exceed accruedFees"
            );
        }

        accruedFees = accruedFees - _amount;

        IERC20(token).transfer(_to, _amount);
        emit Withdraw(_amount, _to);
    }

    /// @inheritdoc IVault
    function getToken() external view override returns (address) {
        return token;
    }
}
