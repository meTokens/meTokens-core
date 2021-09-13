// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../../interfaces/ICurve.sol";
import "../../interfaces/ICurveRegistry.sol";

import {BancorDetails} from "../../libs/Details.sol";


contract BancorZeroRegistry {

    uint private PRECISION = 10**18;

    // NOTE: keys are their respective hubId
    mapping (uint => BancorDetails) private bancors;

    constructor() {}

	function register(
        uint _hubId,
        bytes calldata _encodedValueSet
    ) external {
        // TODO: access control

        (uint baseY, uint reserveWeight) = abi.decode(_encodedValueSet, (uint, uint32));
        require(baseY > 0 && baseY <= PRECISION*PRECISION, "baseY not in range");
        require(reserveWeight > 0 && reserveWeight <= MAX_WEIGHT, "reserveWeight not in range");

        BancorDetails storage newBancorDetails = bancors[_hubId];
        newBancorDetails.baseY = baseY;
        newBancorDetails.reserveWeight = uint32(reserveWeight);
    }

    function registerTarget(
        uint _hubId,
        bytes calldata _encodedValueSet
    ) external override {
        // TODO: access control

        (uint32 targetReserveWeight) = abi.decode(_encodedValueSet, (uint32));

        BancorDetails storage bancorDetails = bancors[_hubId];
        require(targetReserveWeight > 0 && targetReserveWeight <= MAX_WEIGHT, "reserveWeight not in range");
        require(targetReserveWeight != bancorDetails.reserveWeight, "targeReserveWeight == reserveWeight");

        // targetBaseY = (old baseY * oldR) / newR
        uint targetBaseY = (bancorDetails.baseY * bancorDetails.reserveWeight) / targetReserveWeight;

        bancorDetails.updating = true; 
        bancorDetails.targetBaseY = targetBaseY;
        bancorDetails.targetReserveWeight = targetReserveWeight;
    }

    function finishUpdate(uint _hubId) external override {
        // TODO; only hub can call
        BancorDetails storage bancorDetails = bancors[_hubId];
        bancorDetails.reserveWeight = bancorDetails.targetReserveWeight;
        bancorDetails.baseY = bancorDetails.targetBaseY;
        bancorDetails.targetReserveWeight = 0;
        bancorDetails.targetBaseY = 0;
    }

}