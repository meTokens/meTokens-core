// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
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

import "../libs/Details.sol";

/// @title meToken registry
/// @author Carl Farterson (@carlfarterson)
/// @notice This contract tracks basic information about all meTokens
contract MeTokenRegistryFacet is Modifiers {
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
    ) external {
        require(!isOwner(msg.sender), "msg.sender already owns a meToken");
        Details.Hub memory hub_ = s.hubs[_hubId];
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
            IMeToken(meTokenAddr).mint(msg.sender, _meTokensMinted);
        }

        // Register the address which created a meToken
        s.meTokenOwners[msg.sender] = meTokenAddr;

        // Add meToken to registry
        Details.MeToken storage meToken_ = s.meTokens[meTokenAddr];
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

    function initResubscribe(
        address _meToken,
        uint256 _targetHubId,
        address _migration,
        bytes memory _encodedMigrationArgs
    ) external {
        Details.MeToken storage meToken_ = s.meTokens[_meToken];
        Details.Hub memory hub_ = s.hubs[meToken_.hubId];
        Details.Hub memory targetHub_ = s.hubs[_targetHubId];

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

    function finishResubscribe(address _meToken)
        external
        returns (Details.MeToken memory)
    {
        return LibMeToken.finishResubscribe(_meToken);
    }

    function cancelResubscribe(address _meToken) external {
        Details.MeToken storage meToken_ = s.meTokens[_meToken];
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

    function updateBalancePooled(
        bool add,
        address _meToken,
        uint256 _amount
    ) external {
        return LibMeToken.updateBalancePooled(add, _meToken, _amount);
    }

    function updateBalanceLocked(
        bool add,
        address _meToken,
        uint256 _amount
    ) external {
        return LibMeToken.updateBalancePooled(add, _meToken, _amount);
    }

    function updateBalances(address _meToken, uint256 _newBalance) external {
        require(msg.sender == s.meTokens[_meToken].migration, "!migration");
        uint256 balancePooled = s.meTokens[_meToken].balancePooled;
        uint256 balanceLocked = s.meTokens[_meToken].balanceLocked;
        uint256 oldBalance = balancePooled + balanceLocked;
        uint256 p = s.PRECISION;

        s.meTokens[_meToken].balancePooled =
            (balancePooled * p * _newBalance) /
            (oldBalance * p);
        s.meTokens[_meToken].balanceLocked =
            (balanceLocked * p * _newBalance) /
            (oldBalance * p);

        emit UpdateBalances(_meToken, _newBalance);
    }

    function transferMeTokenOwnership(address _newOwner) external {
        require(
            s.pendingMeTokenOwners[msg.sender] == address(0),
            "transfer ownership already pending"
        );
        require(!isOwner(_newOwner), "_newOwner already owns a meToken");
        require(_newOwner != address(0), "Cannot transfer to 0 address");
        address meToken_ = s.meTokenOwners[msg.sender];
        require(meToken_ != address(0), "meToken does not exist");
        s.pendingMeTokenOwners[msg.sender] = _newOwner;

        emit TransferMeTokenOwnership(msg.sender, _newOwner, meToken_);
    }

    function cancelTransferMeTokenOwnership() external {
        address _meToken = s.meTokenOwners[msg.sender];
        require(_meToken != address(0), "meToken does not exist");

        require(
            s.pendingMeTokenOwners[msg.sender] != address(0),
            "transferMeTokenOwnership() not initiated"
        );

        delete s.pendingMeTokenOwners[msg.sender];
        emit CancelTransferMeTokenOwnership(msg.sender, _meToken);
    }

    function claimMeTokenOwnership(address _oldOwner) external {
        require(!isOwner(msg.sender), "Already owns a meToken");
        require(
            msg.sender == s.pendingMeTokenOwners[_oldOwner],
            "!_pendingOwner"
        );

        address _meToken = s.meTokenOwners[_oldOwner];

        s.meTokens[_meToken].owner = msg.sender;
        s.meTokenOwners[msg.sender] = _meToken;

        delete s.meTokenOwners[_oldOwner];
        delete s.pendingMeTokenOwners[_oldOwner];

        emit ClaimMeTokenOwnership(_oldOwner, msg.sender, _meToken);
    }

    function setMeTokenWarmup(uint256 _warmup)
        external
        onlyDurationsController
    {
        require(_warmup != s.meTokenWarmup, "_warmup == s.hubWarmup");
        s.hubWarmup = _warmup;
    }

    function setMeTokenDuration(uint256 _duration)
        external
        onlyDurationsController
    {
        require(_duration != s.meTokenDuration, "_duration == s.hubDuration");
        s.hubDuration = _duration;
    }

    function setMeTokenCooldown(uint256 _cooldown)
        external
        onlyDurationsController
    {
        require(_cooldown != s.meTokenCooldown, "_cooldown == s.hubCooldown");
        s.hubCooldown = _cooldown;
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

    function getDetails(address _meToken)
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
