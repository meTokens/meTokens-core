// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

import "../../interfaces/ICurveValueSet.sol";
import "../formulas/BancorZeroFormula.sol";
import "../../libs/WeightedAverage.sol";
import "../../interfaces/IUpdater.sol";



/// @title Bancor curve registry and calculator
/// @author Carl Farterson (@carlfarterson)
/// @notice Uses BancorZeroFormula.sol for private methods
contract BancorZeroValueSet is ICurveValueSet, BancorZeroFormula, Ownable {

    uint private BASE_X = PRECISION;

    // NOTE: each valueSet is for a curve
    struct ValueSet {
		uint baseY;
		uint32 reserveWeight;
	}
    
    struct TargetValueSet {
		uint baseY;
		uint32 reserveWeight;
    }

    // NOTE: keys will be the hub
	mapping (uint => ValueSet) private valueSets;
	mapping (uint => TargetValueSet) private targetValueSets;

    IUpdater public updater;

    constructor() {}

    function init(address _updater) external onlyOwner {
        updater = IUpdater(_updater);
    }


    /// @inheritdoc ICurveValueSet
	function register(
        uint id,
        bytes calldata _encodedValueSet
    ) external override {
        // TODO: access control

        (uint baseY, uint reserveWeight) = abi.decode(_encodedValueSet, (uint, uint32));
        require(baseY > 0 && baseY <= PRECISION*PRECISION, "baseY not in range");
        require(reserveWeight > 0 && reserveWeight <= MAX_WEIGHT, "reserveWeight not in range");

        ValueSet memory valueSet = ValueSet({
            baseY: baseY,
            reserveWeight: uint32(reserveWeight)
        });
        valueSets[id] = valueSet;
    }


    /// @inheritdoc ICurveValueSet
    function registerTarget(
        uint id,
        bytes calldata _encodedValueSet
    ) external override {
        // TODO: access control

        (uint targetReserveWeight) = abi.decode(_encodedValueSet, (uint32));

        // TODO: also require targetReserveWeight != currentReserveWeight
        require(targetReserveWeight > 0 && targetReserveWeight <= MAX_WEIGHT, "reserveWeight not in range");

        // New baseY = (old baseY * oldR) / newR
        ValueSet memory valueSet = valueSets[id];
        uint targetBaseY = (valueSet.baseY * valueSet.reserveWeight) / targetReserveWeight;

        TargetValueSet memory targetValueSet = TargetValueSet({
            baseY: targetBaseY,
            reserveWeight: uint32(targetReserveWeight)
        });
        targetValueSets[id] = targetValueSet;
    }



    /// @inheritdoc ICurveValueSet
    function calculateMintReturn(
        uint _depositAmount,
        uint id,
        uint _supply,
        uint _balancePooled
    ) external view override returns (uint meTokenAmount) {

        ValueSet memory v = valueSets[id];
        if (_supply > 0) {
            meTokenAmount = _calculateMintReturn(
                _depositAmount,
                v.reserveWeight,
                _supply,
                _balancePooled
            );
        } else {
            meTokenAmount = _calculateMintReturnFromZero(
                _depositAmount,
                v.reserveWeight,
                BASE_X,
                v.baseY
            );
        }

        // check the updater to see if the curve is reconfiguring
        if (updater.isReconfiguring(id)) {

            (uint startTime, uint endTime) = updater.getUpdateTimes(id);

            // Only calculate weighted amount if update is live
            if (block.timestamp > startTime) {

                // Calculate return using weights
                TargetValueSet memory t = targetValueSets[id];
                uint targetMeTokenAmount;
                if (_supply > 0) {
                    targetMeTokenAmount = _calculateMintReturn(
                        _depositAmount,
                        t.reserveWeight,
                        _supply,
                        _balancePooled
                    );
                } else {
                    targetMeTokenAmount = _calculateMintReturnFromZero(
                        _depositAmount,
                        t.reserveWeight,
                        BASE_X,
                        t.baseY
                    );
                }
                
                meTokenAmount = WeightedAverage.calculate(
                    meTokenAmount,
                    targetMeTokenAmount,
                    startTime,
                    block.timestamp,
                    endTime
                );

            }
        }
    }


    /// @inheritdoc ICurveValueSet
    function calculateBurnReturn(
        uint _burnAmount,
        uint id,
        uint _supply,
        uint _balancePooled
    ) external view override returns (uint collateralTokenAmount) {

        ValueSet memory v = valueSets[id];
        collateralTokenAmount = _calculateBurnReturn(
            _burnAmount,
            v.reserveWeight,
            _supply,
            _balancePooled
        );

        if (updater.isReconfiguring(id)) {

            (uint startTime, uint endTime) = updater.getUpdateTimes(id);

            // Only calculate weighted amount if update is live
            if (block.timestamp > startTime) {

                // Calculate return using weights
                TargetValueSet memory t = targetValueSets[id];
                uint targetCollateralTokenAmount =  _calculateBurnReturn(
                    _burnAmount,
                    t.reserveWeight,
                    _supply,
                    _balancePooled
                );

                collateralTokenAmount = WeightedAverage.calculate(
                    collateralTokenAmount,
                    targetCollateralTokenAmount,
                    startTime,
                    block.timestamp,
                    endTime
                );
            }
        }
    }

    // TODO: natspec
    function finishUpdate(uint id) external override {

        ValueSet storage v = valueSets[id];
        TargetValueSet storage t = targetValueSets[id];

        v.baseY = t.baseY;
        v.reserveWeight = t.reserveWeight;

        delete(targetValueSets[id]);
        emit Updated(id);
    }

}
