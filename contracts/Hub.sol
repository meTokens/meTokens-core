// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "./interfaces/IHub.sol";
import "./interfaces/IVault.sol";
import "./interfaces/IRegistry.sol";
import "./interfaces/ICurve.sol";
import "./interfaces/IFoundry.sol";

import "./libs/Details.sol";

/// @title meToken hub
/// @author Carl Farterson (@carlfarterson)
/// @notice This contract tracks all combinations of vaults and curves,
///     and their respective subscribed meTokens
contract Hub is IHub, Ownable, Initializable {
    uint256 public constant MAX_REFUND_RATIO = 10**6;
    uint256 private _warmup;
    uint256 private _duration;
    uint256 private _cooldown;

    uint256 private _count;
    IFoundry public foundry;
    IRegistry public vaultRegistry;
    IRegistry public curveRegistry;

    mapping(uint256 => Details.Hub) private _hubs;

    function initialize(
        address _foundry,
        address _vaultRegistry,
        address _curveRegistry
    ) external onlyOwner initializer {
        foundry = IFoundry(_foundry);
        vaultRegistry = IRegistry(_vaultRegistry);
        curveRegistry = IRegistry(_curveRegistry);
    }

    /// @inheritdoc IHub
    function register(
        address _owner,
        address _asset,
        IVault _vault,
        ICurve _curve,
        uint256 _refundRatio,
        bytes memory _encodedCurveDetails,
        bytes memory _encodedVaultArgs
    ) external override {
        // TODO: access control

        require(curveRegistry.isApproved(address(_curve)), "_curve !approved");
        require(vaultRegistry.isApproved(address(_vault)), "_vault !approved");
        require(_refundRatio < MAX_REFUND_RATIO, "_refundRatio > MAX");

        // Ensure asset is valid based on encoded args and vault validation logic
        require(_vault.isValid(_asset, _encodedVaultArgs), "asset !valid");

        // Store value set base parameters to `{CurveName}.sol`
        _curve.register(++_count, _encodedCurveDetails);

        // Save the hub to the registry
        Details.Hub storage hub_ = _hubs[_count];
        hub_.active = true;
        hub_.owner = _owner;
        hub_.asset = _asset;
        hub_.vault = address(_vault);
        hub_.curve = address(_curve);
        hub_.refundRatio = _refundRatio;
        emit Register(
            _owner,
            _asset,
            address(_vault),
            address(_curve),
            _refundRatio,
            _encodedCurveDetails,
            _encodedVaultArgs
        );
    }

    /// @inheritdoc IHub
    function initUpdate(
        uint256 _id,
        address _targetCurve,
        uint256 _targetRefundRatio,
        bytes memory _encodedCurveDetails
    ) external override {
        Details.Hub storage hub_ = _hubs[_id];
        require(msg.sender == hub_.owner, "!owner");
        if (hub_.updating && block.timestamp > hub_.endTime) {
            finishUpdate(_id);
        }
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
                require(_targetCurve != hub_.curve, "targetCurve==curve");
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

        emit InitUpdate(
            _id,
            _targetCurve,
            _targetRefundRatio,
            _encodedCurveDetails,
            reconfigure,
            hub_.startTime,
            hub_.endTime,
            hub_.endCooldown
        );
    }

    /// @inheritdoc IHub
    function cancelUpdate(uint256 _id) external override {
        Details.Hub storage hub_ = _hubs[_id];
        require(msg.sender == hub_.owner, "!owner");
        require(hub_.updating, "!updating");
        require(block.timestamp < hub_.startTime, "Update has started");

        hub_.targetRefundRatio = 0;
        hub_.reconfigure = false;
        hub_.updating = false;
        hub_.startTime = 0;
        hub_.endTime = 0;
        hub_.endCooldown = 0;

        emit CancelUpdate(_id);
    }

    function transferHubOwnership(uint256 _id, address _newOwner) external {
        Details.Hub storage hub_ = _hubs[_id];
        require(msg.sender == hub_.owner, "!owner");
        require(msg.sender != hub_.owner, "Same owner");
        hub_.owner = _newOwner;

        emit TransferHubOwnership(_id, _newOwner);
    }

    /// @inheritdoc IHub
    function setWarmup(uint256 warmup_) external override onlyOwner {
        require(warmup_ != _warmup, "warmup_ == _warmup");
        _warmup = warmup_;
    }

    /// @inheritdoc IHub
    function setDuration(uint256 duration_) external override onlyOwner {
        require(duration_ != _duration, "duration_ == _duration");
        _duration = duration_;
    }

    /// @inheritdoc IHub
    function setCooldown(uint256 cooldown_) external override onlyOwner {
        require(cooldown_ != _cooldown, "cooldown_ == _cooldown");
        _cooldown = cooldown_;
    }

    /// @inheritdoc IHub
    function count() external view override returns (uint256) {
        return _count;
    }

    /// @inheritdoc IHub
    function getDetails(uint256 id)
        external
        view
        override
        returns (Details.Hub memory hub_)
    {
        hub_ = _hubs[id];
    }

    /// @inheritdoc IHub
    function getWarmup() external view override returns (uint256) {
        return _warmup;
    }

    /// @inheritdoc IHub
    function getDuration() external view override returns (uint256) {
        return _duration;
    }

    /// @inheritdoc IHub
    function getCooldown() external view override returns (uint256) {
        return _cooldown;
    }

    /// @inheritdoc IHub
    function finishUpdate(uint256 id)
        public
        override
        returns (Details.Hub memory)
    {
        Details.Hub storage hub_ = _hubs[id];
        require(block.timestamp > hub_.endTime, "Still updating");

        if (hub_.targetRefundRatio != 0) {
            hub_.refundRatio = hub_.targetRefundRatio;
            hub_.targetRefundRatio = 0;
        }

        if (hub_.reconfigure) {
            ICurve(hub_.curve).finishReconfigure(id);
            hub_.reconfigure = false;
        }
        if (hub_.targetCurve != address(0)) {
            hub_.curve = hub_.targetCurve;
            hub_.targetCurve = address(0);
        }

        hub_.updating = false;
        hub_.startTime = 0;
        hub_.endTime = 0;

        emit FinishUpdate(id);
        return hub_;
    }
}
