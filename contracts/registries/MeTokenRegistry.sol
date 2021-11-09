// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

import "../MeToken.sol";

import "../interfaces/IMigration.sol";
import "../interfaces/IMigrationRegistry.sol";
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
contract MeTokenRegistry is Ownable, IMeTokenRegistry {
    uint256 public constant PRECISION = 10**18;
    uint256 private _warmup;
    uint256 private _duration;
    uint256 private _cooldown;

    address public foundry;
    IHub public hub;
    IMeTokenFactory public meTokenFactory;
    IMigrationRegistry public migrationRegistry;

    mapping(address => Details.MeToken) private _meTokens; // key pair: ERC20 address
    mapping(address => address) private _owners; // key: address of owner, value: address of meToken

    constructor(
        address _foundry,
        IHub _hub,
        IMeTokenFactory _meTokenFactory,
        IMigrationRegistry _migrationRegistry
    ) {
        foundry = _foundry;
        hub = _hub;
        meTokenFactory = _meTokenFactory;
        migrationRegistry = _migrationRegistry;
    }

    /// @inheritdoc IMeTokenRegistry
    function subscribe(
        string calldata _name,
        string calldata _symbol,
        uint256 _hubId,
        uint256 _assetsDeposited
    ) external override {
        // TODO: access control
        require(!isOwner(msg.sender), "msg.sender already owns a meToken");
        Details.Hub memory hub_ = hub.getDetails(_hubId);
        require(hub_.active, "Hub inactive");
        require(!hub_.updating, "Hub updating");

        if (_assetsDeposited > 0) {
            require(
                IERC20(hub_.asset).transferFrom(
                    msg.sender,
                    hub_.vault,
                    _assetsDeposited
                ),
                "transfer failed"
            );
        }

        // Create meToken erc20 contract
        address meTokenAddr = meTokenFactory.create(_name, _symbol);

        // Mint meToken to user
        if (_assetsDeposited > 0) {
            uint256 _meTokensMinted = ICurve(hub_.curve).calculateMintReturn(
                _assetsDeposited, // _deposit_amount
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
        meToken_.balancePooled = _assetsDeposited;

        emit Subscribe(meTokenAddr, msg.sender, _name, _symbol, _hubId);
    }

    /// @inheritdoc IMeTokenRegistry
    function initResubscribe(
        address _meToken,
        uint256 _targetHubId,
        address _migration,
        bytes memory _encodedMigrationArgs
    ) external override {
        Details.MeToken storage meToken_ = _meTokens[_meToken];
        Details.Hub memory hub_ = hub.getDetails(meToken_.hubId);
        Details.Hub memory targetHub_ = hub.getDetails(_targetHubId);

        require(msg.sender == meToken_.owner, "!owner");
        require(
            block.timestamp >= meToken_.endCooldown,
            "Cooldown not complete"
        );
        require(meToken_.hubId != _targetHubId, "same hub");
        require(hub_.active, "hub inactive");
        require(targetHub_.active, "targetHub inactive");
        require(!hub_.updating, "hub updating");
        require(!targetHub_.updating, "targetHub updating");

        // Ensure the migration we're using is approved
        if (hub_.asset != targetHub_.asset || _migration != address(0)) {
            require(
                migrationRegistry.isApproved(
                    hub_.vault,
                    targetHub_.vault,
                    _migration
                ),
                "!approved"
            );
            require(
                IVault(_migration).isValid(_meToken, _encodedMigrationArgs),
                "Invalid _encodedMigrationArgs"
            );
            IMigration(_migration).initMigration(
                _meToken,
                _encodedMigrationArgs
            );
        }

        meToken_.startTime = block.timestamp + _warmup;
        meToken_.endTime = block.timestamp + _warmup + _duration;
        meToken_.endCooldown =
            block.timestamp +
            _warmup +
            _duration +
            _cooldown;
        meToken_.targetHubId = _targetHubId;
        meToken_.migration = _migration;

        emit InitResubscribe(
            _meToken,
            _targetHubId,
            _migration,
            _encodedMigrationArgs
        );
    }

    /// @inheritdoc IMeTokenRegistry
    function finishResubscribe(address _meToken)
        external
        override
        returns (Details.MeToken memory)
    {
        Details.MeToken storage meToken_ = _meTokens[_meToken];

        require(meToken_.targetHubId != 0, "No targetHubId");
        require(
            block.timestamp > meToken_.endTime,
            "block.timestamp < endTime"
        );
        // Update balancePooled / balanceLocked
        // solhint-disable-next-line
        uint256 newBalance = IMigration(meToken_.migration).finishMigration(
            _meToken
        );

        // Finish updating metoken details
        meToken_.startTime = 0;
        meToken_.endTime = 0;
        meToken_.hubId = meToken_.targetHubId;
        meToken_.targetHubId = 0;
        meToken_.migration = address(0);

        emit FinishResubscribe(_meToken);
        return meToken_;
    }

    /// @inheritdoc IMeTokenRegistry
    function updateBalances(address _meToken, uint256 _newBalance)
        external
        override
    {
        Details.MeToken storage meToken_ = _meTokens[_meToken];
        require(msg.sender == meToken_.migration, "!migration");

        uint256 oldBalance = meToken_.balancePooled + meToken_.balanceLocked;
        meToken_.balancePooled *=
            (PRECISION * _newBalance) /
            oldBalance /
            PRECISION;
        meToken_.balanceLocked *=
            (PRECISION * _newBalance) /
            oldBalance /
            PRECISION;

        emit UpdateBalances(_meToken, _newBalance);
    }

    /// @inheritdoc IMeTokenRegistry
    function updateBalancePooled(
        bool add,
        address _meToken,
        uint256 _amount
    ) external override {
        require(msg.sender == foundry, "!foundry");
        Details.MeToken storage meToken_ = _meTokens[_meToken];
        if (add) {
            meToken_.balancePooled += _amount;
        } else {
            meToken_.balancePooled -= _amount;
        }

        emit UpdateBalancePooled(add, _meToken, _amount);
    }

    /// @inheritdoc IMeTokenRegistry
    function updateBalanceLocked(
        bool add,
        address _meToken,
        uint256 _amount
    ) external override {
        require(msg.sender == foundry, "!foundry");
        Details.MeToken storage meToken_ = _meTokens[_meToken];

        if (add) {
            meToken_.balanceLocked += _amount;
        } else {
            meToken_.balanceLocked -= _amount;
        }

        emit UpdateBalanceLocked(add, _meToken, _amount);
    }

    /// @inheritdoc IMeTokenRegistry
    function transferMeTokenOwnership(address _newOwner) external override {
        require(!isOwner(_newOwner), "_newOwner already owns a meToken");

        // TODO: what happens if multiple people want to revoke ownership to 0 address?
        address _meToken = _owners[msg.sender];

        require(_meToken != address(0), "!meToken");
        Details.MeToken storage meToken_ = _meTokens[_meToken];
        meToken_.owner = _newOwner;
        _owners[msg.sender] = address(0);
        _owners[_newOwner] = _meToken;

        emit TransferMeTokenOwnership(msg.sender, _newOwner, _meToken);
    }

    function setWarmup(uint256 warmup_) external onlyOwner {
        require(warmup_ != _warmup, "warmup_ == _warmup");
        require(warmup_ + _duration < hub.getWarmup(), "too long");
        _warmup = warmup_;
    }

    function setDuration(uint256 duration_) external onlyOwner {
        require(duration_ != _duration, "duration_ == _duration");
        require(duration_ + _warmup < hub.getWarmup(), "too long");
        _duration = duration_;
    }

    function setCooldown(uint256 cooldown_) external onlyOwner {
        require(cooldown_ != _cooldown, "cooldown_ == _cooldown");
        _cooldown = cooldown_;
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

    /// @inheritdoc IMeTokenRegistry
    function getDetails(address _meToken)
        external
        view
        override
        returns (Details.MeToken memory meToken_)
    {
        meToken_ = _meTokens[_meToken];
    }

    function getWarmup() external view returns (uint256) {
        return _warmup;
    }

    function getDuration() external view returns (uint256) {
        return _duration;
    }

    function getCooldown() external view returns (uint256) {
        return _cooldown;
    }

    /// @inheritdoc IMeTokenRegistry
    function isOwner(address _owner) public view override returns (bool) {
        return _owners[_owner] != address(0);
    }
}
