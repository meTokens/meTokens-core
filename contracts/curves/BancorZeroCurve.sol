// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../interfaces/ICurve.sol";
import "../interfaces/ICurveRegistry.sol";

import "../libs/WeightedAverage.sol";
import "../libs/Details.sol";

import "../utils/ABDKMathQuad.sol";

/// @title Bancor curve registry and calculator
/// @author Carl Farterson (@carlfarterson)
contract BancorZeroCurve is ICurve {
    using ABDKMathQuad for uint256;
    using ABDKMathQuad for bytes16;

    bytes16 private immutable _baseX = uint256(1 ether).fromUInt();
    //  uint256 public BASE_X = uint256(1 ether);
    uint32 public maxWeight = 1000000;
    bytes16 private immutable _one = (uint256(1)).fromUInt();

    // NOTE: keys are their respective hubId
    mapping(uint256 => Details.Bancor) private _bancors;

    function register(uint256 _hubId, bytes calldata _encodedDetails)
        external
        override
    {
        // TODO: access control
        require(_encodedDetails.length > 0, "_encodedDetails empty");

        (uint256 baseY, uint32 reserveWeight) = abi.decode(
            _encodedDetails,
            (uint256, uint32)
        );
        require(baseY > 0, "baseY not in range");
        require(
            reserveWeight > 0 && reserveWeight <= maxWeight,
            "reserveWeight not in range"
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
        Details.Bancor storage bancorDetails = _bancors[_hubId];

        require(targetReserveWeight > 0, "reserveWeight not in range");
        require(
            targetReserveWeight != bancorDetails.reserveWeight,
            "targeReserveWeight == reserveWeight"
        );

        // targetBaseY = (old baseY * oldR) / newR
        uint256 targetBaseY = (bancorDetails.baseY *
            bancorDetails.reserveWeight) / targetReserveWeight;

        bancorDetails.targetBaseY = targetBaseY;
        bancorDetails.targetReserveWeight = targetReserveWeight;
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

    /// @inheritdoc ICurve
    function calculateMintReturn(
        uint256 _tokensDeposited,
        uint256 _hubId,
        uint256 _supply,
        uint256 _balancePooled
    ) external view override returns (uint256 meTokensReturned) {
        Details.Bancor memory bancorDetails = _bancors[_hubId];
        if (_supply > 0) {
            meTokensReturned = _calculateMintReturn(
                _tokensDeposited,
                bancorDetails.reserveWeight,
                _supply,
                _balancePooled
            );
        } else {
            meTokensReturned = _calculateMintReturnFromZero(
                _tokensDeposited,
                bancorDetails.reserveWeight,
                bancorDetails.baseY
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
        Details.Bancor memory bancorDetails = _bancors[_hubId];
        if (_supply > 0) {
            meTokensReturned = _calculateMintReturn(
                _tokensDeposited,
                bancorDetails.targetReserveWeight,
                _supply,
                _balancePooled
            );
        } else {
            meTokensReturned = _calculateMintReturnFromZero(
                _tokensDeposited,
                bancorDetails.targetReserveWeight,
                bancorDetails.targetBaseY
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
        Details.Bancor memory bancorDetails = _bancors[_hubId];
        tokensReturned = _calculateBurnReturn(
            _meTokensBurned,
            bancorDetails.reserveWeight,
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
        Details.Bancor memory bancorDetails = _bancors[_hubId];
        tokensReturned = _calculateBurnReturn(
            _meTokensBurned,
            bancorDetails.targetReserveWeight,
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
        // validate input
        require(
            _balancePooled > 0 &&
                _reserveWeight > 0 &&
                _reserveWeight <= maxWeight
        );
        // special case for 0 deposit amount
        if (_tokensDeposited == 0) {
            return 0;
        }
        // special case if the weight = 100%
        if (_reserveWeight == maxWeight) {
            return (_supply * _tokensDeposited) / _balancePooled;
        }

        bytes16 exponent = uint256(_reserveWeight).fromUInt().div(
            uint256(maxWeight).fromUInt()
        );
        bytes16 part1 = _one.add(
            _tokensDeposited.fromUInt().div(_balancePooled.fromUInt())
        );
        //Instead of calculating "base ^ exp", we calculate "e ^ (log(base) * exp)".
        bytes16 res = _supply.fromUInt().mul(
            (part1.ln().mul(exponent)).exp().sub(_one)
        );
        return res.toUInt();
    }

    /// @notice Given a deposit (in the collateral token) meToken supply of 0, constant x and
    ///         constant y, calculates the return for a given conversion (in the meToken)
    /// @dev  _baseX / (_baseY ^ (MAX_WEIGHT/reserveWeight -1)) * tokensDeposited ^(MAX_WEIGHT/reserveWeight -1)
    /// @dev  _baseX and _baseY are needed as Bancor formula breaks from a divide-by-0 when supply=0
    /// @param _tokensDeposited   amount of collateral tokens to deposit
    /// @param _baseY          constant y
    /// @return amount of meTokens minted
    function _calculateMintReturnFromZero(
        uint256 _tokensDeposited,
        uint256 _reserveWeight,
        uint256 _baseY
    ) private view returns (uint256) {
        // (MAX_WEIGHT/reserveWeight -1)
        bytes16 exponent = uint256(maxWeight)
            .fromUInt()
            .div(_reserveWeight.fromUInt())
            .sub(_one);
        // Instead of calculating "x ^ exp", we calculate "e ^ (log(x) * exp)".
        // _baseY ^ (MAX_WEIGHT/reserveWeight -1)
        bytes16 denominator = (_baseY.fromUInt().ln().mul(exponent)).exp();
        // ( baseX * tokensDeposited  ^ (MAX_WEIGHT/reserveWeight -1) ) /  _baseY ^ (MAX_WEIGHT/reserveWeight -1)
        bytes16 res = _baseX
            .mul(_tokensDeposited.fromUInt().ln().mul(exponent).exp())
            .div(denominator);
        return res.toUInt();
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
                _reserveWeight <= maxWeight &&
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
        if (_reserveWeight == maxWeight) {
            return (_balancePooled * _meTokensBurned) / _supply;
        }
        // 1 / (reserveWeight/MAX_WEIGHT)
        bytes16 exponent = _one.div(
            uint256(_reserveWeight).fromUInt().div(
                uint256(maxWeight).fromUInt()
            )
        );
        // 1 - (meTokensBurned / supply)
        bytes16 s = _one.sub(
            _meTokensBurned.fromUInt().div(_supply.fromUInt())
        );
        // Instead of calculating "s ^ exp", we calculate "e ^ (log(s) * exp)".
        // balancePooled - ( balancePooled * s ^ exp))
        bytes16 res = _balancePooled.fromUInt().sub(
            _balancePooled.fromUInt().mul(s.ln().mul(exponent).exp())
        );
        return res.toUInt();
    }
}
