// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IVault} from "../interfaces/IVault.sol";
import {IHub} from "../interfaces/IHub.sol";
import {IMeTokenRegistry} from "../interfaces/IMeTokenRegistry.sol";
import {IMigrationRegistry} from "../interfaces/IMigrationRegistry.sol";

/// @title meTokens basic Vault
/// @author Carl Farterson (@carlfarterson), Parv Garg (@parv3213), @zgorizzo69
/// @notice Most basic vault implementation to be inherited by meToken vaults
abstract contract Vault is Ownable, IVault, ReentrancyGuard {
    using SafeERC20 for IERC20;
    uint256 public constant PRECISION = 10**18;
    address public dao;
    address public foundry;
    IHub public hub;
    IMeTokenRegistry public meTokenRegistry;
    IMigrationRegistry public migrationRegistry;

    constructor(
        address _dao,
        address _foundry,
        IHub _hub,
        IMeTokenRegistry _meTokenRegistry,
        IMigrationRegistry _migrationRegistry
    ) {
        dao = _dao;
        foundry = _foundry;

        hub = _hub;
        meTokenRegistry = _meTokenRegistry;
        migrationRegistry = _migrationRegistry;
    }

    function handleDeposit(
        address _from,
        address _asset,
        uint256 _depositAmount,
        uint256 _feeAmount
    ) external override nonReentrant {
        require(msg.sender == foundry, "!foundry");
        IERC20(_asset).safeTransferFrom(_from, address(this), _depositAmount);
        if (_feeAmount > 0) {
            accruedFees[_asset] += _feeAmount;
        }
        emit HandleDeposit(_from, _asset, _depositAmount, _feeAmount);
    }

    function handleWithdrawal(
        address _to,
        address _asset,
        uint256 _withdrawalAmount,
        uint256 _feeAmount
    ) external override nonReentrant {
        require(msg.sender == foundry, "!foundry");
        IERC20(_asset).safeTransfer(_to, _withdrawalAmount);
        if (_feeAmount > 0) {
            accruedFees[_asset] += _feeAmount;
        }
        emit HandleWithdrawal(_to, _asset, _withdrawalAmount, _feeAmount);
    }

    function claim(
        address _asset,
        bool _max,
        uint256 _amount
    ) external override nonReentrant {
        require(msg.sender == dao, "!DAO");
        if (_max) {
            _amount = accruedFees[_asset];
        } else {
            require(_amount > 0, "amount < 0");
            require(_amount <= accruedFees[_asset], "amount > accrued fees");
        }
        accruedFees[_asset] -= _amount;
        IERC20(_asset).transfer(dao, _amount);
        emit Claim(dao, _asset, _amount);
    }

    function isValid(address _meToken, bytes memory _encodedArgs)
        external
        virtual
        override
        returns (bool);
}
