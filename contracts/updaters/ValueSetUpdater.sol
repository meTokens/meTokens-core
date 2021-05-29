pragma solidity ^0.8.0;

import "../interfaces/I_Hub.sol";

contract ValueSetUpdater {

    I_Hub public hub;

    struct TargetValueSet {
        // uint base_x;
        // uint base_y;
        // uint256 reserveWeight;
        bytes32 encodedArgs;

        uint256 startTime;
        uint256 endTime;
        // bool targetReached;
    }

    constructor(address _hub) {
        hub = _hub;
    }


    function reconfigure(
        uint256 _hubId,
        bytes32 _encodedTargetValueSet,
        uint256 _startTime,
        uint256 _endTime
    ) external override {

        require(msg.sender == hub.getHubOwner(_hubId), "msg.sender not hub owner");
        require(hub.getHubStatus(_hubId) == 2, "!ACTIVE");

        curve = I_Curve(hub.getHubCurve(_hubId));
        curve.validate(_encodedTargetValueSet);

        TargetValueSet memory targetValueSet = TargetValueSet(_encodedTargetValueSet, _startTime, _endTime);
        targetValueSets[_hubId] = targetValueSet;

        hub.setHubStatus(_hubId, 3); // 3 = "Reconfigure

        // TODO: determine where to place these requires so that a new curve 
        //  will include them within their `updateValueSet()`
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
    }
}