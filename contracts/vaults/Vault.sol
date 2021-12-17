// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../libs/Details.sol";
import "../interfaces/IVault.sol";
import "../interfaces/IHub.sol";
import "../interfaces/IMeTokenRegistry.sol";
import "../interfaces/IMigrationRegistry.sol";

/// @title Vault
/// @author Carl Farterson (@carlfarterson)
/// @notice Implementation contract for SingleAssetFactory.sol
abstract contract Vault is Ownable, IVault {
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

    function approveAsset(address _asset, uint256 _amount) external override {
        require(
            msg.sender == foundry || msg.sender == address(meTokenRegistry),
            "!foundry||!meTokenRegistry"
        );
        // increase the allowance to be able to burn tokens and retrieve the collateral
        IERC20(_asset).safeIncreaseAllowance(foundry, _amount);
    }

    function addFee(address _asset, uint256 _amount) external override {
        require(msg.sender == foundry, "!foundry");
        accruedFees[_asset] += _amount;
        emit AddFee(_asset, _amount);
    }

    function withdraw(
        address _asset,
        bool _max,
        uint256 _amount
    ) external override {
        require(msg.sender == dao, "!DAO");
        if (_max) {
            _amount = accruedFees[_asset];
        } else {
            require(_amount > 0, "amount < 0");
            require(_amount <= accruedFees[_asset], "amount > accrued fees");
        }
        accruedFees[_asset] -= _amount;
        IERC20(_asset).transfer(dao, _amount);
        emit Withdraw(_asset, _amount);
    }

    function isValid(address _meToken, bytes memory _encodedArgs)
        public
        virtual
        override
        returns (bool);
}
