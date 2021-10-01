// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../MeToken.sol";
import "../Roles.sol";

import "../interfaces/IMeTokenRegistry.sol";
import "../interfaces/IMeTokenFactory.sol";
import "../interfaces/IHub.sol";
import "../interfaces/IVault.sol";
import "../interfaces/ICurve.sol";
import "../interfaces/IMeToken.sol";

import "../libs/Details.sol";
import "hardhat/console.sol";

/// @title meToken registry
/// @author Carl Farterson (@carlfarterson)
/// @notice This contract tracks basic information about all meTokens
contract MeTokenRegistry is IMeTokenRegistry, Roles {
    IHub public hub;
    IMeTokenFactory public meTokenFactory;

    mapping(address => Details.MeTokenDetails) private _meTokens; // key pair: ERC20 address
    mapping(address => address) private _owners; // key: address of owner, value: address of meToken

    constructor(address _hub, address _meTokenFactory) {
        hub = IHub(_hub);
        meTokenFactory = IMeTokenFactory(_meTokenFactory);
    }

    /// @inheritdoc IMeTokenRegistry
    function register(
        string calldata _name,
        string calldata _symbol,
        uint256 _hubId,
        uint256 _tokensDeposited
    ) external override {
        // TODO: access control
        require(!isOwner(msg.sender), "msg.sender already owns a meToken");
        Details.HubDetails memory hubDetails = hub.getDetails(_hubId);
        require(hubDetails.active, "Hub inactive");

        // Initial collateral deposit from owner by finding the vault,
        // and then the collateral asset tied to that vault
        address token = IVault(hubDetails.vault).getToken();
        console.log("### token:%s", token);
        if (_tokensDeposited > 0) {
            console.log(
                "### msg.sender:%s hubDetails.vault:%s _tokensDeposited:%s",
                msg.sender,
                hubDetails.vault,
                _tokensDeposited
            );
            require(
                IERC20(token).transferFrom(
                    msg.sender,
                    hubDetails.vault,
                    _tokensDeposited
                ),
                "transfer failed"
            );
        }

        // Create meToken erc20 contract
        address meTokenAddr = meTokenFactory.create(_name, _symbol);

        // Transfer collateral to vault and return the minted meToken
        if (_tokensDeposited > 0) {
            uint256 _meTokensMinted = ICurve(hubDetails.curve)
                .calculateMintReturn(
                    _tokensDeposited, // _deposit_amount
                    _hubId, // _hubId
                    0, // _supply
                    0 // _balancePooled
                );
            IMeToken(meTokenAddr).mint(msg.sender, _meTokensMinted);
        }

        // Register the address which created a meToken
        _owners[msg.sender] = meTokenAddr;

        // Add meToken to registry
        Details.MeTokenDetails storage newMeTokenDetails = _meTokens[
            meTokenAddr
        ];
        newMeTokenDetails.owner = msg.sender;
        newMeTokenDetails.hubId = _hubId;
        newMeTokenDetails.balancePooled = _tokensDeposited;

        emit Register(meTokenAddr, msg.sender, _name, _symbol, _hubId);
    }

    /// @inheritdoc IMeTokenRegistry
    function transferOwnership(address _meToken, address _newOwner)
        external
        override
    {
        require(!isOwner(_newOwner), "_newOwner already owns a meToken");
        Details.MeTokenDetails storage meTokenDetails = _meTokens[_meToken];
        require(msg.sender == meTokenDetails.owner, "!owner");

        meTokenDetails.owner = _newOwner;
        _owners[msg.sender] = address(0);
        _owners[_newOwner] = _meToken;

        emit TransferOwnership(msg.sender, _newOwner, _meToken);
    }

    /// @inheritdoc IMeTokenRegistry
    function incrementBalancePooled(
        bool add,
        address _meToken,
        uint256 _amount
    ) external override {
        require(hasRole(FOUNDRY, msg.sender), "!foundry");
        Details.MeTokenDetails storage meTokenDetails = _meTokens[_meToken];
        if (add) {
            meTokenDetails.balancePooled += _amount;
        } else {
            meTokenDetails.balancePooled -= _amount;
        }

        emit IncrementBalancePooled(add, _meToken, _amount);
    }

    /// @inheritdoc IMeTokenRegistry
    function incrementBalanceLocked(
        bool add,
        address _meToken,
        uint256 _amount
    ) external override {
        require(hasRole(FOUNDRY, msg.sender), "!foundry");
        Details.MeTokenDetails storage meTokenDetails = _meTokens[_meToken];
        if (add) {
            meTokenDetails.balanceLocked += _amount;
        } else {
            meTokenDetails.balanceLocked -= _amount;
        }

        emit IncrementBalanceLocked(add, _meToken, _amount);
    }

    /// @inheritdoc IMeTokenRegistry
    function getOwnerMeToken(address _owner)
        external
        view
        override
        returns (address)
    {
        return _owners[_owner];
    }

    // @inheritdoc IMeTokenRegistry
    function getDetails(address _meToken)
        external
        view
        override
        returns (Details.MeTokenDetails memory meTokenDetails)
    {
        meTokenDetails = _meTokens[_meToken];
    }

    /// @inheritdoc IMeTokenRegistry
    function isOwner(address _owner) public view override returns (bool) {
        return _owners[_owner] != address(0);
    }

    // TODO
    // function resubscribe(address _meToken) {}
}
