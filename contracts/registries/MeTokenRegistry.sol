// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../MeToken.sol";
import "../Roles.sol";

import "../interfaces/IMigrationRegistry.sol";
import "../interfaces/IMigrationFactory.sol";
import "../interfaces/IMeTokenRegistry.sol";
import "../interfaces/IMeTokenFactory.sol";
import "../interfaces/IHub.sol";
import "../interfaces/IVault.sol";
import "../interfaces/ICurve.sol";
import "../interfaces/IMeToken.sol";

import "../libs/Details.sol";

/// @title meToken registry
/// @author Carl Farterson (@carlfarterson)
/// @notice This contract tracks basic information about all meTokens
contract MeTokenRegistry is IMeTokenRegistry, Roles {
    uint256 public constant PRECISION = 10**18;
    IHub public hub;
    IMeTokenFactory public meTokenFactory;
    IMigrationRegistry public migrationRegistry;

    mapping(address => Details.MeToken) private _meTokens; // key pair: ERC20 address
    mapping(address => address) private _owners; // key: address of owner, value: address of meToken

    constructor(
        IHub _hub,
        IMeTokenFactory _meTokenFactory,
        IMigrationRegistry _migrationRegistry
    ) {
        hub = _hub;
        meTokenFactory = _meTokenFactory;
        migrationRegistry = _migrationRegistry;
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
        Details.Hub memory hub_ = hub.getDetails(_hubId);
        require(hub_.active, "Hub inactive");

        // Initial collateral deposit from owner by finding the vault,
        // and then the collateral asset tied to that vault
        address token = IVault(hub_.vault).getToken();
        if (_tokensDeposited > 0) {
            require(
                IERC20(token).transferFrom(
                    msg.sender,
                    hub_.vault,
                    _tokensDeposited
                ),
                "transfer failed"
            );
        }

        // Create meToken erc20 contract
        address meTokenAddr = meTokenFactory.create(_name, _symbol);

        // Transfer collateral to vault and return the minted meToken
        if (_tokensDeposited > 0) {
            uint256 _meTokensMinted = ICurve(hub_.curve).calculateMintReturn(
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
        Details.MeToken storage meToken_ = _meTokens[meTokenAddr];
        meToken_.owner = msg.sender;
        meToken_.hubId = _hubId;
        meToken_.balancePooled = _tokensDeposited;

        emit Register(meTokenAddr, msg.sender, _name, _symbol, _hubId);
    }

    function resubscribe(
        address _meToken,
        uint256 _targetHub,
        uint256 _startTime,
        uint256 _endTime,
        address _migrationOwner,
        address _migrationFactory
    ) external {
        require(_startTime > block.timestamp && _startTime < _endTime);

        Details.MeToken storage meToken_ = _meTokens[_meToken];
        Details.Hub memory hub_ = hub.getDetails(meToken_.hubId);
        Details.Hub memory targetHub_ = hub.getDetails(_targetHub);

        require(msg.sender == meToken_.owner, "!owner");
        require(!meToken_.resubscribing, "Already resubscribing");
        require(meToken_.hubId != _targetHub, "same hub");
        require(hub_.active, "hub inactive");

        // First make sure meToken has been updated to the most recent hub.vaultRatio
        if (meToken_.positionOfLastRatio < hub_.vaultMultipliers.length) {
            updateBalances(_meToken);
        }

        // Ensure the migration factory we're using is approved
        require(
            migrationRegistry.isApproved(address(_migrationFactory)),
            "!approved"
        );

        address migration = IMigrationFactory(_migrationFactory).create(
            meToken_.hubId, // hub id
            _migrationOwner, // owner
            hub_.vault, // initial Vault
            targetHub_.vault // target vault
        );

        meToken_.resubscribing = true;
        meToken_.startTime = _startTime;
        meToken_.endTime = _endTime;
        meToken_.targetHub = _targetHub;
        meToken_.migration = migration;
    }

    /// @inheritdoc IMeTokenRegistry
    function transferOwnership(address _meToken, address _newOwner)
        external
        override
    {
        require(!isOwner(_newOwner), "_newOwner already owns a meToken");
        Details.MeToken storage meToken_ = _meTokens[_meToken];
        require(msg.sender == meToken_.owner, "!owner");

        meToken_.owner = _newOwner;
        _owners[msg.sender] = address(0);
        _owners[_newOwner] = _meToken;

        emit TransferOwnership(msg.sender, _newOwner, _meToken);
    }

    function updateBalances(address _meToken) public override {
        // require(hasRole(FOUNDRY, msg.sender), "!foundry");
        Details.MeToken storage meToken_ = _meTokens[_meToken];
        Details.Hub memory hub_ = hub.getDetails(meToken_.hubId);

        for (
            uint256 i = meToken_.positionOfLastRatio;
            i < hub_.vaultMultipliers.length;
            i++
        ) {
            uint256 multiplier = hub_.vaultMultipliers[i] * PRECISION;

            // Update balancePooled and balanceLocked based on the
            // multiplier from the vaultRatio
            meToken_.balancePooled *= multiplier / PRECISION;
            meToken_.balanceLocked *= multiplier / PRECISION;
        }
        meToken_.positionOfLastRatio = hub_.vaultMultipliers.length;
    }

    /// @inheritdoc IMeTokenRegistry
    function incrementBalancePooled(
        bool add,
        address _meToken,
        uint256 _amount
    ) external override {
        require(hasRole(FOUNDRY, msg.sender), "!foundry");
        Details.MeToken storage meToken_ = _meTokens[_meToken];
        if (add) {
            meToken_.balancePooled += _amount;
        } else {
            meToken_.balancePooled -= _amount;
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
        Details.MeToken storage meToken_ = _meTokens[_meToken];
        if (add) {
            meToken_.balanceLocked += _amount;
        } else {
            meToken_.balanceLocked -= _amount;
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
        returns (Details.MeToken memory meToken_)
    {
        meToken_ = _meTokens[_meToken];
    }

    /// @inheritdoc IMeTokenRegistry
    function isOwner(address _owner) public view override returns (bool) {
        return _owners[_owner] != address(0);
    }

    // TODO
    // function resubscribe(address _meToken) {}
}
