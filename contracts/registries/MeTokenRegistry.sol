// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../interfaces/IMeTokenRegistry.sol";
import "../MeToken.sol";
import "../interfaces/IMeTokenFactory.sol";
import "../interfaces/IHub.sol";
import "../interfaces/IVault.sol";
import "../interfaces/ICurveValueSet.sol";

/// @title meToken registry
/// @author Carl Farterson (@carlfarterson)
/// @notice This contract tracks basic information about all meTokens
abstract contract MeTokenRegistry is IMeTokenRegistry {

    event RegisterMeToken(
        address indexed meToken,
        address indexed owner,
        string name,
        string symbol,
        uint256 hubId
    );
    event TransferMeTokenOwnership(address from, address to, address meToken);
    event IncrementBalancePooled(bool add, address meToken, uint256 amount);
    event IncrementBalanceLocked(bool add, address meToken, uint256 amount);

    IMeTokenFactory public meTokenFactory;
    IHub public hub;

    mapping (address => MeTokenDetails) private meTokens; // key pair: ERC20 address
    mapping (address => address) private meTokenOwners;  // key: address of owner, value: address of meToken
    mapping (address => bool) private approvedCollateralAssets;

    struct MeTokenDetails {
        address owner;
        uint256 hubId;
		uint256 balancePooled;
		uint256 balanceLocked;
        bool resubscribing; // TODO: validate
	}

    constructor(address _meTokenFactory, address _hub) {
        meTokenFactory = IMeTokenFactory(_meTokenFactory);
        hub = IHub(_hub);
    }

    /// @inheritdoc IMeTokenRegistry
    function registerMeToken(
        string calldata _name,
        string calldata _symbol,
        uint256 _hubId,
        uint256 _collateralDeposited
    ) external override {
        // TODO: access control
        require(!isMeTokenOwner(msg.sender), "msg.sender already owns a meToken");        
        require(hub.getStatus(_hubId) != 0, "Hub inactive"); // TODO: validate
        
        // Initial collateral deposit from owner by finding the vault,
        // and then the collateral asset tied to that vault
        address vault = hub.getVault(_hubId);
        address collateralAsset = IVault(vault).getCollateralAsset();
        require(
            IERC20(collateralAsset).balanceOf(msg.sender) <= _collateralDeposited,
            "Collateral deposited cannot exceed balance"
        );

        // Create meToken erc20 contract
        address meTokenAddr = meTokenFactory.createMeToken(
            msg.sender, _name, _symbol
        );

        // Add meToken to registry
        meTokens[meTokenAddr] = MeTokenDetails({
            owner: msg.sender,
            hubId: _hubId,
            balancePooled: _collateralDeposited,
            balanceLocked: 0,
            resubscribing: false            
        });

        // Register the address which created a meToken
        meTokenOwners[msg.sender] = meTokenAddr;

        // Get curve information from hub
        ICurveValueSet curve = ICurveValueSet(hub.getCurve(_hubId));

        uint256 meTokensMinted = curve.calculateMintReturn(
            _collateralDeposited,  // _deposit_amount
            _hubId,                // _hubId
            0,                      // _supply
            0,                      // _balancePooled
            false,
            0,
            0
        );

        // Transfer collateral to vault and return the minted meToken
        IERC20(collateralAsset).transferFrom(msg.sender, vault, _collateralDeposited);
        MeToken(meTokenAddr).mint(msg.sender, meTokensMinted);

        emit RegisterMeToken(meTokenAddr, msg.sender, _name, _symbol, _hubId);
    }


    /// @inheritdoc IMeTokenRegistry
    function transferMeTokenOwnership(address _meToken, address _newOwner) external override {
        require(!isMeTokenOwner(_newOwner), "_newOwner already owns a meToken");
        MeTokenDetails storage meTokenDetails = meTokens[_meToken];
        require(msg.sender == meTokenDetails.owner, "!owner");

        meTokenDetails.owner = _newOwner;
        meTokenOwners[msg.sender] = address(0);
        meTokenOwners[_newOwner] = _meToken;

        emit TransferMeTokenOwnership(msg.sender, _newOwner, _meToken);
    }


    /// @inheritdoc IMeTokenRegistry
    function incrementBalancePooled(bool add, address _meToken, uint256 _amount) external override {
        MeTokenDetails storage meTokenDetails = meTokens[_meToken];
        if (add) {
            meTokenDetails.balancePooled += _amount;
        } else {
            meTokenDetails.balancePooled -= _amount;
        }
        
        emit IncrementBalancePooled(add, _meToken, _amount);
    }


    /// @inheritdoc IMeTokenRegistry
    function incrementBalanceLocked(bool add, address _meToken, uint256 _amount) external override {
        MeTokenDetails storage meTokenDetails = meTokens[_meToken];
        if (add) {
            meTokenDetails.balanceLocked += _amount;
        } else {
            meTokenDetails.balanceLocked -= _amount;
        }
        
        emit IncrementBalanceLocked(add, _meToken, _amount);
    }


    /// @inheritdoc IMeTokenRegistry
    function isMeTokenOwner(address _owner) public view override returns (bool) {
        return meTokenOwners[_owner] != address(0);
    }


    /// @inheritdoc IMeTokenRegistry
    function getMeTokenByOwner(address _owner) external view override returns (address) {
        return meTokenOwners[_owner];
    }


    // @inheritdoc IMeTokenRegistry
    function getDetails(
        address _meToken
    ) external view override returns (
        address owner,
        uint256 hubId,
        uint256 balancePooled,
        uint256 balanceLocked,
        bool resubscribing
    ) {
        MeTokenDetails memory meTokenDetails = meTokens[_meToken];
        owner = meTokenDetails.owner;
        hubId = meTokenDetails.hubId;
        balancePooled = meTokenDetails.balancePooled;
        balanceLocked = meTokenDetails.balanceLocked;
        resubscribing = meTokenDetails.resubscribing;
    }

    // TODO
    // function resubscribe(uint256 meTokenAddress) external onlyOwner(meTokenAddress) returns(bool) {}
}