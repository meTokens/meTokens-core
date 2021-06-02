pragma solidity ^0.8.0;

import "../interfaces/I_Hub.sol";
import "../interfaces/I_Migrations.sol"; // TODO

contract ValueSetUpdater {

    I_Hub public hub;
    I_Updater public migrations;

    constructor(address _hub, address _migrations) {
        hub = _hub;
        migrations = _migrations;
    }


    function reconfigure(
        uint256 _hubId,
        bytes32 _encodedTargetValueSet,
        uint256 _startTime,
        uint256 _endTime
    ) external override {

        // TODO: determine where to place these
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

        require(msg.sender == hub.getHubOwner(_hubId), "msg.sender not hub owner");
        require(hub.getHubStatus(_hubId) == 2, "!ACTIVE");

        curve = I_Curve(hub.getHubCurve(_hubId));
        curve.registerTargetValueSet(_hubId, _encodedTargetValueSet, _startTime, _endTime);


        curve.validate(_encodedTargetValueSet);

        TargetValueSet memory targetValueSet = TargetValueSet(_encodedTargetValueSet, _startTime, _endTime);
        targetValueSets[_hubId] = targetValueSet;

        hub.setHubStatus(_hubId, 3); // 3 = "Reconfigure

    }
}