// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../interfaces/ICurve.sol";

import "../libs/WeightedAverage.sol";

import "../utils/ABDKMathQuad.sol";

/// @title Bancor curve registry and calculator
/// @author Carl Farterson (@carlfarterson), Chris Robison (@CBobRobison), @zgorizzo69
contract BancorABDK is ICurve {
    using ABDKMathQuad for uint256;
    using ABDKMathQuad for bytes16;

    struct Bancor {
        uint256 baseY;
        uint32 reserveWeight;
        uint256 targetBaseY;
        uint32 targetReserveWeight;
    }

    uint32 public constant MAX_WEIGHT = 1000000;
    bytes16 private immutable _baseX = uint256(1 ether).fromUInt();
    bytes16 private immutable _maxWeight = uint256(MAX_WEIGHT).fromUInt(); // gas savings
    bytes16 private immutable _one = (uint256(1)).fromUInt();
    address public hub;

    // NOTE: keys are their respective hubId
    mapping(uint256 => Bancor) private _bancors;

    constructor(address _hub) {
        hub = _hub;
    }

    function register(uint256 _hubId, bytes calldata _encodedDetails)
        external
        override
    {
        require(msg.sender == hub, "!hub");
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

        Bancor storage bancor_ = _bancors[_hubId];
        bancor_.baseY = baseY;
        bancor_.reserveWeight = reserveWeight;
    }

    function initReconfigure(uint256 _hubId, bytes calldata _encodedDetails)
        external
        override
    {
        require(msg.sender == hub, "!hub");

        uint32 targetReserveWeight = abi.decode(_encodedDetails, (uint32));
        Bancor storage bancor_ = _bancors[_hubId];

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
        require(msg.sender == hub, "!hub");
        Bancor storage bancor_ = _bancors[_hubId];
        bancor_.reserveWeight = bancor_.targetReserveWeight;
        bancor_.baseY = bancor_.targetBaseY;
        bancor_.targetReserveWeight = 0;
        bancor_.targetBaseY = 0;
    }

    function getBancorDetails(uint256 hubId)
        external
        view
        returns (Bancor memory)
    {
        return _bancors[hubId];
    }

    function getDetails(uint256 hubId)
        external
        view
        override
        returns (uint256[4] memory)
    {
        return [
            _bancors[hubId].baseY,
            uint256(_bancors[hubId].reserveWeight),
            _bancors[hubId].targetBaseY,
            uint256(_bancors[hubId].targetReserveWeight)
        ];
    }

    /// @inheritdoc ICurve
    function viewMeTokensMinted(
        uint256 _assetsDeposited,
        uint256 _hubId,
        uint256 _supply,
        uint256 _balancePooled
    ) external view override returns (uint256 meTokensMinted) {
        Bancor memory bancorDetails = _bancors[_hubId];

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

    /// @inheritdoc ICurve
    function viewTargetMeTokensMinted(
        uint256 _assetsDeposited,
        uint256 _hubId,
        uint256 _supply,
        uint256 _balancePooled
    ) external view override returns (uint256 meTokensMinted) {
        Bancor memory bancorDetails = _bancors[_hubId];
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

    /// @inheritdoc ICurve
    function viewAssetsReturned(
        uint256 _meTokensBurned,
        uint256 _hubId,
        uint256 _supply,
        uint256 _balancePooled
    ) external view override returns (uint256 assetsReturned) {
        Bancor memory bancorDetails = _bancors[_hubId];
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
        Bancor memory bancorDetails = _bancors[_hubId];
        assetsReturned = _viewAssetsReturned(
            _meTokensBurned,
            bancorDetails.targetReserveWeight,
            _supply,
            _balancePooled
        );
    }

    ///************************* CALCULATE FUNCTIONS **************************/
    ///**************** - USED BY MINT & BURN IN FOUNDRY.SOL - ****************/

    // CALCULATE MINT
    /***************************************************************************
    //                                    __            __                    //
    // T = meTokensReturned              /                \   (rW)            //
    // D = depositAmount                 |      1 + D     | ^                 //
    // rW = reserveWeight        T = S * |   ----------   |        - 1        //
    // bP = balancePooled                |       bP       |                   //
    // S = supply                        \__            __/                   //
    //                                                                        //
    ***************************************************************************/

    /// @notice Given a deposit (in the connector token), reserve weight, meToken supply and
    ///     balance pooled, calculate the return for a given conversion (in the meToken)
    /// @dev _supply * ((1 + _assetsDeposited / _balancePooled) ^ (_reserveWeight / 1000000) - 1)
    /// @param _assetsDeposited   amount of collateral tokens to deposit
    /// @param _reserveWeight   connector weight, represented in ppm, 1 - 1,000,000
    /// @param _supply          current meToken supply
    /// @param _balancePooled   total connector balance
    /// @return amount of meTokens minted
    function _viewMeTokensMinted(
        uint256 _assetsDeposited,
        uint32 _reserveWeight,
        uint256 _supply,
        uint256 _balancePooled
    ) private view returns (uint256) {
        // validate input
        require(
            _balancePooled > 0 &&
                _reserveWeight > 0 &&
                _reserveWeight <= MAX_WEIGHT
        );
        // special case for 0 deposit amount
        if (_assetsDeposited == 0) {
            return 0;
        }
        // special case if the weight = 100%
        if (_reserveWeight == MAX_WEIGHT) {
            return (_supply * _assetsDeposited) / _balancePooled;
        }

        bytes16 exponent = uint256(_reserveWeight).fromUInt().div(_maxWeight);
        // 1 + balanceDeposited/connectorBalance
        // TODO: name for `part1`?
        bytes16 part1 = _one.add(
            _assetsDeposited.fromUInt().div(_balancePooled.fromUInt())
        );
        //Instead of calculating "base ^ exp", we calculate "e ^ (log(base) * exp)".
        bytes16 res = _supply.fromUInt().mul(
            (part1.ln().mul(exponent)).exp().sub(_one)
        );
        return res.toUInt();
    }

    // CALCULATE MINT (FROM ZERO)
    /***************************************************************************
    //                                __                  __                  //
    // T = meTokensReturned          /             (1/rW)   \   (rW)          //
    // D = depositAmouont            |      D * y ^         | ^               //
    // rW = reserveWeight        T = |   ----------------   |                 //
    // x = baseX                     |     rW * x * y       |                 //
    // y = baseY                     \__                  __/                 //
    //                                                                        //
    ***************************************************************************/

    /// @notice Given a deposit (in the collateral token) meToken supply of 0, constant x and
    ///         constant y, calculates the return for a given conversion (in the meToken)
    /// @dev   ( assetsDeposited * _baseX ^(1/reserveWeight ) / _baseX  * _baseY *  reserveWeight ) ^reserveWeight
    /// @dev  _baseX and _baseY are needed as Bancor formula breaks from a divide-by-0 when supply=0
    /// @param _assetsDeposited   amount of collateral tokens to deposit
    /// @param _baseY          constant x
    /// @return amount of meTokens minted
    function _viewMeTokensMintedFromZero(
        uint256 _assetsDeposited,
        uint256 _reserveWeight,
        uint256 _baseY
    ) private view returns (uint256) {
        bytes16 reserveWeight = _reserveWeight.fromUInt().div(_maxWeight);
        // _assetsDeposited * baseX ^ (1/connectorWeight)
        bytes16 numerator = _assetsDeposited.fromUInt().mul(
            _baseX.ln().mul(_one.div(reserveWeight)).exp()
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
            .exp();
        return res.toUInt();
    }

    // CALCULATE BURN
    /****************************************************************************
    //                                     __            __                    //
    // T = tokensReturned                 /                \   (1/rW)          //
    // B = meTokensBurned                 |      1 + B     | ^                 //
    // rW = reserveWeight        T = rB * |   ----------   |          - 1      //
    // bP = balancePooled                 |        s       |                   //
    // S = supply                         \__            __/                   //
    //                                                                         //
    ****************************************************************************/

    /// @notice Given an amount of meTokens to burn, connector weight, supply and collateral pooled,
    ///     calculates the return for a given conversion (in the collateral token)
    /// @dev _balancePooled * (1 - (1 - _meTokensBurned/_supply) ^ (1 / (_reserveWeight / 1000000)))
    /// @param _meTokensBurned          amount of meTokens to burn
    /// @param _reserveWeight       connector weight, represented in ppm, 1 - 1,000,000
    /// @param _supply              current meToken supply
    /// @param _balancePooled       total connector balance
    /// @return amount of collateral tokens received
    function _viewAssetsReturned(
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
                _meTokensBurned <= _supply,
            "!valid"
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
        // 1 / (reserveWeight/MAX_WEIGHT)
        bytes16 exponent = _one.div(
            uint256(_reserveWeight).fromUInt().div(_maxWeight)
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
