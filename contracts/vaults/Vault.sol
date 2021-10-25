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
contract Vault is Ownable {
    address public dao;
    address public foundry;
    uint256 public constant PRECISION = 10**18;
    /// @dev key: addr of asset, value: cumulative fees paid in the asset
    mapping(address => uint256) public accruedFees;
    /// @dev key: hubId, value: addr of asset
    mapping(uint256 => address) public assetOfHub;
    /// @dev key: meToken addr, value: addr of asset
    mapping(address => address) public assetOfMeToken;

    constructor(address _dao, address _foundry) {
        dao = _dao;
        foundry = _foundry;
    }

    function addFee(address _asset, uint256 _amount) external {
        require(msg.sender == foundry, "!foundry");
        accruedFees[_asset] += _amount;
    }

    function withdraw(
        address _asset,
        bool _max,
        uint256 _amount
    ) external {
        require(msg.sender == dao, "!DAO");
        if (_max) {
            _amount = accruedFees[_asset];
        } else {
            require(_amount <= accruedFees[_asset]);
        }
        accruedFees[_asset] -= _amount;
        IERC20(_asset).transfer(dao, _amount);
    }

    function getAsset(uint256 _hubId) external view returns (address) {
        return assetOfHub[_hubId];
    }

    function getAsset(address _meToken) external view returns (address) {
        return assetOfMeToken[_meToken];
    }

    function getAccruedFees(address _asset) external view returns (uint256) {
        return accruedFees[_asset];
    }
}
