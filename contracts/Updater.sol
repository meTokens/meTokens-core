// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./interfaces/IUpdater.sol";
import "./interfaces/IMigration.sol";
import "./interfaces/IHub.sol";
import "./interfaces/IVaultRegistry.sol";
import "./interfaces/ICurveRegistry.sol";
import "./interfaces/ICurve.sol";

import "./libs/Details.sol";

/// @title meToken Updater
/// @author Carl Farterson (@carlfarterson)
/// @notice contract to update a hub
contract Updater is IUpdater, Ownable {
    uint256 public constant PRECISION = 10**18;

    uint256 private _minSecondsUntilStart = 0; // TODO
    uint256 private _maxSecondsUntilStart = 0; // TODO
    uint256 private _minDuration = 0; // TODO
    uint256 private _maxDuration = 0; // TODO

    IMigration public migration;
    IHub public hub;
    IVaultRegistry public vaultRegistry;
    ICurveRegistry public curveRegistry;

    function initialize(
        IMigration _migration,
        IHub _hub,
        IVaultRegistry _vaultRegistry,
        ICurveRegistry _curveRegistry
    ) external onlyOwner {
        migration = _migration;
        hub = _hub;
        vaultRegistry = _vaultRegistry;
        curveRegistry = _curveRegistry;
    }

    function initUpdate(
        uint256 _hubId,
        address _migration,
        address _targetVault,
        address _targetCurve,
        uint256 _targetRefundRatio,
        bytes memory _encodedCurveDetails,
        uint256 _startTime,
        uint256 _duration
    ) external {
        require(
            _startTime - block.timestamp >= _minSecondsUntilStart &&
                _startTime - block.timestamp <= _maxSecondsUntilStart,
            "Unacceptable _startTime"
        );
        require(
            _minDuration <= _duration && _maxDuration >= _duration,
            "Unacceptable update duration"
        );

        bool reconfiguring;
        Details.Hub memory hub_ = hub.getDetails(_hubId);
        require(!hub_.updating, "already updating");

        if (_targetRefundRatio != 0) {
            require(_targetRefundRatio < PRECISION, "_targetRefundRatio > max");
            require(
                _targetRefundRatio != hub_.refundRatio,
                "_targetRefundRatio == refundRatio"
            );
        }

        if (_encodedCurveDetails.length > 0) {
            if (_targetCurve == address(0)) {
                ICurve(hub_.curve).registerTarget(_hubId, _encodedCurveDetails);
            } else {
                // _targetCurve != address(0))
                require(
                    curveRegistry.isActive(_targetCurve),
                    "_targetCurve inactive"
                );
                ICurve(_targetCurve).register(_hubId, _encodedCurveDetails);
            }
            reconfiguring = true;
        }

        // TODO: figure out how to pass these into `initUpdate()`
        // if (_migration != address(0) && _targetVault != address(0)) {}

        hub.initUpdate(
            _hubId,
            _migration,
            _targetVault,
            _targetCurve,
            reconfiguring,
            _targetRefundRatio,
            _startTime,
            _duration
        );
    }

    // function executeProposal(uint256 _hubId) public {}

    function setMinSecondsUntilStart(uint256 amount) external onlyOwner {
        require(
            amount > 0 &&
                amount != _minSecondsUntilStart &&
                amount < _maxSecondsUntilStart,
            "out of range"
        );
        _minSecondsUntilStart = amount;
        emit SetMinSecondsUntilStart(amount);
    }

    function setMaxSecondsUntilStart(uint256 amount) external onlyOwner {
        require(
            amount != _maxSecondsUntilStart && amount > _minSecondsUntilStart,
            "out of range"
        );
        _maxSecondsUntilStart = amount;
        emit SetMaxSecondsUntilStart(amount);
    }

    function setMinDuration(uint256 amount) external onlyOwner {
        require(
            amount > 0 && amount != _minDuration && amount < _maxDuration,
            "out of range"
        );
        _minDuration = amount;
        emit SetMinDuration(amount);
    }

    function setMaxDuration(uint256 amount) external onlyOwner {
        require(
            amount != _maxSecondsUntilStart && amount > _minDuration,
            "out of range"
        );
        _maxDuration = amount;
        emit SetMaxDuration(amount);
    }

    function minSecondsUntilStart() external view returns (uint256) {
        return _minSecondsUntilStart;
    }

    function maxSecondsUntilStart() external view returns (uint256) {
        return _maxSecondsUntilStart;
    }

    function minDuration() external view returns (uint256) {
        return _minDuration;
    }

    function maxDuration() external view returns (uint256) {
        return _maxDuration;
    }
}
