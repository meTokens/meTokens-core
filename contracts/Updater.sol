// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./interfaces/IUpdater.sol";
import "./interfaces/IRecollateralization.sol";
import "./interfaces/IHub.sol";
import "./interfaces/IVaultRegistry.sol";
import "./interfaces/ICurveRegistry.sol";
import "./interfaces/ICurve.sol";

import {HubDetails} from "./libs/Details.sol";


/// @title meToken Updater
/// @author Carl Farterson (@carlfarterson)
/// @notice contract to update a hub
contract Updater is IUpdater, Ownable {

    uint256 private PRECISION = 10**18;

    uint256 private _minSecondsUntilStart = 0; // TODO
    uint256 private _maxSecondsUntilStart = 0; // TODO
    uint256 private _minDuration = 0; // TODO
    uint256 private _maxDuration = 0; // TODO

    IRecollateralization public recollateralization;
    IHub public hub;
    IVaultRegistry public vaultRegistry;
    ICurveRegistry public curveRegistry;

    constructor() {}

    function initialize(
        IRecollateralization _recollateralization,
        IHub _hub,
        IVaultRegistry _vaultRegistry,
        ICurveRegistry _curveRegistry
    ) public onlyOwner {
        recollateralization = _recollateralization;
        hub = _hub;
        vaultRegistry = _vaultRegistry;
        curveRegistry = _curveRegistry;
    }

    function globalUpdate() {
        updateHubDetails();
        updateCurveDetails();
    }

    function initUpdate(
        uint256 _hubId,
        // address _targetCurve,
        // address _targetVault,
        // address _recollateralizationFactory,
        uint256 _targetRefundRatio,
        // bytes32 _targetEncodedValueSet,
        uint256 _startTime,
        uint256 _duration
    ) external {
        // TODO: access control

        require(
            _startTime - block.timestamp >= _minSecondsUntilStart &&
            _startTime - block.timestamp <= _maxSecondsUntilStart,
            "Unacceptable _startTime"
        );
        require(
            _minDuration <= _duration &&
            _maxDuration >= _duration,
            "Unacceptable update duration"
        );

        HubDetails memory hubDetails = hub.getDetails(_hubId);

        // is valid refundRatio
        if (_targetRefundRatio != 0) {
            require(_targetRefundRatio < PRECISION, "_targetRefundRatio > max");
            require(_targetRefundRatio != hubDetails.refundRatio, "_targetRefundRatio == refundRatio");
        }

        hub.startUpdate(_hubId);
    }


    function executeProposal(uint256 _hubId) public {
    }



    function startUpdate(uint256 _hubId) external {
        HubDetails memory hubDetails = updates[_hubId];
    }

    function finishUpdate(uint256 _hubId) external {
        emit FinishUpdate(_hubId);
    }

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
            amount != _maxSecondsUntilStart &&
            amount > _minSecondsUntilStart,
            "out of range"
        );
        _maxSecondsUntilStart = amount;
        emit SetMaxSecondsUntilStart(amount);
    }

    function setMinDuration(uint256 amount) external onlyOwner {
        require(
            amount > 0 &&
            amount != _minDuration &&
            amount < _maxDuration,
            "out of range"
        );
        _minDuration = amount;
        emit SetMinDuration(amount);
    }

    function setMaxDuration(uint256 amount) external onlyOwner {
        require(
            amount != _maxSecondsUntilStart &&
            amount  > _minDuration,
            "out of range"
        );
        _maxDuration = amount;
        emit SetMaxDuration(amount);
    }

    function minSecondsUntilStart() external view returns (uint256) {return _minSecondsUntilStart;}
    function maxSecondsUntilStart() external view returns (uint256) {return _maxSecondsUntilStart;}
    function minDuration() external view returns (uint256) {return _minDuration;}
    function maxDuration() external view returns (uint256) {return _maxDuration;}
    */
}
