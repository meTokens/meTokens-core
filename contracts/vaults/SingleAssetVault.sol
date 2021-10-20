// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

import "../interfaces/IERC20.sol";

/// @title Vault
/// @author Carl Farterson (@carlfarterson)
/// @notice Implementation contract for SingleAssetFactory.sol
contract SingleAssetVault is Ownable {
    address public constant DAO = address(0); // TODO
    uint256 public constant PRECISION = 10**18;
    mapping(address => uint256) public accruedFees;
    mapping(address => address) public assets; // key: users meToken addr, value: collateral token
    mapping(address => bool) public approved; // key: erc20, value: is approved as collateral

    address public foundry = address(0); // TODO

    // function initialize(address _token) external {
    //     // Approve Foundry to spend all collateral in vault
    //     IERC20(token).approve(foundry, 2**256 - 1);
    // }

    function subscribeMeToken(address _meToken, address _asset) external {
        require(approved[_asset], "_asset !approved");
        assets[_meToken] = _asset;
    }

    function addFee(address _meToken, uint256 _amount) external {
        address asset = assets[_meToken];
        accruedFees[asset] += _amount;
    }

    function withdraw(
        address _asset,
        bool _max,
        uint256 _amount
    ) external {
        require(msg.sender == DAO, "!DAO");
        _withdraw(_asset, _max, _amount);
    }

    function _withdraw(
        address _asset,
        bool _max,
        uint256 _amount
    ) private {
        if (_max) {
            _amount = accruedFees[_asset];
        } else {
            require(_amount <= accruedFees[_asset]);
        }
        accruedFees[_asset] -= _amount;
        IERC20(_asset).transfer(DAO, _amount);
    }

    function approve(address _asset) external {
        require(msg.sender == DAO, "!DAO");
        require(!approved[_asset], "Already approved");
        approved[_asset] = true;
    }

    function unapprove(address _asset) external {
        require(msg.sender == DAO, "!DAO");
        require(approved[_asset], "Not approved");
        approved[_asset] = false;
    }

    function isApproved(address _asset) external view returns (bool) {
        return approved[_asset];
    }

    function getAsset(address _meToken) external view returns (address) {
        return assets[_meToken];
    }

    function getAccruedFees(address _asset) external view returns (uint256) {
        return accruedFees[_asset];
    }
}
