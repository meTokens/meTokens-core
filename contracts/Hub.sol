// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "./interfaces/IHub.sol";
import "./interfaces/IVault.sol";
import "./interfaces/IRegistry.sol";
import "./interfaces/ICurve.sol";

import "./libs/Details.sol";

/// @title meToken hub
/// @author Carl Farterson (@carlfarterson)
/// @notice This contract tracks all combinations of vaults and curves,
///     and their respective subscribed meTokens
contract Hub is Ownable, Initializable {
    uint256 public constant MAX_REFUND_RATIO = 10**6;
    uint256 private _warmup;
    uint256 private _duration;
    uint256 private _cooldown;

    uint256 private _count;
    IRegistry public vaultRegistry;
    IRegistry public curveRegistry;

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
        vaultRegistry = IRegistry(_vaultRegistry);
        curveRegistry = IRegistry(_curveRegistry);
    }

    function register(
        address _asset,
        IVault _vault,
        ICurve _curve,
        uint256 _refundRatio,
        bytes memory _encodedCurveDetails,
        bytes memory _encodedVaultArgs
    ) external {
        // TODO: access control

        require(curveRegistry.isApproved(address(_curve)), "_curve !approved");
        require(vaultRegistry.isApproved(address(_vault)), "_vault !approved");
        require(_refundRatio < MAX_REFUND_RATIO, "_refundRatio > MAX");

        // Ensure asset is valid based on encoded args and vault validation logic
        require(_vault.isValid(_asset, _encodedVaultArgs), "asset !valid");

        // Store value set base parameters to `{CurveName}.sol`
        _curve.register(_count, _encodedCurveDetails);

        // Save the hub to the registry
        Details.Hub storage hub_ = _hubs[_count++];
        hub_.active = true;
        hub_.asset = _asset;
        hub_.vault = address(_vault);
        hub_.curve = address(_curve);
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
                _targetRefundRatio < MAX_REFUND_RATIO,
                "_targetRefundRatio >= MAX"
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
                    curveRegistry.isApproved(_targetCurve),
                    "_targetCurve !approved"
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

    function setWarmup(uint256 warmup_) external onlyOwner {
        require(warmup_ != _warmup, "warmup_ == _warmup");
        _warmup = warmup_;
    }

    function setDuration(uint256 duration_) external onlyOwner {
        require(duration_ != _duration, "duration_ == _duration");
        _duration = duration_;
    }

    function setCooldown(uint256 cooldown_) external onlyOwner {
        require(cooldown_ != _cooldown, "cooldown_ == _cooldown");
        _cooldown = cooldown_;
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

    function getDuration() external view returns (uint256) {
        return _duration;
    }

    function getCooldown() external view returns (uint256) {
        return _cooldown;
    }
}
