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

    /// @notice Given a deposit amount (in the connector token), connector weight, meToken supply and 
    ///     calculates the return for a given conversion (in the meToken)
    /// @dev _supply * ((1 + _depositAmount / _balancePooled) ^ (_reserveWeight / 1000000) - 1)
    /// @param _depositAmount           amount of collateral tokens to deposit
    /// @param _reserveWeight           connector weight, represented in ppm, 1 - 1,000,000
    /// @param _supply                  current meToken supply
    /// @param _balancePooled           total connector balance
    /// @return meTokenAmountReturned   amount of meTokens minted
    function _calculateMintReturn(
        uint256 _depositAmount,
        uint32 _reserveWeight,
        uint256 _supply,
        uint256 _balancePooled
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


    /// @notice Given a deposit amount (in the collateral token,) meToken supply of 0, connector weight,
    ///     constant x and constant y, calculates the return for a given conversion (in the meToken)
    /// @dev _base_x and _base_y are needed as Bancor formula breaks from a divide-by-0 when supply = 0
    /// @param _depositAmount           amount of collateral tokens to deposit
    /// @param _reserveWeight           connector weight, represented in ppm, 1 - 1,000,000
    /// @param _base_x                  constant X 
    /// @param _base_y                  constant y
    /// @return meTokenAmountReturned   amount of meTokens minted
    function _calculateMintReturnFromZero(
        uint256 _depositAmount,
        uint32 _reserveWeight,
        uint256 _base_x,
        uint256 _base_y
    ) private view returns (uint256 meTokenAmountReturned) {
        uint256 numerator = _base_y;
        uint256 exponent = (PRECISION/_reserveWeight - PRECISION);
        uint256 denominator = _base_x ** exponent;
        meTokenAmountReturned = numerator/denominator * _depositAmount** exponent;
    }


    /// @notice Given an amount of meTokens to burn, connector weight, supply and collateral pooled,
    ///     calculates the return for a given conversion (in the collateral token)
    /// @dev _balancePooled * (1 - (1 - _burnAmount / _supply) ^ (1 / (_reserveWeight / 1000000)))
    /// @param _burnAmount                  amount of meTokens to burn
    /// @param _reserveWeight               connector weight, represented in ppm, 1 - 1,000,000
    /// @param _supply                      current meToken supply
    /// @param _balancePooled               total connector balance
    /// @return reserveTokenAmountReturned  amount of collateral tokens received
    function _calculateBurnReturn(
        uint256 _burnAmount,
        uint32 _reserveWeight,
        uint256 _supply,
        uint256 _balancePooled
    ) private view returns (uint256 reserveTokenAmountReturned) {
        // validate input
        require(_supply > 0 && _balancePooled > 0 && _reserveWeight > 0 && _reserveWeight <= MAX_WEIGHT && _burnAmount <= _supply);
        // special case for 0 sell amount
        if (_burnAmount == 0) {
            return 0;
        }
        // special case for selling the entire supply
        if (_burnAmount == _supply) {
            return _balancePooled;
        }
        // special case if the weight = 100%
        if (_reserveWeight == MAX_WEIGHT) {
            return _balancePooled * _burnAmount / _supply;
        }

        uint256 result;
        uint8 precision;
        uint256 baseD = _supply - _burnAmount;
        (result, precision) = power(
            _supply, baseD, MAX_WEIGHT, _reserveWeight
        );
        uint256 oldBalance = _balancePooled * result;
        uint256 newBalance = _balancePooled << precision;

        reserveTokenAmountReturned = (oldBalance - newBalance) / result;
    }
}