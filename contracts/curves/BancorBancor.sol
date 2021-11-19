pragma solidity ^0.8;

import "./Power.sol";

/**
 * @title Bancor formula by Bancor
 * @dev Modified from the original by Slava Balasanov
 * https://github.com/bancorprotocol/contracts
 * Split Power.sol out from BancorFormula.sol and replace SafeMath formulas with zeppelin's SafeMath
 * Licensed to the Apache Software Foundation (ASF) under one or more contributor license agreements;
 * and to You under the Apache License, Version 2.0. "
 */
contract BancorFormula is Power {
    uint32 public MAX_WEIGHT = 1000000;

    function calculatePurchaseReturn(
        uint256 _supply,
        uint256 _connectorBalance,
        uint32 _connectorWeight,
        uint256 _depositAmount
    ) public view returns (uint256) {
        // validate input
        require(
            _supply > 0 &&
                _connectorBalance > 0 &&
                _connectorWeight > 0 &&
                _connectorWeight <= MAX_WEIGHT
        );
        // special case for 0 deposit amount
        if (_depositAmount == 0) {
            return 0;
        }
        // special case if the weight = 100%
        if (_connectorWeight == MAX_WEIGHT) {
            return (_supply * _depositAmount) / _connectorBalance;
        }
        uint256 result;
        uint8 precision;
        uint256 baseN = _depositAmount + _connectorBalance;
        (result, precision) = power(
            baseN,
            _connectorBalance,
            _connectorWeight,
            MAX_WEIGHT
        );
        uint256 newTokenSupply = (_supply * result) >> precision;
        return newTokenSupply - _supply;
    }

    /**
     * @dev given a token supply, connector balance, weight and a sell amount (in the main token),
     * calculates the return for a given conversion (in the connector token)
     *
     * Formula:
     * Return = _connectorBalance * (1 - (1 - _sellAmount / _supply) ^ (1 / (_connectorWeight / 1000000)))
     *
     * @param _supply              token total supply
     * @param _connectorBalance    total connector
     * @param _connectorWeight     constant connector Weight, represented in ppm, 1-1000000
     * @param _sellAmount          sell amount, in the token itself
     *
     * @return sale return amount
     */
    function calculateSaleReturn(
        uint256 _supply,
        uint256 _connectorBalance,
        uint32 _connectorWeight,
        uint256 _sellAmount
    ) public view returns (uint256) {
        // validate input
        require(
            _supply > 0 &&
                _connectorBalance > 0 &&
                _connectorWeight > 0 &&
                _connectorWeight <= MAX_WEIGHT &&
                _sellAmount <= _supply
        );
        // special case for 0 sell amount
        if (_sellAmount == 0) {
            return 0;
        }
        // special case for selling the entire supply
        if (_sellAmount == _supply) {
            return _connectorBalance;
        }
        // special case if the weight = 100%
        if (_connectorWeight == MAX_WEIGHT) {
            return (_connectorBalance * _sellAmount) / _supply;
        }
        uint256 result;
        uint8 precision;
        uint256 baseD = _supply - _sellAmount;
        (result, precision) = power(
            _supply,
            baseD,
            MAX_WEIGHT,
            _connectorWeight
        );
        uint256 oldBalance = _connectorBalance * result;
        uint256 newBalance = _connectorBalance << precision;
        return (oldBalance - newBalance) / result;
    }
}
