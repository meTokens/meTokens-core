// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "../libs/Details.sol";
import "../interfaces/IVault.sol";
import "../interfaces/IHub.sol";
import "../interfaces/IMeTokenRegistry.sol";
import "../interfaces/IMigrationRegistry.sol";
import "../interfaces/IERC20.sol";
import "hardhat/console.sol";

/// @title Vault
/// @author Carl Farterson (@carlfarterson)
/// @notice Implementation contract for SingleAssetFactory.sol
abstract contract Vault is Ownable, IVault {
    uint256 public constant PRECISION = 10**18;
    address public dao;
    address public foundry;
    IHub public hub;
    IMeTokenRegistry public meTokenRegistry;
    IMigrationRegistry public migrationRegistry;
    /// @dev key: addr of asset, value: cumulative fees paid in the asset
    mapping(address => uint256) public accruedFees;

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

    function addFee(address _asset, uint256 _amount) public override {
        require(msg.sender == foundry, "!foundry");
        accruedFees[_asset] += _amount;
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
            require(_amount <= accruedFees[_asset]);
        }
        accruedFees[_asset] -= _amount;
        IERC20(_asset).transfer(dao, _amount);
    }

    function isValid(address _meToken, bytes memory _encodedArgs)
        public
        virtual
        override
        returns (bool);

    function getAccruedFees(address _asset)
        external
        view
        override
        returns (uint256)
    {
        return accruedFees[_asset];
    }
}
