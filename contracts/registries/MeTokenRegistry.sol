// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../MeToken.sol";
import "../Roles.sol";
import "../interfaces/IMeTokenRegistry.sol";
import "../interfaces/IMeTokenFactory.sol";
import "../interfaces/IHub.sol";
import "../interfaces/IVault.sol";
import "../interfaces/ICurveValueSet.sol";

import "../libs/Details.sol";


/// @title meToken registry
/// @author Carl Farterson (@carlfarterson)
/// @notice This contract tracks basic information about all meTokens
contract MeTokenRegistry is IMeTokenRegistry, Roles {

    IMeTokenFactory public meTokenFactory;
    IHub public hub;

    mapping (address => Details) private meTokens; // key pair: ERC20 address
    mapping (address => address) private owners;  // key: address of owner, value: address of meToken
    mapping (address => bool) private approvedCollateralAssets;

    constructor(address _meTokenFactory, address _hub) {
        meTokenFactory = IMeTokenFactory(_meTokenFactory);
        hub = IHub(_hub);
    }


    /// @inheritdoc IMeTokenRegistry
    function register(
        string calldata _name,
        string calldata _symbol,
        uint256 _hubId,
        uint256 _collateralDeposited
    ) external override {
        // TODO: access control
        require(!isOwner(msg.sender), "msg.sender already owns a meToken");
        HubDetails memory hubDetails = hub.getDetails[_hubId];
        
        require(hubDetails[(_hubId) != 0, "Hub inactive"); // TODO: validate

        // Initial collateral deposit from owner by finding the vault,
        // and then the collateral asset tied to that vault
        address vault = hub.getVault(_hubId);
        address collateralAsset = IVault(vault).getCollateralAsset();
        require(
            IERC20(collateralAsset).balanceOf(msg.sender) <= _collateralDeposited,
            "Collateral deposited cannot exceed balance"
        );

        // Create meToken erc20 contract
        address meTokenAddr = meTokenFactory.create(
            msg.sender, _name, _symbol
        );

        // Add meToken to registry
        meTokens[meTokenAddr] = Details({
            owner: msg.sender,
            id: _hubId,
            balancePooled: _collateralDeposited,
            balanceLocked: 0,
            resubscribing: false
        });

        // Register the address which created a meToken
        owners[msg.sender] = meTokenAddr;

        // Get curve information from hub
        ICurveValueSet curve = ICurveValueSet(hub.getCurve(_hubId));

        uint256 meTokensMinted = curve.calculateMintReturn(
            _collateralDeposited,  // _deposit_amount
            _hubId,                // _hubId
            0,                      // _supply
            0                       // _balancePooled
        );

        // Transfer collateral to vault and return the minted meToken
        if (_collateralDeposited > 0) {
            IERC20(collateralAsset).transferFrom(msg.sender, vault, _collateralDeposited);
            MeToken(meTokenAddr).mint(msg.sender, meTokensMinted);
        }

        emit Register(meTokenAddr, msg.sender, _name, _symbol, _hubId);
    }


    /// @inheritdoc IMeTokenRegistry
    function transferOwnership(address _meToken, address _newOwner) external override {
        require(!isOwner(_newOwner), "_newOwner already owns a meToken");
        Details storage details = meTokens[_meToken];
        require(msg.sender == details.owner, "!owner");

        details.owner = _newOwner;
        owners[msg.sender] = address(0);
        owners[_newOwner] = _meToken;

        emit TransferOwnership(msg.sender, _newOwner, _meToken);
    }


    /// @inheritdoc IMeTokenRegistry
    function incrementBalancePooled(bool add, address _meToken, uint256 _amount) external override {
        require(hasRole(FOUNDRY, msg.sender), "!foundry");
//        Details storage details = meTokens[_meToken];
        if (add) {
            meTokens[_meToken].balancePooled += _amount;
        } else {
            meTokens[_meToken].balancePooled -= _amount;
        }

        emit IncrementBalancePooled(add, _meToken, _amount);
    }


    /// @inheritdoc IMeTokenRegistry
    function incrementBalanceLocked(bool add, address _meToken, uint256 _amount) external override {
        require(hasRole(FOUNDRY, msg.sender), "!foundry");
//        Details storage details = meTokens[_meToken];
        if (add) {
            meTokens[_meToken].balanceLocked += _amount;
        } else {
            meTokens[_meToken].balanceLocked -= _amount;
        }

        emit IncrementBalanceLocked(add, _meToken, _amount);
    }


    /// @inheritdoc IMeTokenRegistry
    function isOwner(address _owner) public view override returns (bool) {
        return owners[_owner] != address(0);
    }


    /// @inheritdoc IMeTokenRegistry
    function getOwnerMeToken(address _owner) external view override returns (address) {
        return owners[_owner];
    }


    // @inheritdoc IMeTokenRegistry
    function getDetails(
        address _meToken
    ) external view override returns (
        Details memory details
    ) {
        details = meTokens[_meToken];
    }

    // TODO
    // function resubscribe(uint256 meTokenAddress) external onlyOwner(meTokenAddress) returns(bool) {}
}
