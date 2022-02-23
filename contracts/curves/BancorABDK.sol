// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {ICurve} from "../interfaces/ICurve.sol";
import {ABDKMathQuad} from "../utils/ABDKMathQuad.sol";

/// @title Bancor curve registry and calculator
/// @author Carter Carlson (@cartercarlson), Chris Robison (@CBobRobison), @zgorizzo69
contract BancorABDK is ICurve {
    using ABDKMathQuad for uint256;
    using ABDKMathQuad for bytes16;

    struct Bancor {
        uint256 baseY;
        uint256 targetBaseY;
        uint32 reserveWeight;
        uint32 targetReserveWeight;
    }

    uint32 public constant MAX_WEIGHT = 1e6;
    bytes16 private immutable _baseX = uint256(1 ether).fromUInt();
    bytes16 private immutable _maxWeight = uint256(MAX_WEIGHT).fromUInt(); // gas savings
    bytes16 private immutable _one = (uint256(1)).fromUInt();
    address public hub;

    // NOTE: keys are their respective hubId
    mapping(uint256 => Bancor) private _bancors;

    constructor(address _hub) {
        require(_hub != address(0), "!hub");
        hub = _hub;
    }

    /// @inheritdoc ICurve
    function register(uint256 hubId, bytes calldata encodedDetails)
        external
        override
    {
        require(msg.sender == hub, "!hub");
        require(encodedDetails.length > 0, "!encodedDetails");

        (uint256 baseY, uint32 reserveWeight) = abi.decode(
            encodedDetails,
            (uint256, uint32)
        );
        require(baseY > 0, "!baseY");
        require(
            reserveWeight > 0 && reserveWeight <= MAX_WEIGHT,
            "!reserveWeight"
        );

        Bancor storage bancor = _bancors[hubId];
        bancor.baseY = baseY;
        bancor.reserveWeight = reserveWeight;
    }

    /// @inheritdoc ICurve
    function initReconfigure(uint256 hubId, bytes calldata encodedDetails)
        external
        override
    {
        require(msg.sender == hub, "!hub");

        uint32 targetReserveWeight = abi.decode(encodedDetails, (uint32));
        Bancor storage bancor = _bancors[hubId];

        require(targetReserveWeight > 0, "!reserveWeight");
        require(
            targetReserveWeight != bancor.reserveWeight,
            "targetWeight!=Weight"
        );

        // targetBaseX = (old baseY * oldR) / newR
        uint256 targetBaseY = (bancor.baseY * bancor.reserveWeight) /
            targetReserveWeight;
        bancor.targetBaseY = targetBaseY;
        bancor.targetReserveWeight = targetReserveWeight;
    }

    /// @inheritdoc ICurve
    function finishReconfigure(uint256 hubId) external override {
        require(msg.sender == hub, "!hub");
        Bancor storage bancor = _bancors[hubId];
        bancor.reserveWeight = bancor.targetReserveWeight;
        bancor.baseY = bancor.targetBaseY;
        bancor.targetReserveWeight = 0;
        bancor.targetBaseY = 0;
    }

    function getBancorDetails(uint256 hubId)
        external
        view
        returns (Bancor memory)
    {
        return _bancors[hubId];
    }

    /// @inheritdoc ICurve
    function getCurveDetails(uint256 hubId)
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
        uint256 assetsDeposited,
        uint256 hubId,
        uint256 supply,
        uint256 balancePooled
    ) external view override returns (uint256 meTokensMinted) {
        Bancor memory bancor = _bancors[hubId];

        if (supply > 0) {
            meTokensMinted = _viewMeTokensMinted(
                assetsDeposited,
                bancor.reserveWeight,
                supply,
                balancePooled
            );
        } else {
            meTokensMinted = _viewMeTokensMintedFromZero(
                assetsDeposited,
                bancor.reserveWeight,
                bancor.baseY
            );
        }
    }

    /// @inheritdoc ICurve
    function viewTargetMeTokensMinted(
        uint256 assetsDeposited,
        uint256 hubId,
        uint256 supply,
        uint256 balancePooled
    ) external view override returns (uint256 meTokensMinted) {
        Bancor memory bancor = _bancors[hubId];
        if (supply > 0) {
            meTokensMinted = _viewMeTokensMinted(
                assetsDeposited,
                bancor.targetReserveWeight,
                supply,
                balancePooled
            );
        } else {
            meTokensMinted = _viewMeTokensMintedFromZero(
                assetsDeposited,
                bancor.targetReserveWeight,
                bancor.targetBaseY
            );
        }
    }

    /// @inheritdoc ICurve
    function viewAssetsReturned(
        uint256 meTokensBurned,
        uint256 hubId,
        uint256 supply,
        uint256 balancePooled
    ) external view override returns (uint256 assetsReturned) {
        Bancor memory bancor = _bancors[hubId];
        assetsReturned = _viewAssetsReturned(
            meTokensBurned,
            bancor.reserveWeight,
            supply,
            balancePooled
        );
    }

    /// @inheritdoc ICurve
    function viewTargetAssetsReturned(
        uint256 meTokensBurned,
        uint256 hubId,
        uint256 supply,
        uint256 balancePooled
    ) external view override returns (uint256 assetsReturned) {
        Bancor memory bancor = _bancors[hubId];
        assetsReturned = _viewAssetsReturned(
            meTokensBurned,
            bancor.targetReserveWeight,
            supply,
            balancePooled
        );
    }

    ///************************* CALCULATE FUNCTIONS **************************/
    ///**************** - USED BY MINT & BURN IN FOUNDRY.SOL - ****************/

    // CALCULATE MINT
    /***************************************************************************
    //                                                                    //
    // T = meTokensReturned              /                \   (rW)            //
    // D = depositAmount                 |      1 + D     | ^                 //
    // rW = reserveWeight        T = S * |   ----------   |        - 1        //
    // bP = balancePooled                |       bP       |                   //
    // S = supply                        \            /                   //
    //                                                                        //
    ***************************************************************************/

    /// @dev Given a deposit (in the connector token), reserve weight, meToken supply and
    ///     balance pooled, calculate the return for a given conversion (in the meToken)
    /// @dev supply * ((1 + assetsDeposited / balancePooled) ^ (reserveWeight / 1000000) - 1)
    /// @param assetsDeposited  amount of collateral tokens to deposit
    /// @param reserveWeight    connector weight, represented in ppm, 1 - 1,000,000
    /// @param supply           current meToken supply
    /// @param balancePooled    total connector balance
    /// @return                 amount of meTokens minted
    function _viewMeTokensMinted(
        uint256 assetsDeposited,
        uint32 reserveWeight,
        uint256 supply,
        uint256 balancePooled
    ) private view returns (uint256) {
        // validate input
        require(
            balancePooled > 0 &&
                reserveWeight > 0 &&
                reserveWeight <= MAX_WEIGHT
        );
        // special case for 0 deposit amount
        if (assetsDeposited == 0) {
            return 0;
        }
        // special case if the weight = 100%
        if (reserveWeight == MAX_WEIGHT) {
            return (supply * assetsDeposited) / balancePooled;
        }

        bytes16 exponent = uint256(reserveWeight).fromUInt().div(_maxWeight);
        // 1 + balanceDeposited/connectorBalance
        // TODO: name for `part1`?
        bytes16 part1 = _one.add(
            assetsDeposited.fromUInt().div(balancePooled.fromUInt())
        );
        //Instead of calculating "base ^ exp", we calculate "e ^ (log(base) * exp)".
        bytes16 res = supply.fromUInt().mul(
            (part1.ln().mul(exponent)).exp().sub(_one)
        );
        return res.toUInt();
    }

    // CALCULATE MINT (FROM ZERO)
    /***************************************************************************
    //                                                                    //
    // T = meTokensReturned          /             (1/rW)   \   (rW)          //
    // D = depositAmouont            |      D * y ^         | ^               //
    // rW = reserveWeight        T = |   ----------------   |                 //
    // x = baseX                     |     rW * x * y       |                 //
    // y = baseY                     \                  /                 //
    //                                                                        //
    ***************************************************************************/

    /// @dev Given a deposit (in the collateral token) meToken supply of 0, constant x and
    ///         constant y, calculates the return for a given conversion (in the meToken)
    /// @dev   ( assetsDeposited * baseX ^(1/reserveWeight ) / baseX  * baseY *  reserveWeight ) ^reserveWeight
    /// @dev  baseX and baseY are needed as Bancor formula breaks from a divide-by-0 when supply=0
    /// @param assetsDeposited  amount of collateral tokens to deposit
    /// @param baseY            constant x
    /// @return                 amount of meTokens minted
    function _viewMeTokensMintedFromZero(
        uint256 assetsDeposited,
        uint256 reserveWeight,
        uint256 baseY
    ) private view returns (uint256) {
        bytes16 reserveWeight_ = reserveWeight.fromUInt().div(_maxWeight);
        // assetsDeposited * baseX ^ (1/connectorWeight)
        bytes16 numerator = assetsDeposited.fromUInt().mul(
            _baseX.ln().mul(_one.div(reserveWeight_)).exp()
        );
        // as baseX == 1 ether and we want to result to be in ether too we simply remove
        // the multiplication by baseY
        bytes16 denominator = reserveWeight_.mul(baseY.fromUInt());
        // Instead of calculating "x ^ exp", we calculate "e ^ (log(x) * exp)".
        // (numerator/denominator) ^ (reserveWeight )
        // =>   e^ (log(numerator/denominator) * reserveWeight )
        // =>   log(numerator/denominator)  == (numerator.div(denominator)).ln()
        // =>   (numerator.div(denominator)).ln().mul(reserveWeight).exp();
        bytes16 res = (numerator.div(denominator))
            .ln()
            .mul(reserveWeight_)
            .exp();
        return res.toUInt();
    }

    // CALCULATE BURN
    /****************************************************************************
    //                                                                     //
    // T = tokensReturned                 /                \   (1/rW)          //
    // B = meTokensBurned                 |      1 + B     | ^                 //
    // rW = reserveWeight        T = rB * |   ----------   |          - 1      //
    // bP = balancePooled                 |        s       |                   //
    // S = supply                         \            /                   //
    //                                                                         //
    ****************************************************************************/

    /// @dev Given an amount of meTokens to burn, connector weight, supply and collateral pooled,
    ///     calculates the return for a given conversion (in the collateral token)
    /// @dev balancePooled * (1 - (1 - meTokensBurned/supply) ^ (1 / (reserveWeight / 1000000)))
    /// @param meTokensBurned   amount of meTokens to burn
    /// @param reserveWeight    connector weight, represented in ppm, 1 - 1,000,000
    /// @param supply           current meToken supply
    /// @param balancePooled    total connector balance
    /// @return                 amount of collateral tokens received
    function _viewAssetsReturned(
        uint256 meTokensBurned,
        uint32 reserveWeight,
        uint256 supply,
        uint256 balancePooled
    ) private view returns (uint256) {
        // validate input
        require(
            supply > 0 &&
                balancePooled > 0 &&
                reserveWeight > 0 &&
                reserveWeight <= MAX_WEIGHT &&
                meTokensBurned <= supply,
            "!valid"
        );
        // special case for 0 sell amount
        if (meTokensBurned == 0) {
            return 0;
        }
        // special case for selling the entire supply
        if (meTokensBurned == supply) {
            return balancePooled;
        }
        // special case if the weight = 100%
        if (reserveWeight == MAX_WEIGHT) {
            return (balancePooled * meTokensBurned) / supply;
        }
        // 1 / (reserveWeight/MAX_WEIGHT)
        bytes16 exponent = _one.div(
            uint256(reserveWeight).fromUInt().div(_maxWeight)
        );
        // 1 - (meTokensBurned / supply)
        bytes16 s = _one.sub(meTokensBurned.fromUInt().div(supply.fromUInt()));
        // Instead of calculating "s ^ exp", we calculate "e ^ (log(s) * exp)".
        // balancePooled - ( balancePooled * s ^ exp))
        bytes16 res = balancePooled.fromUInt().sub(
            balancePooled.fromUInt().mul(s.ln().mul(exponent).exp())
        );
        return res.toUInt();
    }
}
