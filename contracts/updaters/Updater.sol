pragma solidity ^0.8.0;

import "../interfaces/I_Migrations.sol";
import "../interfaces/I_Hub.sol";


contract Updater {

    struct UpdateDetails {
        // bool reconfiguring;
        address migrating;
        uint256 shifting;
        address recollateralizing;
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
        uint256 _startTime,
        uint256 _endTime,
        uint256 _targetRefundRatio,
        address _targetVault,
        address _targetCurve,
        bytes32 _targetEncodedValueSet
    ) external {
        // TODO: access control
        address migrating;

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
        }

        // is valid refundRatio
        if (_targetRefundRatio != 0) {
            require(_targetRefundRatio <= MAX_TARGET_REFUND_RATIO, "_targetRefundRatio > max");
            require(_targetRefundRatio != hub.getHubRefundRatio(_hubId), "_targetRefundRatio == refundRatio");
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

        updates[_hubId] = updateDetails;
        // TODO
        hub.setStatus(_hubId, 3);
    }

    function finishUpdate(uint256 _hubId) external {
        require(msg.sender == foundry, "!foundry");

        UpdateDetails memory updateDetails = updates[_hubId];
        require(block.timestamp > updateDetails.endTime, "!finished");

        hub.setStatus(_hubId, 2);
        delete updates[_hubId]; // TODO: verify
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

}