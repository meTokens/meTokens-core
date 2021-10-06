// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../interfaces/ICurve.sol";
import "../interfaces/ICurveRegistry.sol";

import "../libs/WeightedAverage.sol";
import "../libs/Details.sol";

import "../utils/Power.sol";

/// @title Bancor curve registry and calculator
/// @author Carl Farterson (@carlfarterson)
contract BancorZeroCurve is ICurve, Power {
    // NOTE: keys are their respective hubId
    mapping(uint256 => Details.Bancor) private _bancors;

    function register(uint256 _hubId, bytes calldata _encodedValueSet)
        external
        override
    {
        // TODO: access control
        require(_encodedValueSet.length > 0, "ValueSet empty");

        (uint256 baseY, uint32 reserveWeight) = abi.decode(
            _encodedValueSet,
            (uint256, uint32)
        );
        require(
            baseY > 0 && baseY <= PRECISION * PRECISION,
            "baseY not in range"
        );
        require(
            reserveWeight > 0 && reserveWeight <= MAX_WEIGHT,
            "reserveWeight not in range"
        );

        Details.Bancor storage bancor_ = _bancors[_hubId];
        bancor_.baseY = baseY;
        bancor_.reserveWeight = reserveWeight;
    }

    function registerTarget(uint256 _hubId, bytes calldata _encodedValueSet)
        external
        override
    {
        // TODO: access control

        uint32 targetReserveWeight = abi.decode(_encodedValueSet, (uint32));

        Details.Bancor storage bancor_ = _bancors[_hubId];
        require(
            targetReserveWeight > 0 && targetReserveWeight <= MAX_WEIGHT,
            "reserveWeight not in range"
        );
        require(
            targetReserveWeight != bancor_.reserveWeight,
            "targeReserveWeight == reserveWeight"
        );

        // targetBaseY = (old baseY * oldR) / newR
        uint256 targetBaseY = (bancor_.baseY * bancor_.reserveWeight) /
            targetReserveWeight;

        bancor_.targetBaseY = targetBaseY;
        bancor_.targetReserveWeight = targetReserveWeight;
    }

    function finishUpdate(uint256 _hubId) external override {
        // TODO; only hub can call
        Details.Bancor storage bancor_ = _bancors[_hubId];
        bancor_.reserveWeight = bancor_.targetReserveWeight;
        bancor_.baseY = bancor_.targetBaseY;
        bancor_.targetReserveWeight = 0;
        bancor_.targetBaseY = 0;
    }

    /// @inheritdoc ICurve
    function calculateMintReturn(
        uint256 _tokensDeposited,
        uint256 _hubId,
        uint256 _supply,
        uint256 _balancePooled
    ) external view override returns (uint256 meTokensReturned) {
        Details.Bancor memory bancor_ = _bancors[_hubId];
        if (_supply > 0) {
            meTokensReturned = _calculateMintReturn(
                _tokensDeposited,
                bancor_.reserveWeight,
                _supply,
                _balancePooled
            );
        } else {
            meTokensReturned = _calculateMintReturnFromZero(
                _tokensDeposited,
                bancor_.reserveWeight,
                BASE_X,
                bancor_.baseY
            );
        }
    }

    /// @inheritdoc ICurve
    function calculateTargetMintReturn(
        uint256 _tokensDeposited,
        uint256 _hubId,
        uint256 _supply,
        uint256 _balancePooled
    ) external view override returns (uint256 meTokensReturned) {
        Details.Bancor memory bancor_ = _bancors[_hubId];
        if (_supply > 0) {
            meTokensReturned = _calculateMintReturn(
                _tokensDeposited,
                bancor_.targetReserveWeight,
                _supply,
                _balancePooled
            );
        } else {
            meTokensReturned = _calculateMintReturnFromZero(
                _tokensDeposited,
                bancor_.targetReserveWeight,
                BASE_X,
                bancor_.targetBaseY
            );
        }
    }

    /// @inheritdoc ICurve
    function calculateBurnReturn(
        uint256 _meTokensBurned,
        uint256 _hubId,
        uint256 _supply,
        uint256 _balancePooled
    ) external view override returns (uint256 tokensReturned) {
        Details.Bancor memory bancor_ = _bancors[_hubId];
        tokensReturned = _calculateBurnReturn(
            _meTokensBurned,
            bancor_.reserveWeight,
            _supply,
            _balancePooled
        );
    }

    function calculateTargetBurnReturn(
        uint256 _meTokensBurned,
        uint256 _hubId,
        uint256 _supply,
        uint256 _balancePooled
    ) external view override returns (uint256 tokensReturned) {
        Details.Bancor memory bancor_ = _bancors[_hubId];
        tokensReturned = _calculateBurnReturn(
            _meTokensBurned,
            bancor_.targetReserveWeight,
            _supply,
            _balancePooled
        );
    }

    /// @notice Given a deposit (in the connector token), reserve weight, meToken supply and
    ///     balance pooled, calculate the return for a given conversion (in the meToken)
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
        require(
            _balancePooled > 0 &&
                _reserveWeight > 0 &&
                _reserveWeight <= MAX_WEIGHT
        );
        // special case for 0 deposit amount
        if (_tokensDeposited == 0) {
            return 0;
        }
        // special case if the weight = 100%
        if (_reserveWeight == MAX_WEIGHT) {
            return (_supply * _tokensDeposited) / _balancePooled;
        }

        uint8 precision;
        uint256 result;
        uint256 baseN = _tokensDeposited + _balancePooled;
        (result, precision) = power(
            baseN,
            _balancePooled,
            _reserveWeight,
            MAX_WEIGHT
        );
        uint256 newTokenSupply = (_supply * result) >> precision;
        return newTokenSupply - _supply;
    }

    /// @notice Given an amount of meTokens to burn, connector weight, supply and collateral pooled,
    ///     calculates the return for a given conversion (in the collateral token)
    /// @dev _balancePooled * (1 - (1 - _meTokensBurned/_supply) ^ (1 / (_reserveWeight / 1000000)))
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
        require(
            _supply > 0 &&
                _balancePooled > 0 &&
                _reserveWeight > 0 &&
                _reserveWeight <= MAX_WEIGHT &&
                _meTokensBurned <= _supply
        );
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
            return (_balancePooled * _meTokensBurned) / _supply;
        }

        uint256 result;
        uint8 precision;
        uint256 baseD = _supply - _meTokensBurned;
        (result, precision) = power(_supply, baseD, MAX_WEIGHT, _reserveWeight);
        uint256 oldBalance = _balancePooled * result;
        uint256 newBalance = _balancePooled << precision;

        return (oldBalance - newBalance) / result;
    }

    /// @notice Given a deposit (in the collateral token) meToken supply of 0, constant x and
    ///         constant y, calculates the return for a given conversion (in the meToken)
    /// @dev _baseX and _baseY are needed as Bancor formula breaks from a divide-by-0 when supply=0
    /// @param _tokensDeposited   amount of collateral tokens to deposit
    /// @param _reserveWeight connector weight, represented in ppm, 1 - 1,000,000
    /// @param _baseX          constant X
    /// @param _baseY          constant y
    /// @return tokensReturned amount of meTokens minted
    function _calculateMintReturnFromZero(
        uint256 _tokensDeposited,
        uint256 _reserveWeight,
        uint256 _baseX,
        uint256 _baseY
    ) private view returns (uint256) {
        return
            _baseY /
            (_baseX**(PRECISION / _reserveWeight - PRECISION) *
                _tokensDeposited**(PRECISION / _reserveWeight - PRECISION));
    }
}
