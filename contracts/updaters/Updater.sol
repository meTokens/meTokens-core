// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../interfaces/I_Recollateralization.sol";
import "../interfaces/I_Hub.sol";
import "../interfaces/I_Updater.sol";
import "../interfaces/I_VaultRegistry.sol";
import "../interfaces/I_CurveRegistry.sol";
import "../interfaces/I_CurveValueSet.sol";


contract Updater is I_Updater {

    struct UpdateDetails {
        bool reconfiguring;
        address migrating;
        address recollateralizing;
        uint256 shifting;
        uint256 startTime;
        uint256 endTime;
    }

    uint256 private PRECISION = 10**18;
    
    uint256 private _minSecondsUntilStart;
    uint256 private _maxSecondsUntilStart;
    uint256 private _minDuration;
    uint256 private _maxDuration;
    
    I_Recollateralization public recollateralizations;
    I_Hub public hub;
    I_VaultRegistry public vaultRegistry;
    I_CurveRegistry public curveRegistry;


    // NOTE: keys are hubId's, used for valueSet calculations
    mapping (uint256 => UpdateDetails) private updates;

    constructor(
        address _recollateralizations,
        address _hub,
        address _vaultRegistry,
        address _curveRegistry
    ) {
        recollateralizations = I_Recollateralization(_recollateralizations);
        hub = I_Hub(_hub);
        vaultRegistry = I_VaultRegistry(_vaultRegistry);
        curveRegistry = I_CurveRegistry(_curveRegistry);
    }

    // TODO: args
    /// @inheritdoc I_Updater
    function startUpdate(
        uint256 _hubId,
        address _targetCurve,
        address _targetVault,
        address _recollateralizationFactory,
        uint256 _targetRefundRatio,
        bytes32 _targetEncodedValueSet,
        uint256 _startTime,
        uint256 _duration
        // uint256 _endTime
    ) external override {
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

        // is valid curve
        if (_targetCurve != address(0)) {
            require(curveRegistry.isRegisteredCurve(_targetCurve), "!registered");
            require(_targetCurve != hub.getHubCurve(_hubId), "_targetCurve == curve");

            // TODO
        }

        // is valid vault
        if (_targetVault != address(0)) {
            require(vaultRegistry.isActiveVault(_targetVault), "!active");
            require(_targetVault != hub.getHubVault(_hubId), "_targetVault == vault");
            // TODO: validate
            require(_targetEncodedValueSet != '', "_targetEncodedValueSet required");
        }

        // is valid refundRatio
        if (_targetRefundRatio != 0) {
            require(_targetRefundRatio < PRECISION, "_targetRefundRatio > max");
            require(_targetRefundRatio != hub.getHubRefundRatio(_hubId), "_targetRefundRatio == refundRatio");
        }

        bool reconfiguring;
        if (_targetEncodedValueSet.length > 0) {
            if (_targetCurve =! address(0)) {
                // curve migrating, point to new valueSet
                I_CurveValueSet(_targetCurve).registerValueSet(
                    _hubId,
                    _targetEncodedValueSet
                );
            } else {
                I_CurveValueSet(hub.getHubCurve(_hubId)).registerTargetValueSet(
                    _hubId,
                    _targetEncodedValueSet
                );
                reconfiguring = true;
            }
        }

        UpdateDetails memory updateDetails = UpdateDetails(
            reconfiguring,
            _targetCurve,
            _targetVault,
            _targetRefundRatio,
            _startTime,
            _startTime + _duration
        );

        updates[_hubId] = updateDetails;
        hub.startUpdate(_hubId);
    }


    function finishUpdate(uint256 _hubId) external override {

        UpdateDetails storage updateDetails = updates[_hubId];
        require(block.timestamp > updateDetails.endTime, "!finished");

        if (updateDetails.reconfiguring) {
            I_CurveValueSet(updateDetails.curve).finishUpdate(_hubId);
        }

        hub.finishUpdate(
            _hubId,
            updateDetails.migrating,
            updateDetails.recollateralizing,
            updateDetails.shifting  
        );        

        delete (updateDetails); // TODO: verify
        emit FinishUpdate(_hubId);
    }

    function getDetails(uint256 _hubId) external view override returns (
        bool reconfiguring,
        address migrating,
        address recollateralizing,
        uint256 shifting,
        uint256 startTime,
        uint256 endTime
    ) {
        UpdateDetails memory updateDetails = updates[_hubId];
        reconfiguring = updateDetails.reconfiguring;
        migrating = updateDetails.migrating;
        recollateralizing = updateDetails.recollateralizing;
        shifting = updateDetails.shifting;
        startTime = updateDetails.startTime;
        endTime = updateDetails.endTime;
    }

    function getUpdateTimes(uint256 _hubId) external view override returns (
        uint256 startTime,
        uint256 endTime
    ) {
        UpdateDetails memory updateDetails = updates[_hubId];
        startTime = updateDetails.startTime;
        endTime = updateDetails.endTime;
    }

    function getTargetCurve(uint256 _hubId) external view override returns (address) {
        UpdateDetails memory updateDetails = updates[_hubId];
        return updateDetails.migrating;
    }

    function getTargetRefundRatio(uint256 _hubId) external view override returns (uint256) {
        UpdateDetails memory updateDetails = updates[_hubId];
        return updateDetails.refundRatio;
    }

    function getTargetVault(uint256 _hubId) external view override returns (uint256) {
        UpdateDetails memory updateDetails = updates[_hubId];
        return updateDetails.vault;
    }

    function minSecondsUntilStart() external view returns (uint256) {return _minSecondsUntilStart;}
    function maxSecondsUntilStart() external view returns (uint256) {return _maxSecondsUntilStart;}
    function minUpdateDuration() external view returns (uint256) {return _minDuration;}
    function maxUpdateDuration() external view returns (uint256) {return _maxDuration;}

}