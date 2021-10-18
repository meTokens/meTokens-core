// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "./interfaces/IHub.sol";
import "./interfaces/IVaultFactory.sol";
import "./interfaces/IVaultRegistry.sol";
import "./interfaces/ICurveRegistry.sol";
import "./interfaces/IMigrationRegistry.sol";
import "./interfaces/IMigrationFactory.sol";
import "./interfaces/ICurve.sol";
import "./interfaces/IMigration.sol";

import "./libs/Details.sol";

/// @title meToken hub
/// @author Carl Farterson (@carlfarterson)
/// @notice This contract tracks all combinations of vaults and curves,
///     and their respective subscribed meTokens
contract Hub is Ownable, Initializable {
    uint256 private immutable _precision = 10**18;
    uint256 private _warmup;
    uint256 private _duration;
    uint256 private _cooldown;

    uint256 private _count;
    address public foundry;
    IVaultRegistry public vaultRegistry;
    ICurveRegistry public curveRegistry;
    IMigrationRegistry public migrationRegistry;

    mapping(uint256 => Details.Hub) private _hubs;
    mapping(uint256 => address[]) private _subscribedMeTokens;

    modifier exists(uint256 id) {
        require(id <= _count, "id exceeds _count");
        _;
    }

    function initialize(
        address _foundry,
        address _vaultRegistry,
        address _curveRegistry,
        address _migrationRegistry
    ) external onlyOwner initializer {
        foundry = _foundry;
        vaultRegistry = IVaultRegistry(_vaultRegistry);
        curveRegistry = ICurveRegistry(_curveRegistry);
        migrationRegistry = IMigrationRegistry(_migrationRegistry);
    }

    function register(
        address _vaultFactory,
        address _curve,
        uint256 _refundRatio,
        bytes memory _encodedCurveDetails,
        bytes memory _encodedVaultArgs
    ) external {
        // TODO: access control

        require(curveRegistry.isActive(_curve), "_curve !approved");
        require(
            vaultRegistry.isApproved(_vaultFactory),
            "_vaultFactory !approved"
        );
        require(_refundRatio < _precision, "_refundRatio > _precision");
        // Store value set base paramaters to `{CurveName}.sol`
        ICurve(_curve).register(_count, _encodedCurveDetails);

        // Create new vault
        // ALl new _hubs will create a vault
        address vault = IVaultFactory(_vaultFactory).create(_encodedVaultArgs);
        // Save the hub to the registry
        Details.Hub storage hub_ = _hubs[_count++];
        hub_.active = true;
        hub_.vault = vault;
        hub_.curve = _curve;
        hub_.refundRatio = _refundRatio;
    }

    function initUpdate(
        uint256 _id,
        address _vaultFactory, // to create the target vault
        address _migrationFactory,
        address _targetCurve,
        uint256 _targetRefundRatio,
        bytes memory _encodedVaultArgs,
        bytes memory _encodedMigrationArgs,
        bytes memory _encodedCurveDetails
    ) external {
        bool reconfigure;
        address targetVault;
        address migration;
        Details.Hub storage hub_ = _hubs[_id];
        require(!hub_.updating, "already updating");
        if (hub_.endCooldown > 0) {
            require(hub_.endCooldown <= block.timestamp, "Still cooling down");
            hub_.endCooldown = 0;
        }

        if (_targetRefundRatio != 0) {
            require(
                _targetRefundRatio < _precision,
                "_targetRefundRatio >= _precision"
            );
            require(
                _targetRefundRatio != hub_.refundRatio,
                "_targetRefundRatio == refundRatio"
            );
        }

        // create target vault and migration vault
        if (_vaultFactory != address(0)) {
            require(
                vaultRegistry.isActive(_vaultFactory),
                "_vaultFactory inactive"
            );
            require(
                migrationRegistry.isActive(_migrationFactory),
                "_migrationFactory inactive"
            );
            targetVault = IVaultFactory(_vaultFactory).create(
                _encodedVaultArgs
            );
            migration = IMigrationFactory(_migrationFactory).create(
                _id,
                msg.sender,
                hub_.vault,
                targetVault,
                _encodedMigrationArgs
            );
        }

        if (_encodedCurveDetails.length > 0) {
            if (_targetCurve == address(0)) {
                ICurve(hub_.curve).initReconfigure(_id, _encodedCurveDetails);
            } else {
                require(
                    curveRegistry.isActive(_targetCurve),
                    "_targetCurve inactive"
                );
                ICurve(_targetCurve).register(_id, _encodedCurveDetails);
            }
            reconfigure = true;
        }

        if (migration != address(0)) {
            // only set these values now that everything else has passed
            hub_.migration = migration;
            hub_.targetVault = targetVault;
        }

        if (_targetRefundRatio != 0) {
            hub_.targetRefundRatio = _targetRefundRatio;
        }
        if (_targetCurve != address(0)) {
            hub_.targetCurve = _targetCurve;
        }

        hub_.reconfigure = reconfigure;
        hub_.updating = true;
        hub_.startTime = block.timestamp + _warmup;
        hub_.endTime = block.timestamp + _warmup + _duration;
        hub_.endCooldown = block.timestamp + _warmup + _duration + _cooldown;
    }

    function finishUpdate(uint256 id) external returns (Details.Hub memory) {
        // TODO: only callable from foundry
        Details.Hub storage hub_ = _hubs[id];

        if (hub_.targetVault != address(0)) {
            require(IMigration(hub_.migration).hasFinished());
            hub_.vaultMultipliers.push(
                IMigration(hub_.migration).getMultiplier()
            );

            hub_.migration = address(0);
            hub_.vault = hub_.targetVault;
            hub_.targetVault = address(0);
        }

        if (hub_.targetRefundRatio != 0) {
            hub_.refundRatio = hub_.targetRefundRatio;
            hub_.targetRefundRatio = 0;
        }

        if (hub_.reconfigure) {
            if (hub_.targetCurve == address(0)) {
                ICurve(hub_.curve).finishReconfigure(id);
            } else {
                hub_.curve = hub_.targetCurve;
                hub_.targetCurve = address(0);
            }
            hub_.reconfigure = false;
        }

        hub_.updating = false;
        hub_.startTime = 0;
        hub_.endTime = 0;
        return hub_;
    }

    function count() external view returns (uint256) {
        return _count;
    }

    function getDetails(uint256 id)
        external
        view
        exists(id)
        returns (Details.Hub memory hub_)
    {
        hub_ = _hubs[id];
    }

    function getWarmup() external view returns (uint256) {
        return _warmup;
    }

    function setWarmup(uint256 warmup_) external onlyOwner {
        require(warmup_ != _warmup, "warmup_ == _warmup");
        _warmup = warmup_;
    }

    function getDuration() external view returns (uint256) {
        return _duration;
    }

    function setDuration(uint256 duration_) external onlyOwner {
        require(duration_ != _duration, "duration_ == _duration");
        _duration = duration_;
    }

    function getCooldown() external view returns (uint256) {
        return _cooldown;
    }

    function setCooldown(uint256 cooldown_) external onlyOwner {
        require(cooldown_ != _cooldown, "cooldown_ == _cooldown");
        _cooldown = cooldown_;
    }
}
