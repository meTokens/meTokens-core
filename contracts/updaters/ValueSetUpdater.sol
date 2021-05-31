pragma solidity ^0.8.0;

import "../interfaces/I_Hub.sol";
import "../interfaces/I_Updater.sol"; // TODO

contract ValueSetUpdater {

    I_Hub public hub;
    I_Updater public updater;

    struct TargetValueSet {
        // uint base_x;
        // uint base_y;
        // uint256 reserveWeight;
        bytes32 encodedArgs;
        uint256 startTime;
        uint256 endTime;
        // bool targetReached;
    }

    constructor(address _hub, address _updater) {
        hub = _hub;
        updater = _updater;
    }


    function reconfigure(
        uint256 _hubId,
        bytes32 _encodedTargetValueSet,
        uint256 _startTime,
        uint256 _endTime
    ) external override {

        // TODO: determine where to place these
        require(
            _startTime - block.timestamp >= updater.minSecondsUntilStart() &&
            _startTime - block.timestamp <= updater.maxSecondsUntilStart(),
            "Unacceptable _startTime"
        );
        require(
            _endTime - _startTime >= updater.minUpdateDuration() &&
            _endTime - _startTime <= updater.maxUpdateDuration(),
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