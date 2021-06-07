pragma solidity ^0.8.0;

import "../interfaces/I_Migrations.sol";
import "../interfaces/I_Hub.sol";


contract Updater {

    struct UpdateDetails {
        address migrating;
        address recollateralizing;
        uint256 shifting;
        uint256 startTime;
        uint256 endTime;
    }

    I_Migrations public migrations;
    I_Hub public hub;

    // NOTE: keys are hubId's, used for valueSet calculations
    mapping (uint256 => bool) private reconfigurings;
    mapping (uint256 => UpdateDetails) private updates;

    constructor(address _migrations, address _hub) {
        migrations = I_Migrations(_migrations);
        hub = I_Hub(_hub);
    }

    // TODO: args
    function startUpdate(
        uint256 _hubId,
        address _targetCurve,
        address _targetVault,
        uint256 _targetRefundRatio,
        bytes32 _targetEncodedValueSet,
        uint256 _startTime,
        uint256 _endTime
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
            require(curveRegistry.isRegisteredCurve(_targetCurve), "!registered");
            require(_targetCurve != hub.getHubCurve(_hubId), "_targetCurve == curve");
        }

        // is valid vault
        if (_targetVault != address(0)) {
            require(vaultFactory.isActiveVault(_targetVault), "!active");
            require(_targetVault != hub.getHubVault(_hubId), "_targetVault == vault");
            // TODO: validate
            require(_targetEncodedValueSet != '', "_targetEncodedValueSet required");
        }

        // is valid refundRatio
        if (_targetRefundRatio != 0) {
            require(_targetRefundRatio <= MAX_TARGET_REFUND_RATIO, "_targetRefundRatio > max");
            require(_targetRefundRatio != hub.getHubRefundRatio(_hubId), "_targetRefundRatio == refundRatio");
        }

        bool reconfiguring;
        if (_targetEncodedValueSet != '') { // TODO: validate bytes32 == ''
            if (_targetCurve =! address(0)) {
                // curve migrating, point to new valueSet
                I_Curve(_targetCurve).registerValueSet(
                    _hubId,
                    _targetEncodedValueSet
                );
            } else {
                I_Curve(hub.getHubCurve(_hubId)).registerTargetValueSet(
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
            _endTime
        );

        updates[_hubId] = updateDetails;
        // TODO
        hub.setStatus(_hubId, 3);
    }

    function finishUpdate(uint256 _hubId) external {
        require(msg.sender == foundry, "!foundry");

        UpdateDetails memory updateDetails = updates[_hubId];
        require(block.timestamp > updateDetails.endTime, "!finished");

        hub.setStatus(_hubId, 2);
        reconfigurings[_hubId] = false;
        delete updates[_hubId]; // TODO: verify
    }


    function isReconfinguring(uint256 _hubId) external view returns (bool) {
        return reconfigurings[_hubId];
    }

    function getUpdateDetails(uint256 _hubId) external view returns (
        bool reconfiguring,
        address migrating,
        address recollateralizing,
        uint256 shifting,
        uint256 startTime,
        uint256 endTime
    ) {
        updateDetails memory updateDetails = updates[_hubId];
        migrating = updateDetails.migrating;
        recollateralizing = updateDetails.recollateralizing;
        shifting = updateDetails.shifting;
        startTime = updateDetails.startTime;
        endTime = updateDetails.endTime;
    }

    function getUpdateTimes(uint256 _hubId) external view returns (
        uint256 startTime,
        uint256 endTime
    ) {
        UpdateDetails memory updateDetails = updates[_hubId];
        startTime = updateDetails.startTime;
        endTime = updateDetails.endTime;
    }

    function getTargetCurve(uint256 _hubId) external view returns (address) {
        UpdateDetails memory updateDetails = updates[_hubId];
        return updateDetails.migrating;
    }

    function getTargetRefundRatio(uint256 _hubId) external view returns (uint256) {
        UpdateDetails memory updateDetails = updates[_hubId];
        return updateDetails.refundRatio;
    }

    function getTargetVault(uint256 _hubId) external view returns (uint256) {
        UpdateDetails memory updateDetails = updates[_hubId];
        return updateDetails.vault;
    }

}