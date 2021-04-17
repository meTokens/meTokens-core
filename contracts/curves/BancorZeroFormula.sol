pragma solidity ^0.8.0;

import "../utils/Power.sol";

/// @title Bancor formula by Bancor
/// @author Carl Farterson (@carlfarterson), originally by Slava Blasanov
/// @notice All private methods used for BancorZeroValueSet.sol
/// Licensed to the Apache Software Foundation (ASF) under one or more contributor license agreements;
/// and to You under the Apache License, Version 2.0. "
contract BancorZeroFormula is Power {

   uint32 public MAX_WEIGHT = 1000000;
   uint256 private PRECISION = 10**18;

    /**
    @notice given a token supply, connector balance, weight and a deposit amount (in the connector token),
        calculates the return for a given conversion (in the main token)

    @dev _supply * ((1 + _depositAmount / _balancePooled) ^ (_reserveWeight / 1000000) - 1)
    @param _supply              token total supply
    @param _balancePooled    total connector balance
    @param _reserveWeight     connector weight, represented in ppm, 1-1000000
    @param _depositAmount       deposit amount, in connector token
    @return purchase return amount
    */
    function _calculateMintReturn(
        uint256 _supply,
        uint256 _balancePooled,
        uint32 _reserveWeight,
        uint256 _depositAmount
    ) private view returns (uint256 meTokenAmountReturned) {
        // validate input
        require(_balancePooled > 0 && _reserveWeight > 0 && _reserveWeight <= MAX_WEIGHT);
        // special case for 0 deposit amount
        if (_depositAmount == 0) {
            return 0;
        }
        // special case if the weight = 100%
        if (_reserveWeight == MAX_WEIGHT) {
            return _supply * _depositAmount / _balancePooled;
        }

        uint8 precision;
        uint256 result;
        uint256 baseN = _depositAmount + _balancePooled;
        (result, precision) = power(
            baseN, _balancePooled, _reserveWeight, MAX_WEIGHT
        );
        uint256 newTokenSupply = _supply * result >> precision;
        meTokenAmountReturned = newTokenSupply - _supply;
    }

    /// @notice TODO
    /// @param _base_x
    /// @param _base_y
    /// @param _depositAmount
    /// @param _reserveWeight
    /// @return purchase return amount when supply = 0
    function _calculateMintReturnFromZero(
        uint256 _base_x, 
        uint256 _base_y, 
        uint256 _depositAmount,
        uint32 _reserveWeight 
    ) private view returns (uint256 meTokenAmountReturned) {
        uint256 numerator = _base_y;
        uint256 exponent = (PRECISION/_reserveWeight - PRECISION);
        uint256 denominator = _base_x ** exponent;
        meTokenAmountReturns = numerator/denominator * _depositAmount** exponent;
    }

    /**
    * @notice given a token supply, connector balance, weight and a sell amount (in the main token),
    * calculates the return for a given conversion (in the connector token)
    *
    * @notice Return = _balancePooled * (1 - (1 - _sellAmount / _supply) ^ (1 / (_reserveWeight / 1000000)))
    *
    * @param _supply              token total supply
    * @param _balancePooled    total connector
    * @param _reserveWeight     constant connector Weight, represented in ppm, 1-1000000
    * @param _sellAmount          sell amount, in the token itself
    *
    * @return sale return amount
    */
    function _calculateBurnReturn(
        uint256 _supply,
        uint256 _balancePooled,
        uint256 _sellAmount,
        uint32 _reserveWeight
    ) private view returns (uint256 reserveTokenAmountReturned) {
        // validate input
        require(_supply > 0 && _balancePooled > 0 && _reserveWeight > 0 && _reserveWeight <= MAX_WEIGHT && _sellAmount <= _supply);
        // special case for 0 sell amount
        if (_sellAmount == 0) {
            return 0;
        }
        // special case for selling the entire supply
        if (_sellAmount == _supply) {
            return _balancePooled;
        }
        // special case if the weight = 100%
        if (_reserveWeight == MAX_WEIGHT) {
            return _balancePooled * _sellAmount / _supply;
        }

        uint256 result;
        uint8 precision;
        uint256 baseD = _supply - _sellAmount;
        (result, precision) = power(
            _supply, baseD, MAX_WEIGHT, _reserveWeight
        );
        uint256 oldBalance = _balancePooled * result;
        uint256 newBalance = _balancePooled << precision;

        reserveTokenAmountReturned = (oldBalance - newBalance) / result;
    }
}