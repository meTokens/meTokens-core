pragma solidity ^0.8.0;

import "./BancorZeroFormula.sol";
import "../interfaces/I_Hub.sol";
import "../interfaces/I_ValueSet.sol";
import "../interfaces/I_Migrations.sol";


/// @title Bancor curve registry and calculator
/// @author Carl Farterson (@carlfarterson)
/// @notice Uses BancorZeroFormula.sol for private methods
contract BancorZeroFormulaValues is I_ValueSet, BancorZeroFormula {

    // NOTE: each valueSet is for a curve
    struct ValueSet {
		uint256 base_x;
		uint256 base_y;
		uint256 reserveWeight;
        bool updating;
	}
    struct TargetValueSet {
        uint256 base_x;
		uint256 base_y;
		uint256 reserveWeight;
        uint256 startTime;
        uint256 endTime;
    }


    event Updated(uint256 indexed hubId);

    // NOTE: keys will be the hub
	mapping (uint256 => ValueSet) private valueSets;
	mapping (uint256 => TargetValueSet) private targetValueSets;

    I_Hub public hub;
    I_Migrations public migrations;

    constructor(
        address _hub,
        address _migrations
    ) {
        hub = I_Hub(_hub);
        migrations = I_Migrations(_migrations);
    }


    /// @inheritdoc I_ValueSet
	function registerValueSet(
        uint256 _hubId,
        bytes32 _encodedValueSet
    ) external override {
        // TODO: access control

        (uint256 x, uint256 y, uint256 r) = validate(_encodedValueSet);

        ValueSet memory valueSet = ValueSet(x, y, r, false);
        valueSets[_hubId] = valueSet;
    }

    function registerValueSet(
        uint256 _hubId,
        bytes32 _encodedValueSet,
        uint256 _startTime,
        uint256 _endTime
    ) external override {
        // TODO: access control

        (uint256 x, uint256 y, uint256 r) = validate(_encodedValueSet);

        ValueSet memory valueSet = ValueSet(x, y, r, _startTime, _endTime);
        valueSets[_hubId] = valueSet;
    }


    /// TODO: natspec
    function validate(bytes32 _encodedValueSet) public returns (
        uint256 base_x,
        uint256 base_y,
        uint256 reserveWeight
    )
    {
        (base_x, base_y, reserveWeight) = abi.decode(_encodedValueSet, (uint256, uint256, uint256));
        _validate(base_x, base_y, reserveWeight);
    }


    function _validate(uint256 _base_x, uint256 _base_y, uint256 _reserveWeight) private {
        require(base_x > 0 && base_x <= PRECISION, "base_x not in range");
        require(base_y > 0 && base_y <= PRECISION, "base_y not in range");
        require(reserveWeight > 0 && reserveWeight <= MAX_WEIGHT, "reserveWeight not in range");
    }



    /// @inheritdoc I_ValueSet
    function calculateMintReturn(
        uint256 _depositAmount,
        uint256 _hubId,
        uint256 _supply,
        uint256 _balancePooled
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
                v.base_x,
                v.base_y
            );
        }

        if (v.updating) {
            // Calculate return using weights
            TargetValueSet memory t = targetValueSets[_hubId];

            // Only calculate weighted amount if update is live
            if (t.startTime > block.timestamp) {
                if (_supply > 0) {
                    uint256 targetMeTokenAmount = _calculateMintReturn(
                        _depositAmount,
                        t.reserveWeight,
                        _supply,
                        _balancePooled
                    );
                } else {
                    // TODO: can supply == 0 when updating?
                    uint256 targetMeTokenAmount = _calculateMintReturnFromZero(
                        _depositAmount,
                        t.reserveWeight,
                        t.base_x,
                        t.base_y
                    );
                }
                meTokenAmount = _calculateWeightedAmount(
                    meTokenAmount,
                    targetMeTokenAmount,
                    _hubId,
                    t.startTime,
                    t.endTime
                );
            }
        }
    }


    /// @inheritdoc I_ValueSet
    function calculateBurnReturn(
        uint256 _burnAmount,
        uint256 _hubId,
        uint256 _supply,
        uint256 _balancePooled
    ) external view override returns (uint256 collateralTokenAmount) {

        ValueSet memory v = valueSets[_hubId];
        collateralTokenAmount = _calculateBurnReturn(
            _burnAmount,
            v.reserveWeight,
            _supply,
            _balancePooled
        );
        
        if (v.updating) {
            // Calculate return using weights
            TargetValueSet memory t = targetValueSets[_hubId];
            uint256 targetCollateralTokenAmount =  (
                _burnAmount,
                t.reserveWeight,
                _supply,
                _balancePooled
            );
            collateralTokenAmount = _calculateWeightedAmount(
                collateralTokenAmount,
                targetCollateralTokenAmount,
                _hubId,
                t.startTime,
                t.endTime
            );
        }
    }

}
