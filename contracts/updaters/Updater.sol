pragma solidity ^0.8.0;

import "../interfaces/I_Migrations.sol";
import "../interfaces/I_Hub.sol";


contract Updater {

    struct UpdateDetails {
        // bool reconfiguring;
        bool migrating;
        bool shifting;
        bool recollateralizing;
        uint256 startTime;
        uint256 endTime;
    }

    I_Migrations public migrations;
    I_Hub public hub;

    // NOTE: keys are hubId's, used for valueSet calculations
    mapping (uint256 => bool) private reconfigurings;

    constructor(address _migrations, address _hub) {
        migrations = I_Migrations(_migrations);
        hub = I_Hub(_hub);
    }

    // TODO: args
    function startUpdate(
        uint256 _hubId,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _targetRefundRatio,
        address _targetVault,
        address _targetCurve,
        bytes32 _targetEncodedValueSet
    ) external {
        // TODO: access control

        require(
            _startTime - block.timestamp >= migrations.minSecondsUntilStart() &&
            _startTime - block.timestamp <= migrations.maxSecondsUntilStart(),
            "Unacceptable _startTime"
        );
        require(
            _endTime - _startTime >= migrations.minUpdateDuration() &&
            _endTime - _startTime <= migrations.maxUpdateDuration(),
            "Unacceptable update duration"
        );

        // is valid curve
        if (_targetCurve != address(0)) {
            // TODO
            curveRegistry.isRegisteredCurve(_targetCurve);
        }

        // is valid vault
        if (_targetVault != address(0)) {
            require(vaultFactory.isActiveVault(_targetVault), "!active");
        }

        // is valid refundRatio
        if (_targetRefundRatio != 0) {
            // TODO
            require(_targetRefundRatio <= MAX_TARGET_REFUND_RATIO);
        }

        // is valid targetValueSet
        if (_targetEncodedValueSet == '') { // TODO: validate bytes32 == ''
            I_Curve(_targetCurve).registerTargetValueSet(
                _hubId,
                _targetEncodedValueSets
            );
            reconfigurings[_hubId] = true;
        }

        UpdateDetails memory updateDetails = UpdateDetails(
            _hubId,
            _startTime,
            _endTime,
            _targetVault,
            _targetRefundRatio,
            _targetCurve,
            _targetEncodedValueSet
        );

        // TODO
        hub.setStatus(_hubId, status.UPDATING);

    }


    function isReconfinguring(uint256 _hubId) external view returns (bool) {
        return reconfigurings[_hubId];
    }

    function getUpdateDetails(uint256 _hubId) external view returns (address) {}

    function getUpdateTimes(uint256 _hubId) external view returns (uint256, uint256) {}

    function getTargetCurve(uint256 _hubId) external view returns (address) {
        // TODO
    }

    function getTargetRefundRatio(uint256 _hubId) external view returns (uint256) {
        // TODO
    }

    function getTargetVault(uint256 _hubId) external view returns (uint256) {
        // TODO
    }




    // TODO: figure out where the heck to put this
    function _calculateWeightedAmount(
        uint256 _amount,
        uint256 _targetAmount,
        uint256 _hubId,
        uint256 _startTime,
        uint256 _endTime
    ) private returns (uint256 weightedAmount) {
        uint256 targetWeight;

        if (block.timestamp > _endTime) { 
            // Finish update if complete
            _finishUpdate(_hubId);
            targetWeight = PRECISION;
        } else {
            uint256 targetProgress = block.timestamp - _startTime;
            uint256 targetLength = _endTime - _startTime;
            // TODO: is this calculation right?
            targetWeight = PRECISION * targetProgress / targetLength;
        }

        // TODO: validate these calculations
        uint256 weighted_v = _amount * (PRECISION - targetWeight);
        uint256 weighted_t = _targetAmount * targetWeight;
        weightedAmount = weighted_v + weighted_t;
    }

}