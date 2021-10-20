// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "./interfaces/IHub.sol";
import "./interfaces/IVaultFactory.sol";
import "./interfaces/IVaultRegistry.sol";
import "./interfaces/ICurveRegistry.sol";
import "./interfaces/ICurve.sol";

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
    IVaultRegistry public vaultRegistry;
    ICurveRegistry public curveRegistry;

    mapping(uint256 => Details.Hub) private _hubs;

    modifier exists(uint256 id) {
        require(id <= _count, "id exceeds _count");
        _;
    }

    function initialize(address _vaultRegistry, address _curveRegistry)
        external
        onlyOwner
        initializer
    {
        vaultRegistry = IVaultRegistry(_vaultRegistry);
        curveRegistry = ICurveRegistry(_curveRegistry);
    }

    function register(
        address _vault,
        address _curve,
        uint256 _refundRatio,
        bytes memory _encodedCurveDetails,
        bytes memory _encodedVaultArgs
    ) external {
        // TODO: access control

        require(curveRegistry.isActive(_curve), "_curve !approved");
        require(vaultRegistry.isApproved(_vault), "_vault !approved");
        require(_refundRatio < _precision, "_refundRatio > _precision");

        // Validate encoded vault args
        // For example, for single asset vault make sure the token is whitelisted
        IVault(_vault).validate(_encodedVaultArgs); // TODO

        // Store value set base parameters to `{CurveName}.sol`
        ICurve(_curve).register(_count, _encodedCurveDetails);

        IVault(_vault).register(_count, _encodedVaultArgs);

        // Save the hub to the registry
        Details.Hub storage hub_ = _hubs[_count++];
        hub_.active = true;
        hub_.vault = _vault;
        hub_.curve = _curve;
        hub_.refundRatio = _refundRatio;
    }

    function initUpdate(
        uint256 _id,
        address _targetCurve,
        uint256 _targetRefundRatio,
        bytes memory _encodedCurveDetails
    ) external {
        Details.Hub storage hub_ = _hubs[_id];
        require(!hub_.updating, "already updating");
        require(block.timestamp >= hub_.endCooldown, "Still cooling down");
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
        bool reconfigure;

        if (_encodedCurveDetails.length > 0) {
            if (_targetCurve == address(0)) {
                reconfigure = true;
                ICurve(hub_.curve).initReconfigure(_id, _encodedCurveDetails);
            } else {
                require(
                    curveRegistry.isActive(_targetCurve),
                    "_targetCurve inactive"
                );
                ICurve(_targetCurve).register(_id, _encodedCurveDetails);
                hub_.targetCurve = _targetCurve;
            }
        }

        if (_targetRefundRatio != 0) {
            hub_.targetRefundRatio = _targetRefundRatio;
        }

        hub_.reconfigure = reconfigure;
        hub_.updating = true;
        hub_.startTime = block.timestamp + _warmup;
        hub_.endTime = block.timestamp + _warmup + _duration;
        hub_.endCooldown = block.timestamp + _warmup + _duration + _cooldown;
    }

    function finishUpdate(uint256 id) external returns (Details.Hub memory) {
        Details.Hub storage hub_ = _hubs[id];
        require(block.timestamp > hub_.endTime, "Still updating");

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
