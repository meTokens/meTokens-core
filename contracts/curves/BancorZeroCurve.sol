// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../interfaces/ICurve.sol";
import "../interfaces/IUpdater.sol";

import "../libs/WeightedAverage.sol";

import "../utils/Power.sol";


/// @title Bancor curve registry and calculator
/// @author Carl Farterson (@carlfarterson)
contract BancorZeroCurve is ICurve, Power {

    uint private PRECISION = 10**18;
    uint private BASE_X = PRECISION;
    uint32 private MAX_WEIGHT = 1000000;

    struct ValueSet {
		uint baseY;
		uint32 reserveWeight;

        uint targetBaseY;
        uint32 targetReserveWeight;
	}

    // NOTE: keys will be the hub
	mapping (uint => ValueSet) private valueSets;

    // IUpdater public updater;

    constructor() {
        // updater = IUpdater(_updater);
    }

    /// @inheritdoc ICurve
	function register(
        uint _hubId,
        bytes calldata _encodedValueSet
    ) external override {
        // TODO: access control

        (uint baseY, uint reserveWeight) = abi.decode(_encodedValueSet, (uint, uint32));
        require(baseY > 0 && baseY <= PRECISION*PRECISION, "baseY not in range");
        require(reserveWeight > 0 && reserveWeight <= MAX_WEIGHT, "reserveWeight not in range");

        ValueSet storage newValueSet = valueSets[_hubId];
        newValueSet.baseY = baseY;
        newValueSet.reserveWeight = uint32(reserveWeight);
    }


    /// @inheritdoc ICurve
    function registerTarget(
        uint _hubId,
        bytes calldata _encodedValueSet
    ) external override {
        // TODO: access control

        (uint targetReserveWeight) = abi.decode(_encodedValueSet, (uint32));

        // TODO: also require targetReserveWeight != currentReserveWeight
        require(targetReserveWeight > 0 && targetReserveWeight <= MAX_WEIGHT, "reserveWeight not in range");

        // New baseY = (old baseY * oldR) / newR
        ValueSet storage valueSet = valueSets[_hubId];
        // NOTE: this variable can be set below if stack 2 deep
        uint targetBaseY = (valueSet.baseY * valueSet.reserveWeight) / targetReserveWeight;

        valueSet.targetBaseY = targetBaseY;
        valueSet.targetReserveWeight = uint32(targetReserveWeight);
    }



    /// @inheritdoc ICurve
    function calculateMintReturn(
        uint _tokensDeposited,
        uint _hubId,
        uint _supply,
        uint _balancePooled
    ) external view override returns (uint meTokensReturned) {

        ValueSet memory valueSet = valueSets[_hubId];
        if (_supply > 0) {
            meTokensReturned = _calculateMintReturn(
                _tokensDeposited,
                valueSet.reserveWeight,
                _supply,
                _balancePooled
            );
        } else {
            meTokensReturned = _calculateMintReturnFromZero(
                _tokensDeposited,
                valueSet.reserveWeight,
                BASE_X,
                valueSet.baseY
            );
        }

//        // check the updater to see if the curve is reconfiguring
//        if (updater.isReconfiguring(id)) {
//
//            (uint startTime, uint endTime) = updater.getUpdateTimes(id);
//
//            // Only calculate weighted amount if update is live
//            if (block.timestamp > startTime) {
//
//                // Calculate return using weights
//                TargetValueSet memory t = targetValueSets[id];
//                uint targetMeTokensReturned;
//                if (_supply > 0) {
//                    targetMeTokensReturned = _calculateMintReturn(
//                        _tokensDeposited,
//                        t.reserveWeight,
//                        _supply,
//                        _balancePooled
//                    );
//                } else {
//                    targetMeTokensReturned = _calculateMintReturnFromZero(
//                        _tokensDeposited,
//                        t.reserveWeight,
//                        BASE_X,
//                        t.baseY
//                    );
//                }
//
//                meTokensReturned = WeightedAverage.calculate(
//                    meTokensReturned,
//                    targetMeTokensReturned,
//                    startTime,
//                    block.timestamp,
//                    endTime
//                );
//
//            }
//        }
    }


    /// @inheritdoc ICurve
    function calculateBurnReturn(
        uint _meTokensBurned,
        uint _hubId,
        uint _supply,
        uint _balancePooled
    ) external view override returns (uint tokensReturned) {

        ValueSet memory valueSet = valueSets[_hubId];
        tokensReturned = _calculateBurnReturn(
            _meTokensBurned,
            valueSet.reserveWeight,
            _supply,
            _balancePooled
        );

//        if (updater.isReconfiguring(id)) {
//
//            (uint startTime, uint endTime) = updater.getUpdateTimes(id);
//
//            // Only calculate weighted amount if update is live
//            if (block.timestamp > startTime) {
//
//                // Calculate return using weights
//                TargetValueSet memory t = targetValueSets[id];
//                uint targetTokensReturned =  _calculateBurnReturn(
//                    _meTokensBurned,
//                    t.reserveWeight,
//                    _supply,
//                    _balancePooled
//                );
//
//                tokensReturned = WeightedAverage.calculate(
//                    tokensReturned,
//                    targetTokensReturned,
//                    startTime,
//                    block.timestamp,
//                    endTime
//                );
//            }
//        }
    }

    // TODO: natspec
    function finishUpdate(uint _hubId) external override {

        ValueSet storage valueSet = valueSets[_hubId];

        valueSet.baseY = valueSet.targetBaseY;
        valueSet.reserveWeight = valueSet.targetReserveWeight;

        emit Updated(_hubId);
    }

    /// @notice Given a deposit amount (in the connector token), connector weight, meToken supply and 
    ///     calculates the return for a given conversion (in the meToken)
    /// @dev _supply * ((1 + _tokensDeposited / _balancePooled) ^ (_reserveWeight / 1000000) - 1)
    /// @param _tokensDeposited   amount of collateral tokens to deposit
    /// @param _reserveWeight   connector weight, represented in ppm, 1 - 1,000,000
    /// @param _supply          current meToken supply
    /// @param _balancePooled   total connector balance
    /// @return amount of meTokens minted
    function _calculateMintReturn(
        uint256 _tokensDeposited,
        uint32 _reserveWeight,
        uint256 _supply,
        uint256 _balancePooled
    ) private view returns (uint256) {
        // validate input
        require(_balancePooled > 0 && _reserveWeight > 0 && _reserveWeight <= MAX_WEIGHT);
        // special case for 0 deposit amount
        if (_tokensDeposited == 0) {
            return 0;
        }
        // special case if the weight = 100%
        if (_reserveWeight == MAX_WEIGHT) {
            return _supply * _tokensDeposited / _balancePooled;
        }

        uint8 precision;
        uint256 result;
        uint256 baseN = _tokensDeposited + _balancePooled;
        (result, precision) = power(
            baseN, _balancePooled, _reserveWeight, MAX_WEIGHT
        );
        uint256 newTokenSupply = _supply * result >> precision;
        return newTokenSupply - _supply;
    }


    /// @notice Given a deposit amount (in the collateral token,) meToken supply of 0, connector weight,
    ///     constant x and constant y, calculates the return for a given conversion (in the meToken)
    /// @dev _baseX and _baseY are needed as Bancor formula breaks from a divide-by-0 when supply = 0
    /// @param _tokensDeposited   amount of collateral tokens to deposit
    /// @param _reserveWeight   connector weight, represented in ppm, 1 - 1,000,000
    /// @param _baseX          constant X 
    /// @param _baseY          constant y
    /// @return amount of meTokens minted
    function _calculateMintReturnFromZero(
        uint256 _tokensDeposited,
        uint256 _reserveWeight,
        uint256 _baseX,
        uint256 _baseY
    ) private view returns (uint256) {
        uint256 numerator = _baseY;
        uint256 exponent = (PRECISION/_reserveWeight - PRECISION);
        uint256 denominator = _baseX ** exponent;
        return numerator * _tokensDeposited** exponent / denominator;
    }


    /// @notice Given an amount of meTokens to burn, connector weight, supply and collateral pooled,
    ///     calculates the return for a given conversion (in the collateral token)
    /// @dev _balancePooled * (1 - (1 - _meTokensBurned / _supply) ^ (1 / (_reserveWeight / 1000000)))
    /// @param _meTokensBurned          amount of meTokens to burn
    /// @param _reserveWeight       connector weight, represented in ppm, 1 - 1,000,000
    /// @param _supply              current meToken supply
    /// @param _balancePooled       total connector balance
    /// @return amount of collateral tokens received
    function _calculateBurnReturn(
        uint256 _meTokensBurned,
        uint32 _reserveWeight,
        uint256 _supply,
        uint256 _balancePooled
    ) private view returns (uint256) {
        // validate input
        require(_supply > 0 && _balancePooled > 0 && _reserveWeight > 0 && _reserveWeight <= MAX_WEIGHT && _meTokensBurned <= _supply);
        // special case for 0 sell amount
        if (_meTokensBurned == 0) {
            return 0;
        }
        // special case for selling the entire supply
        if (_meTokensBurned == _supply) {
            return _balancePooled;
        }
        // special case if the weight = 100%
        if (_reserveWeight == MAX_WEIGHT) {
            return _balancePooled * _meTokensBurned / _supply;
        }

        uint256 result;
        uint8 precision;
        uint256 baseD = _supply - _meTokensBurned;
        (result, precision) = power(
            _supply, baseD, MAX_WEIGHT, _reserveWeight
        );
        uint256 oldBalance = _balancePooled * result;
        uint256 newBalance = _balancePooled << precision;

        return (oldBalance - newBalance) / result;
    }

}