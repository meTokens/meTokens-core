// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {LibDiamond} from "../libs/LibDiamond.sol";
import {LibHub, HubInfo} from "../libs/LibHub.sol";
import {LibMeToken, MeTokenInfo} from "../libs/LibMeToken.sol";
import {MeToken} from "../MeToken.sol";
import {IMigration} from "../interfaces/IMigration.sol";
import {IMigrationRegistry} from "../interfaces/IMigrationRegistry.sol";
import {IMeTokenRegistry} from "../interfaces/IMeTokenRegistry.sol";
import {IMeTokenFactory} from "../interfaces/IMeTokenFactory.sol";
import {IHub} from "../interfaces/IHub.sol";
import {IVault} from "../interfaces/IVault.sol";
import {ICurve} from "../interfaces/ICurve.sol";
import {IMeToken} from "../interfaces/IMeToken.sol";
import {HubInfo, MeTokenInfo, Modifiers} from "../libs/Details.sol";

/// @title meToken registry
/// @author Carl Farterson (@carlfarterson)
/// @notice This contract tracks basic information about all meTokens
contract MeTokenRegistryFacet is Modifiers, ReentrancyGuard {
    event Subscribe(
        address indexed _meToken,
        address indexed _owner,
        uint256 _minted,
        address _asset,
        uint256 _assetsDeposited,
        string _name,
        string _symbol,
        uint256 _hubId
    );
    event InitResubscribe(
        address indexed _meToken,
        uint256 _targetHubId,
        address _migration,
        bytes _encodedMigrationArgs
    );
    event CancelResubscribe(address indexed _meToken);
    event FinishResubscribe(address indexed _meToken);
    event UpdateBalances(address _meToken, uint256 _newBalance);
    event TransferMeTokenOwnership(
        address _from,
        address _to,
        address _meToken
    );
    event CancelTransferMeTokenOwnership(address _from, address _meToken);
    event ClaimMeTokenOwnership(address _from, address _to, address _meToken);
    event UpdateBalancePooled(bool _add, address _meToken, uint256 _amount);
    event UpdateBalanceLocked(bool _add, address _meToken, uint256 _amount);

    constructor() {}

    function subscribe(
        string calldata _name,
        string calldata _symbol,
        uint256 _hubId,
        uint256 _assetsDeposited
    ) external nonReentrant {
        address sender = LibMeta.msgSender();
        require(!isOwner(sender), "msg.sender already owns a meToken");
        HubInfo memory hub_ = s.hubs[_hubId];
        require(hub_.active, "Hub inactive");
        require(!hub_.updating, "Hub updating");

        if (_assetsDeposited > 0) {
            require(
                IERC20(hub_.asset).transferFrom(
                    sender,
                    hub_.vault,
                    _assetsDeposited
                ),
                "transfer failed"
            );
        }
        // Create meToken erc20 contract
        address meTokenAddr = IMeTokenFactory(s.meTokenFactory).create(
            _name,
            _symbol,
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
            IMeToken(meTokenAddr).mint(sender, _meTokensMinted);
        }

        // Register the address which created a meToken
        s.meTokenOwners[sender] = meTokenAddr;

        // Add meToken to registry
        s.meTokens[meTokenAddr].owner = sender;
        s.meTokens[meTokenAddr].hubId = _hubId;
        s.meTokens[meTokenAddr].balancePooled = _assetsDeposited;

        emit Subscribe(
            meTokenAddr,
            sender,
            _meTokensMinted,
            hub_.asset,
            _assetsDeposited,
            _name,
            _symbol,
            _hubId
        );
    }

    function initResubscribe(
        address _meToken,
        uint256 _targetHubId,
        address _migration,
        bytes memory _encodedMigrationArgs
    ) external {
        address sender = LibMeta.msgSender();
        MeTokenInfo storage meToken_ = s.meTokens[_meToken];
        HubInfo memory hub_ = s.hubs[meToken_.hubId];
        HubInfo memory targetHub_ = s.hubs[_targetHubId];

        require(sender == meToken_.owner, "!owner");
        require(
            block.timestamp >= meToken_.endCooldown,
            "Cooldown not complete"
        );
        require(meToken_.hubId != _targetHubId, "same hub");
        require(targetHub_.active, "targetHub inactive");
        require(!hub_.updating, "hub updating");
        require(!targetHub_.updating, "targetHub updating");

        require(_migration != address(0), "migration address(0)");

        // Ensure the migration we're using is approved
        require(
            s.migrationRegistry.isApproved(
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

        IMigration(_migration).initMigration(_meToken, _encodedMigrationArgs);

        emit InitResubscribe(
            _meToken,
            _targetHubId,
            _migration,
            _encodedMigrationArgs
        );
    }

    function finishResubscribe(address _meToken)
        external
        returns (MeTokenInfo memory)
    {
        return LibMeToken.finishResubscribe(_meToken);
    }

    function cancelResubscribe(address _meToken) external {
        address sender = LibMeta.msgSender();
        MeTokenInfo storage meToken_ = s.meTokens[_meToken];
        require(sender == meToken_.owner, "!owner");
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

    function updateBalances(address _meToken, uint256 _newBalance) external {
        MeTokenInfo storage meToken_ = s.meTokens[_meToken];
        address sender = LibMeta.msgSender();
        require(sender == meToken_.migration, "!migration");
        uint256 balancePooled = meToken_.balancePooled;
        uint256 balanceLocked = meToken_.balanceLocked;
        uint256 oldBalance = balancePooled + balanceLocked;
        uint256 p = s.PRECISION;

        meToken_.balancePooled =
            (balancePooled * p * _newBalance) /
            (oldBalance * p);
        meToken_.balanceLocked =
            (balanceLocked * p * _newBalance) /
            (oldBalance * p);

        emit UpdateBalances(_meToken, _newBalance);
    }

    function transferMeTokenOwnership(address _newOwner) external {
        address sender = LibMeta.msgSender();
        require(
            s.pendingMeTokenOwners[sender] == address(0),
            "transfer ownership already pending"
        );
        require(!isOwner(_newOwner), "_newOwner already owns a meToken");
        require(_newOwner != address(0), "Cannot transfer to 0 address");
        address meToken_ = s.meTokenOwners[sender];
        require(meToken_ != address(0), "meToken does not exist");
        s.pendingMeTokenOwners[sender] = _newOwner;

        emit TransferMeTokenOwnership(sender, _newOwner, meToken_);
    }

    function cancelTransferMeTokenOwnership() external {
        address sender = LibMeta.msgSender();
        address _meToken = s.meTokenOwners[sender];
        require(_meToken != address(0), "meToken does not exist");

        require(
            s.pendingMeTokenOwners[sender] != address(0),
            "transferMeTokenOwnership() not initiated"
        );

        delete s.pendingMeTokenOwners[sender];
        emit CancelTransferMeTokenOwnership(sender, _meToken);
    }

    function claimMeTokenOwnership(address _oldOwner) external {
        address sender = LibMeta.msgSender();
        require(!isOwner(sender), "Already owns a meToken");
        require(sender == s.pendingMeTokenOwners[_oldOwner], "!_pendingOwner");

        address _meToken = s.meTokenOwners[_oldOwner];

        s.meTokens[_meToken].owner = sender;
        s.meTokenOwners[sender] = _meToken;

        delete s.meTokenOwners[_oldOwner];
        delete s.pendingMeTokenOwners[_oldOwner];

        emit ClaimMeTokenOwnership(_oldOwner, sender, _meToken);
    }

    function setMeTokenWarmup(uint256 _warmup)
        external
        onlyDurationsController
    {
        require(_warmup != s.meTokenWarmup, "same warmup");
        require(_warmup + s.meTokenDuration < s.hubWarmup, "too long");
        s.meTokenWarmup = _warmup;
    }

    function setMeTokenDuration(uint256 _duration)
        external
        onlyDurationsController
    {
        require(_duration != s.meTokenDuration, "same duration");
        require(s.meTokenWarmup + _duration < s.hubWarmup, "too long");
        s.meTokenDuration = _duration;
    }

    function setMeTokenCooldown(uint256 _cooldown)
        external
        onlyDurationsController
    {
        require(_cooldown != s.meTokenCooldown, "same cooldown");
        s.meTokenCooldown = _cooldown;
    }

    function meTokenWarmup() external view returns (uint256) {
        return LibMeToken.warmup();
    }

    function meTokenDuration() external view returns (uint256) {
        return LibMeToken.duration();
    }

    function meTokenCooldown() external view returns (uint256) {
        return LibMeToken.cooldown();
    }

    function getOwnerMeToken(address _owner) external view returns (address) {
        return s.meTokenOwners[_owner];
    }

    function getPendingOwner(address _oldOwner)
        external
        view
        returns (address)
    {
        return s.pendingMeTokenOwners[_oldOwner];
    }

    function getMeTokenDetails(address _meToken)
        external
        view
        returns (MeTokenInfo memory)
    {
        return LibMeToken.getMeToken(_meToken);
    }

    function isOwner(address _owner) public view returns (bool) {
        return s.meTokenOwners[_owner] != address(0);
    }
}
