pragma solidity ^0.8;

import "../utils/ABDKMathQuad.sol";
import "./Power.sol";
import "../libs/Details.sol";
import "../interfaces/ICurve.sol";

/**
 * @title Bancor formula by Bancor
 * @dev Modified from the original by Slava Balasanov
 * https://github.com/bancorprotocol/contracts
 * Split Power.sol out from BancorFormula.sol and replace SafeMath formulas with zeppelin's SafeMath
 * Licensed to the Apache Software Foundation (ASF) under one or more contributor license agreements;
 * and to You under the Apache License, Version 2.0. "
 */
contract BancorBancor is Power, ICurve {
    using ABDKMathQuad for uint256;
    using ABDKMathQuad for bytes16;

    uint32 public MAX_WEIGHT = 1000000;
    bytes16 private immutable _baseX = uint256(1 ether).fromUInt();
    bytes16 private immutable _maxWeight = uint256(MAX_WEIGHT).fromUInt(); // gas savings
    bytes16 private immutable _one = (uint256(1)).fromUInt();
    mapping(uint256 => Details.Bancor) private _bancors;

    function register(uint256 _hubId, bytes calldata _encodedDetails)
        external
        override
    {
        // TODO: access control
        require(_encodedDetails.length > 0, "!_encodedDetails");

        (uint256 baseY, uint32 reserveWeight) = abi.decode(
            _encodedDetails,
            (uint256, uint32)
        );
        require(baseY > 0, "!baseY");
        require(
            reserveWeight > 0 && reserveWeight <= MAX_WEIGHT,
            "!reserveWeight"
        );

        Details.Bancor storage bancor_ = _bancors[_hubId];
        bancor_.baseY = baseY;
        bancor_.reserveWeight = reserveWeight;
    }

    function initReconfigure(uint256 _hubId, bytes calldata _encodedDetails)
        external
        override
    {
        // TODO: access control

        uint32 targetReserveWeight = abi.decode(_encodedDetails, (uint32));
        Details.Bancor storage bancor_ = _bancors[_hubId];

        require(targetReserveWeight > 0, "!reserveWeight");
        require(
            targetReserveWeight != bancor_.reserveWeight,
            "targetWeight!=Weight"
        );

        // targetBaseX = (old baseY * oldR) / newR
        uint256 targetBaseY = (bancor_.baseY * bancor_.reserveWeight) /
            targetReserveWeight;

        bancor_.targetBaseY = targetBaseY;
        bancor_.targetReserveWeight = targetReserveWeight;
    }

    function finishReconfigure(uint256 _hubId) external override {
        // TODO; only foundry can call
        Details.Bancor storage bancor_ = _bancors[_hubId];
        bancor_.reserveWeight = bancor_.targetReserveWeight;
        bancor_.baseY = bancor_.targetBaseY;
        bancor_.targetReserveWeight = 0;
        bancor_.targetBaseY = 0;
    }

    function getDetails(uint256 bancor)
        external
        view
        returns (Details.Bancor memory)
    {
        return _bancors[bancor];
    }

    function viewMeTokensMinted(
        uint256 _assetsDeposited,
        uint256 _hubId,
        uint256 _supply,
        uint256 _balancePooled
    ) external view override returns (uint256 meTokensMinted) {
        Details.Bancor memory bancorDetails = _bancors[_hubId];
        if (_supply > 0) {
            meTokensMinted = _viewMeTokensMinted(
                _assetsDeposited,
                bancorDetails.reserveWeight,
                _supply,
                _balancePooled
            );
        } else {
            meTokensMinted = _viewMeTokensMintedFromZero(
                _assetsDeposited,
                bancorDetails.reserveWeight,
                bancorDetails.baseY
            );
        }
    }

    function viewTargetMeTokensMinted(
        uint256 _assetsDeposited,
        uint256 _hubId,
        uint256 _supply,
        uint256 _balancePooled
    ) external view override returns (uint256 meTokensMinted) {
        Details.Bancor memory bancorDetails = _bancors[_hubId];
        if (_supply > 0) {
            meTokensMinted = _viewMeTokensMinted(
                _assetsDeposited,
                bancorDetails.targetReserveWeight,
                _supply,
                _balancePooled
            );
        } else {
            meTokensMinted = _viewMeTokensMintedFromZero(
                _assetsDeposited,
                bancorDetails.targetReserveWeight,
                bancorDetails.targetBaseY
            );
        }
    }

    function viewAssetsReturned(
        uint256 _meTokensBurned,
        uint256 _hubId,
        uint256 _supply,
        uint256 _balancePooled
    ) external view override returns (uint256 assetsReturned) {
        Details.Bancor memory bancorDetails = _bancors[_hubId];
        assetsReturned = _viewAssetsReturned(
            _meTokensBurned,
            bancorDetails.reserveWeight,
            _supply,
            _balancePooled
        );
    }

    function viewTargetAssetsReturned(
        uint256 _meTokensBurned,
        uint256 _hubId,
        uint256 _supply,
        uint256 _balancePooled
    ) external view override returns (uint256 assetsReturned) {
        Details.Bancor memory bancorDetails = _bancors[_hubId];
        assetsReturned = _viewAssetsReturned(
            _meTokensBurned,
            bancorDetails.targetReserveWeight,
            _supply,
            _balancePooled
        );
    }

    function viewAssetsDeposited(
        uint256 _desiredMeTokens,
        uint256 _hubId,
        uint256 _supply,
        uint256 _balancePooled
    ) external view override returns (uint256 assetsDeposited) {
        Details.Bancor memory bancor_ = _bancors[_hubId];
        if (_supply > 0) {
            assetsDeposited = _viewAssetsDeposited(
                _desiredMeTokens,
                bancor_.reserveWeight,
                _supply,
                bancor_.baseY,
                _balancePooled
            );
        } else {
            assetsDeposited = _viewAssetsDepositedFromZero(
                _desiredMeTokens,
                bancor_.reserveWeight,
                bancor_.baseY
            );
        }
    }

    function viewTargetAssetsDeposited(
        uint256 _desiredMeTokens,
        uint256 _hubId,
        uint256 _supply,
        uint256 _balancePooled
    ) external view override returns (uint256 assetsDeposited) {
        Details.Bancor memory bancor_ = _bancors[_hubId];
        if (_supply > 0) {
            assetsDeposited = _viewAssetsDeposited(
                _desiredMeTokens,
                bancor_.targetReserveWeight,
                _supply,
                bancor_.targetBaseY,
                _balancePooled
            );
        } else {
            assetsDeposited = _viewAssetsDepositedFromZero(
                _desiredMeTokens,
                bancor_.targetReserveWeight,
                bancor_.targetBaseY
            );
        }
    }

    function _viewMeTokensMinted(
        uint256 _depositAmount,
        uint32 _connectorWeight,
        uint256 _supply,
        uint256 _connectorBalance
    ) private view returns (uint256) {
        // validate input
        require(
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
            // TODO: will ABDK round correctly here?
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
        // TODO: will ABDK shift correctly here?
        uint256 newTokenSupply = (_supply * result) >> precision;
        return newTokenSupply - _supply;
    }

    function _viewMeTokensMintedFromZero(
        uint256 _assetsDeposited,
        uint256 _reserveWeight,
        uint256 _baseY
    ) private view returns (uint256) {
        bytes16 reserveWeight = _reserveWeight.fromUInt().div(_maxWeight);
        // _assetsDeposited * baseY ^ (1/connectorWeight)
        bytes16 numerator = _assetsDeposited.fromUInt().mul(
            _baseY.fromUInt().ln().mul(_one.div(reserveWeight)).exp()
        );
        // as baseX == 1 ether and we want to result to be in ether too we simply remove
        // the multiplication by baseY
        bytes16 denominator = reserveWeight.mul(_baseY.fromUInt());
        // Instead of calculating "x ^ exp", we calculate "e ^ (log(x) * exp)".
        // (numerator/denominator) ^ (reserveWeight )
        // =>   e^ (log(numerator/denominator) * reserveWeight )
        // =>   log(numerator/denominator)  == (numerator.div(denominator)).ln()
        // =>   (numerator.div(denominator)).ln().mul(reserveWeight).exp();
        bytes16 res = (numerator.div(denominator))
            .ln()
            .mul(reserveWeight)
            .exp()
            .mul(_maxWeight);
        return res.toUInt();
    }

    function _viewAssetsReturned(
        uint256 _sellAmount,
        uint32 _connectorWeight,
        uint256 _supply,
        uint256 _connectorBalance
    ) private view returns (uint256) {
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

    function _viewAssetsDepositedFromZero(
        uint256 _desiredMeTokens,
        uint256 _reserveWeight,
        uint256 _baseY
    ) private view returns (uint256) {
        bytes16 reserveWeight = _reserveWeight.fromUInt().div(_maxWeight);
        bytes16 numerator = _baseY.fromUInt().mul(reserveWeight);
        // Instead of calculating s ^ exp, we calculate e ^ (log(s) * exp).
        bytes16 squared = _desiredMeTokens
            .fromUInt()
            .ln()
            .mul(uint256(2).fromUInt())
            .exp();
        bytes16 res = numerator.mul(squared).div(_baseX);
        return res.toUInt();
    }

    function _viewAssetsDeposited(
        uint256 _desiredMeTokens,
        uint256 _reserveWeight,
        uint256 _supply,
        uint256 _baseY,
        uint256 _balancePooled
    ) private view returns (uint256) {
        // TODO: does this need to be divided?
        bytes16 reserveWeight = _reserveWeight.fromUInt().div(_maxWeight);
        bytes16 k = _baseY.fromUInt().mul(reserveWeight).div(_baseX);
        bytes16 squared = (_supply + _desiredMeTokens)
            .fromUInt()
            .ln()
            .mul(uint256(2).fromUInt())
            .exp();
        bytes16 res = k.mul(squared).sub(_balancePooled.fromUInt());
        return res.toUInt();
    }
}
