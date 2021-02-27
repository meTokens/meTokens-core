pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Initializable.sol";

import "./Power.sol";

 /**
 * @title Bancor formula by Bancor
 * @dev Modified from the original by Slava Balasanov
 * https://github.com/bancorprotocol/contracts
 * Split Power.sol out from BancorFormula.sol and replace SafeMath formulas with zeppelin's SafeMath
 * Licensed to the Apache Software Foundation (ASF) under one or more contributor license agreements;
 * and to You under the Apache License, Version 2.0. "
 */
contract BancorZeroFormula is Initializable, Power {
   string public version;
   uint32 public MAX_WEIGHT;

   function initialize() public initializer {
     MAX_WEIGHT = 1000000;
     version = "0.3";
   }

   /**
   * @dev given a token supply, connector balance, weight and a deposit amount (in the connector token),
   * calculates the return for a given conversion (in the main token)
   *
   * Formula:
   * Return = _supply * ((1 + _depositAmount / _balancePooled) ^ (_reserveWeight / 1000000) - 1)
   *
   * @param _supply              token total supply
   * @param _balancePooled    total connector balance
   * @param _reserveWeight     connector weight, represented in ppm, 1-1000000
   * @param _depositAmount       deposit amount, in connector token
   *
   *  @return purchase return amount
   * TODO - add if _supply = 0, then use calculateMintReturnFromZero()
  */
  function _calculateMintReturn(
    uint256 _supply,
    uint256 _balancePooled,
    uint32 _reserveWeight,
    uint256 _depositAmount
    ) private view returns (uint256 meTokenAmountReturned) {
    // validate input
    require(_supply > 0 && _balancePooled > 0 && _reserveWeight > 0 && _reserveWeight <= MAX_WEIGHT);
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

  /**
   * TODO - verify function
  */
  // https://www.notion.so/Economic-Modeling-f7a9e5a5a41b480490628079c794352d#6f090de4a7b34dd68d2c40b76b5f8700
  function _calculateMintReturnFromZero(
    uint256 _base_x, 
    uint256 _base_y, 
    uint32 _reserveWeight, 
    uint256 _depositAmount
  ) private returns (uint256 meTokenAmountReturned) {
      uint256 numerator = _base_y;
      uint256 exponent = (1/_reserveWeight -1);
      uint256 denominator = _base_x ** exponent;
      meTokenAmountReturns = numerator/denominator * _depositAmount** exponent;
  }

   /**
   * @dev given a token supply, connector balance, weight and a sell amount (in the main token),
   * calculates the return for a given conversion (in the connector token)
   *
   * Formula:
   * Return = _balancePooled * (1 - (1 - _sellAmount / _supply) ^ (1 / (_reserveWeight / 1000000)))
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
    uint32 _reserveWeight,
    uint256 _sellAmount
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