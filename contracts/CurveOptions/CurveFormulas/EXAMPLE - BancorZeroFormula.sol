pragma solidity ^0.5.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
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
  using SafeMath for uint256;
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
  function calculateMintReturn(
    uint256 _supply,
    uint256 _balancePooled,
    uint32 _reserveWeight,
    uint256 _depositAmount) public view returns (uint256)
  {
    /** if (_supply == 0, ){
      calculateMintReturnFromZero(base_x, base_y, _reserveWeight, _depositAmount)
    } else **/
  

    // validate input
    require(_supply > 0 && _balancePooled > 0 && _reserveWeight > 0 && _reserveWeight <= MAX_WEIGHT);
     // special case for 0 deposit amount
    if (_depositAmount == 0) {
      return 0;
    }
     // special case if the weight = 100%
    if (_reserveWeight == MAX_WEIGHT) {
      return _supply.mul(_depositAmount).div(_balancePooled);
    }
     uint256 result;
    uint8 precision;
    uint256 baseN = _depositAmount.add(_balancePooled);
    (result, precision) = power(
      baseN, _balancePooled, _reserveWeight, MAX_WEIGHT
    );
    uint256 newTokenSupply = _supply.mul(result) >> precision;
    return newTokenSupply - _supply;
  }

  /**
   * TODO - verify function
  */
  // https://www.notion.so/Economic-Modeling-f7a9e5a5a41b480490628079c794352d#6f090de4a7b34dd68d2c40b76b5f8700
  function calculateMintReturnFromZero(
    uint256 _base_x, 
    uint256 _base_y, 
    uint32 _reserveWeight, 
    uint256 _depositAmount
  ) 
    public 
    view 
    returns (uint256 meTokenAmountReturned) {
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
  function calculateBurnReturn(
    uint256 _supply,
    uint256 _balancePooled,
    uint32 _reserveWeight,
    uint256 _sellAmount) public view returns (uint256)
  {
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
      return _balancePooled.mul(_sellAmount).div(_supply);
    }
     uint256 result;
    uint8 precision;
    uint256 baseD = _supply - _sellAmount;
    (result, precision) = power(
      _supply, baseD, MAX_WEIGHT, _reserveWeight
    );
    uint256 oldBalance = _balancePooled.mul(result);
    uint256 newBalance = _balancePooled << precision;
    return oldBalance.sub(newBalance).div(result);
  }
}