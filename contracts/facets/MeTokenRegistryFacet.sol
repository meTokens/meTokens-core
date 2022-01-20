// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {LibDiamond} from "../libs/LibDiamond.sol";
import {LibHub, HubInfo} from "../libs/LibHub.sol";
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
contract MeTokenRegistryFacet is Ownable, IMeTokenRegistry {
    uint256 public constant PRECISION = 10**18;

    address public foundry;
    IHub public hub;
    IMeTokenFactory public meTokenFactory;
    IMigrationRegistry public migrationRegistry;

    AppStorage internal s; // solhint-disable-line

    /// @dev key: address of meToken, value: meToken Details struct
    mapping(address => Details.MeToken) private _meTokens;
    /// @dev key: address of meToken owner, value: address of meToken
    mapping(address => address) private _owners;
    /// @dev key: address of meToken owner, value: address to transfer meToken ownership to
    mapping(address => address) private _pendingOwners;

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
        address meTokenAddr = meTokenFactory.create(
            _name,
            _symbol,
            foundry,
            address(this)
        );

        // Mint meToken to user
        uint256 _meTokensMinted;
        if (_assetsDeposited > 0) {
            _meTokensMinted = ICurve(hub_.curve).viewMeTokensMinted(
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

        emit Subscribe(
            meTokenAddr,
            msg.sender,
            _meTokensMinted,
            hub_.asset,
            _assetsDeposited,
            _name,
            _symbol,
            _hubId
        );
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
        require(targetHub_.active, "targetHub inactive");
        require(!hub_.updating, "hub updating");
        require(!targetHub_.updating, "targetHub updating");

        // TODO: what if asset is same?  Is a migration vault needed since it'll start/end
        // at the same and not change to a different asset?
        require(hub_.asset != targetHub_.asset, "asset same");
        require(_migration != address(0), "migration address(0)");

        // Ensure the migration we're using is approved
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
        IMigration(_migration).initMigration(_meToken, _encodedMigrationArgs);

        meToken_.startTime = block.timestamp + s.meTokenWarmup;
        meToken_.endTime =
            block.timestamp +
            s.meTokenWarmup +
            s.meTokenDuration;
        meToken_.endCooldown =
            block.timestamp +
            s.meTokenWarmup +
            s.meTokenDuration +
            s.meTokenCooldown;
        meToken_.targetHubId = _targetHubId;
        meToken_.migration = _migration;

        emit InitResubscribe(
            _meToken,
            _targetHubId,
            _migration,
            _encodedMigrationArgs
        );
    }

    function cancelResubscribe(address _meToken) external override {
        Details.MeToken storage meToken_ = _meTokens[_meToken];
        require(msg.sender == meToken_.owner, "!owner");
        require(meToken_.targetHubId != 0, "!resubscribing");
        require(
            block.timestamp < meToken_.startTime,
            "Resubscription has started"
        );

        meToken_.startTime = 0;
        meToken_.endTime = 0;
        meToken_.targetHubId = 0;
        meToken_.migration = address(0);

        emit CancelResubscribe(_meToken);
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

        meToken_.balancePooled =
            (meToken_.balancePooled * (s.PRECISION * _newBalance)) /
            (oldBalance * s.PRECISION);
        meToken_.balanceLocked =
            (meToken_.balanceLocked * s.PRECISION * _newBalance) /
            (oldBalance * s.PRECISION);

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
        require(
            _pendingOwners[msg.sender] == address(0),
            "transfer ownership already pending"
        );
        require(!isOwner(_newOwner), "_newOwner already owns a meToken");
        require(_newOwner != address(0), "Cannot transfer to 0 address");
        address meToken_ = _owners[msg.sender];
        require(meToken_ != address(0), "meToken does not exist");
        _pendingOwners[msg.sender] = _newOwner;

        emit TransferMeTokenOwnership(msg.sender, _newOwner, meToken_);
    }

    /// @inheritdoc IMeTokenRegistry
    function cancelTransferMeTokenOwnership() external override {
        address _meToken = _owners[msg.sender];
        require(_meToken != address(0), "meToken does not exist");

        require(
            _pendingOwners[msg.sender] != address(0),
            "transferMeTokenOwnership() not initiated"
        );

        delete _pendingOwners[msg.sender];
        emit CancelTransferMeTokenOwnership(msg.sender, _meToken);
    }

    /// @inheritdoc IMeTokenRegistry
    function claimMeTokenOwnership(address _oldOwner) external override {
        require(!isOwner(msg.sender), "Already owns a meToken");
        require(msg.sender == _pendingOwners[_oldOwner], "!_pendingOwner");

        address _meToken = _owners[_oldOwner];
        Details.MeToken storage meToken_ = _meTokens[_meToken];

        meToken_.owner = msg.sender;
        _owners[msg.sender] = _meToken;

        delete _owners[_oldOwner];
        delete _pendingOwners[_oldOwner];

        emit ClaimMeTokenOwnership(_oldOwner, msg.sender, _meToken);
    }

    function setWarmup(uint256 _warmup) external onlyOwner {
        require(_warmup != s.hubWarmup, "_warmup == s.hubWarmup");
        s.hubWarmup = _warmup;
    }

    function setDuration(uint256 _duration) external onlyOwner {
        require(_duration != s.hubDuration, "_duration == s.hubDuration");
        s.hubDuration = _duration;
    }

    function setCooldown(uint256 _cooldown) external onlyOwner {
        require(_cooldown != s.hubCooldown, "_cooldown == s.hubCooldown");
        s.hubCooldown = _cooldown;
    }

    function count() external view returns (uint256) {
        return s.hubCount;
    }

    function warmup() external view returns (uint256) {
        return s.hubWarmup;
    }

    function duration() external view returns (uint256) {
        return s.hubDuration;
    }

    function cooldown() external view returns (uint256) {
        return s.hubCooldown;
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
    function getPendingOwner(address _oldOwner)
        external
        view
        override
        returns (address)
    {
        return _pendingOwners[_oldOwner];
    }

    function getDetails(address _meToken)
        external
        view
        override
        returns (Details.MeToken memory)
    {
        return _meTokens[_meToken];
    }

    /// @inheritdoc IMeTokenRegistry
    function isOwner(address _owner) public view override returns (bool) {
        return _owners[_owner] != address(0);
    }
}
