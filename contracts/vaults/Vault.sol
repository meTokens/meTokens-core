// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IVault} from "../interfaces/IVault.sol";
import {IHubFacet} from "../interfaces/IHubFacet.sol";
import {IMeTokenRegistryFacet} from "../interfaces/IMeTokenRegistryFacet.sol";
import {IMigrationRegistry} from "../interfaces/IMigrationRegistry.sol";

/// @title MeTokens Basic Vault
/// @author Carter Carlson (@cartercarlson), Parv Garg (@parv3213), @zgorizzo69
/// @notice Most basic vault implementation to be inherited by meToken vaults
abstract contract Vault is IVault, ReentrancyGuard {
    using SafeERC20 for IERC20;
    uint256 public constant PRECISION = 10**18;
    address public dao;
    address public diamond;

    constructor(address _dao, address _diamond) {
        dao = _dao;
        diamond = _diamond;
    }

    /// @inheritdoc IVault
    function handleDeposit(
        address from,
        address asset,
        uint256 depositAmount,
        uint256 feeAmount
    ) external override nonReentrant {
        require(msg.sender == diamond, "!diamond");
        IERC20(asset).safeTransferFrom(from, address(this), depositAmount);
        if (feeAmount > 0) {
            accruedFees[asset] += feeAmount;
        }
        emit HandleDeposit(from, asset, depositAmount, feeAmount);
    }

    /// @inheritdoc IVault
    function handleWithdrawal(
        address to,
        address asset,
        uint256 withdrawalAmount,
        uint256 feeAmount
    ) external override nonReentrant {
        require(msg.sender == diamond, "!diamond");
        IERC20(asset).safeTransfer(to, withdrawalAmount);
        if (feeAmount > 0) {
            accruedFees[asset] += feeAmount;
        }
        emit HandleWithdrawal(to, asset, withdrawalAmount, feeAmount);
    }

    /// @inheritdoc IVault
    function claim(
        address asset,
        bool max,
        uint256 amount
    ) external override nonReentrant {
        require(msg.sender == dao, "!DAO");
        if (max) {
            amount = accruedFees[asset];
        } else {
            require(amount > 0, "amount < 0");
            require(amount <= accruedFees[asset], "amount > accrued fees");
        }
        accruedFees[asset] -= amount;
        IERC20(asset).transfer(dao, amount);
        emit Claim(dao, asset, amount);
    }

    /// @inheritdoc IVault
    function isValid(address meToken, bytes memory encodedArgs)
        external
        virtual
        override
        returns (bool);
}
