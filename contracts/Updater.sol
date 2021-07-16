// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "./interfaces/IUpdater.sol";
import "./interfaces/IRecollateralization.sol";
import "./interfaces/IHub.sol";
import "./interfaces/IVaultRegistry.sol";
import "./interfaces/ICurveRegistry.sol";
import "./interfaces/ICurveValueSet.sol";

import "@openzeppelin/contracts/access/Ownable.sol";


abstract contract Updater is IUpdater, Ownable {

    struct UpdateDetails {
        bool reconfiguring;
        address migrating;
        address recollateralizing;
        uint256 shifting;  // NOTE: For refundRatio
        uint256 startTime;
        uint256 endTime;
    }

    uint256 private PRECISION = 10**18;
    
    uint256 private _minGracePeriod;
    uint256 private _maxGracePeriod;
    uint256 private _minVotePeriod;
    uint256 private _maxVotePeriod;

    uint256 private _minSecondsUntilStart;
    uint256 private _maxSecondsUntilStart;
    uint256 private _minDuration;
    uint256 private _maxDuration;
    
    // TODO
    IRecollateralization public recollateralizations = IRecollateralization(address(0));
    IHub public hub = IHub(address(0));
    IVaultRegistry public vaultRegistry = IVaultRegistry(address(0));
    ICurveRegistry public curveRegistry = ICurveRegistry(address(0));


    // NOTE: keys are hubId's, used for valueSet calculations
    mapping (uint256 => UpdateDetails) private updates;

    constructor(
        uint256 minSecondsUntilStart_,
        uint256 maxSecondsUntilStart_,
        uint256 minDuration_,
        uint256 maxDuration_
    ) {
        _minSecondsUntilStart = minSecondsUntilStart_;
        _maxSecondsUntilStart = maxSecondsUntilStart_;
        _minDuration = minDuration_;
        _maxDuration = maxDuration_;
    }

    // TODO: args
    function initUpdate(
        uint256 _hubId,
        uint256 _targetCurveId,
        address _targetVault,
        address _recollateralizationFactory,
        uint256 _targetRefundRatio,
        bytes32 _targetEncodedValueSet,
        uint256 _startTime,
        uint256 _duration
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

        address vault;
        address curveId;
        uint256 refundRatio;
        (,,vault, curveId, refundRatio,) = hub.getDetails(_hubId);

        // is valid curve
        if (_targetCurveId > 0) {
            (, , address valueSet, bool active) = curveRegistry.getDetails(_targetCurveId);

            // TODO
            // require(curveRegistry.isRegisteredCurve(_targetCurve), "!registered");
            // require(
            //     _targetCurveId != hub.getCurve(_hubId),
            //     "Cannot set target curve to the same curve ID"
            // );
        }

        // is valid vault
        if (_targetVault != address(0)) {
            require(vaultRegistry.isActiveVault(_targetVault), "!active");
            require(_targetVault != vault, "_targetVault == vault");
            // TODO: validate
            require(_targetEncodedValueSet.length > 0, "_targetEncodedValueSet required");
        }

        // is valid refundRatio
        if (_targetRefundRatio != 0) {
            require(_targetRefundRatio < PRECISION, "_targetRefundRatio > max");
            require(_targetRefundRatio != refundRatio, "_targetRefundRatio == refundRatio");
        }

        bool reconfiguring;
        // if (_targetEncodedValueSet.length > 0) {

        //     // curve migrating, point to new valueSet
        //     if (_targetCurve =! address(0)) {
        //         ICurveValueSet(_targetCurve).registerValueSet(
        //             _hubId,
        //             _targetEncodedValueSet
        //         );
        //     // We're still using the same curve, start reconfiguring the value set
        //     } else {
        //         ICurveValueSet(hub.getCurve(_hubId)).registerTargetValueSet(
        //             _hubId,
        //             _targetEncodedValueSet
        //         );
        //         reconfiguring = true;
        //     }
        // }
        
        // UpdateDetails storage updateDetails = UpdateDetails(
        //     reconfiguring,
        //     _targetCurveId,
        //     _targetVault,
        //     _targetRefundRatio,
        //     _startTime,
        //     _startTime + _duration
        // );


        UpdateDetails storage updateDetails = updates[_hubId];
        updateDetails.reconfiguring =      reconfiguring;
        // TODO
        updateDetails.migrating =          address(0); // _targetCurveId;
        updateDetails.recollateralizing =  _targetVault;
        updateDetails.shifting =           _targetRefundRatio;
        updateDetails.startTime =          _startTime;
        updateDetails.endTime =            _startTime + _duration;

        hub.startUpdate(_hubId);
    }


    function executeProposal(uint256 _hubId) public {
        uint256 hubStatus = hub.getStatus(_hubId);
        require(hubStatus == 3, "!QUEUED");

        UpdateDetails storage update = updates[_hubId];
        require(
            block.timestamp > update.startTime &&
            block.timestamp < update.endTime
        );
        // require(update.)
    } 



    function startUpdate(uint256 _hubId) external override {
        // TODO: access control

        UpdateDetails storage updateDetails = updates[_hubId];
    }

    function finishUpdate(uint256 _hubId) external override {

        UpdateDetails storage updateDetails = updates[_hubId];
        require(block.timestamp > updateDetails.endTime, "!finished");

        // TODO
        // if (updateDetails.reconfiguring) {
        //     ICurveValueSet(updateDetails.curve).finishUpdate(_hubId);
        // }

        hub.finishUpdate(
            _hubId,
            updateDetails.migrating,
            updateDetails.recollateralizing,
            updateDetails.shifting  
        );        

        delete updates[_hubId];
        emit FinishUpdate(_hubId);
    }

    function setMinSecondsUntilStart(uint256 amount) external onlyOwner override {
        require(
            amount > 0 && 
            amount != _minSecondsUntilStart &&
            amount < _maxSecondsUntilStart,
            "out of range"
        );
        _minSecondsUntilStart = amount;
        emit SetMinSecondsUntilStart(amount);
    }

    function setMaxSecondsUntilStart(uint256 amount) external onlyOwner override {
        require(
            amount != _maxSecondsUntilStart &&
            amount > _minSecondsUntilStart,
            "out of range"
        );
        _maxSecondsUntilStart = amount;
        emit SetMaxSecondsUntilStart(amount);
    }

    function setMinDuration(uint256 amount) external onlyOwner override {
        require(
            amount > 0 &&
            amount != _minDuration &&
            amount < _maxDuration,
            "out of range"
        );
        _minDuration = amount;
        emit SetMinDuration(amount);
    }

    function setMaxDuration(uint256 amount) external onlyOwner override {
        require(
            amount != _maxSecondsUntilStart && 
            amount  > _minDuration,
            "out of range"
        );
        _maxDuration = amount;
        emit SetMaxDuration(amount);
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
        return updateDetails.shifting;
    }

    function getTargetVault(uint256 _hubId) external view override returns (address) {
        UpdateDetails memory updateDetails = updates[_hubId];
        return updateDetails.recollateralizing;
    }


    function minSecondsUntilStart() external view override returns (uint256) {return _minSecondsUntilStart;}
    function maxSecondsUntilStart() external view override returns (uint256) {return _maxSecondsUntilStart;}
    function minDuration() external view override returns (uint256) {return _minDuration;}
    function maxDuration() external view override returns (uint256) {return _maxDuration;}

}