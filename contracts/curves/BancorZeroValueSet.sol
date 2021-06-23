// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "./BancorZeroFormula.sol";
import "../interfaces/I_Hub.sol";
import "../interfaces/I_Updater.sol";
import "../interfaces/I_CurveValueSet.sol";
import "../interfaces/I_Migrations.sol";
import "../libs/WeightedAverage.sol";
import "../utils/Power.sol";


/// @title Bancor curve registry and calculator
/// @author Carl Farterson (@carlfarterson)
/// @notice Uses BancorZeroFormula.sol for private methods
abstract contract BancorZeroValueSet is I_CurveValueSet, BancorZeroFormula {

    uint256 private BASE_X = PRECISION;

    // NOTE: each valueSet is for a curve
    struct ValueSet {
		uint256 baseY;
		uint32 reserveWeight;
	}
    
    struct TargetValueSet {
		uint256 baseY;
		uint32 reserveWeight;
    }


    event Updated(uint256 indexed hubId);

    // NOTE: keys will be the hub
	mapping (uint256 => ValueSet) private valueSets;
	mapping (uint256 => TargetValueSet) private targetValueSets;

    I_Hub public hub;
    I_Migrations public migrations;
    I_Updater public updater;

    constructor(
        address _hub,
        address _migrations,
        address _updater
    ) {
        hub = I_Hub(_hub);
        migrations = I_Migrations(_migrations);
        updater = I_Updater(_updater);
    }


    /// @inheritdoc I_CurveValueSet
	function registerValueSet(
        uint256 _hubId,
        bytes calldata _encodedValueSet
    ) external override {
        require(msg.sender == address(hub) || msg.sender == address(updater), "!hub && !updater");

        (uint256 baseY, uint256 reserveWeight) = abi.decode(_encodedValueSet, (uint256, uint32));
        require(baseY > 0 && baseY <= PRECISION*PRECISION, "baseY not in range");
        require(reserveWeight > 0 && reserveWeight <= MAX_WEIGHT, "reserveWeight not in range");

        ValueSet memory valueSet = ValueSet({
            baseY: baseY,
            reserveWeight: reserveWeight
        });
        valueSets[_hubId] = valueSet;
    }


    /// @inheritdoc I_CurveValueSet
    function registerTargetValueSet(
        uint256 _hubId,
        bytes calldata _encodedValueSet
    ) external override {
        require(msg.sender == address(updater), "!updater");

        (uint256 targetReserveWeight) = abi.decode(_encodedValueSet, (uint32));
        require(targetReserveWeight > 0 && targetReserveWeight <= MAX_WEIGHT, "reserveWeight not in range");

        // New baseY = (old baseY * oldR) / newR
        ValueSet memory valueSet = valueSets[_hubId];
        uint256 targetBaseY = (valueSet.baseY * valueSet.reserveWeight) / targetReserveWeight;

        TargetValueSet memory targetValueSet = TargetValueSet({
            baseY: targetBaseY,
            reserveWeight: targetReserveWeight
        });
        targetValueSets[_hubId] = targetValueSet;
    }



    /// @inheritdoc I_CurveValueSet
    function calculateMintReturn(
        uint256 _depositAmount,
        uint256 _hubId,
        uint256 _supply,
        uint256 _balancePooled,
        bool _reconfiguring,
        uint256 _startTime,
        uint256 _endTime
    ) external view override returns (uint256 meTokenAmount) {

        ValueSet memory v = valueSets[_hubId];
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

        if (_reconfiguring) {

            // Only calculate weighted amount if update is live
            if (block.timestamp > _startTime) {

                // Calculate return using weights
                TargetValueSet memory t = targetValueSets[_hubId];
                uint256 targetMeTokenAmount;
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
                    _startTime,
                    block.timestamp,
                    _endTime
                );

            }
        }
    }


    /// @inheritdoc I_CurveValueSet
    function calculateBurnReturn(
        uint256 _burnAmount,
        uint256 _hubId,
        uint256 _supply,
        uint256 _balancePooled,
        bool _reconfiguring,
        uint256 _startTime,
        uint256 _endTime
    ) external view override returns (uint256 collateralTokenAmount) {

        ValueSet memory v = valueSets[_hubId];
        collateralTokenAmount = _calculateBurnReturn(
            _burnAmount,
            v.reserveWeight,
            _supply,
            _balancePooled
        );
        
        if (_reconfiguring) {
            // TODO: this is passed with arguments, more succinct way?
            // (uint256 startTime, uint256 endTime) = updater.getUpdateTimes(_hubId);

            // Only calculate weighted amount if update is live
            if (block.timestamp > _startTime) {

                // Calculate return using weights
                TargetValueSet memory t = targetValueSets[_hubId];
                uint256 targetCollateralTokenAmount =  _calculateBurnReturn(
                    _burnAmount,
                    t.reserveWeight,
                    _supply,
                    _balancePooled
                );

                collateralTokenAmount = WeightedAverage.calculate(
                    collateralTokenAmount,
                    targetCollateralTokenAmount,
                    _startTime,
                    block.timestamp,
                    _endTime
                );
            }
        }
    }

    // TODO: natspec
    function finishUpdate(uint256 _hubId) external override {

        ValueSet storage v = valueSets[_hubId];
        TargetValueSet storage t = targetValueSets[_hubId];

        v.baseY = t.baseY;
        v.reserveWeight = t.reserveWeight;

        delete(targetValueSets[_hubId]);
        emit Updated(_hubId);
    }

}
