pragma solidity ^0.8.0;

import "../interfaces/I_Hub.sol";
import "../interfaces/I_Updater.sol"; // TODO

contract ValueSetUpdater {

    I_Hub public hub;
    I_Updater public updater;

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

        require(msg.sender == updater, "!updater");
        require(hub.getHubStatus(_hubId) == 2, "!ACTIVE");

        curve = I_Curve(hub.getHubCurve(_hubId));
        curve.registerTargetValueSet(_hubId, _encodedTargetValueSet, _startTime, _endTime);


        curve.validate(_encodedTargetValueSet);

        TargetValueSet memory targetValueSet = TargetValueSet(_encodedTargetValueSet, _startTime, _endTime);
        targetValueSets[_hubId] = targetValueSet;

        hub.setHubStatus(_hubId, 3); // 3 = "Reconfigure

    }
}