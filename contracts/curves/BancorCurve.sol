// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

import {ICurve} from "../interfaces/ICurve.sol";
import {ABDKMathQuad} from "../utils/ABDKMathQuad.sol";

/// @title Bancor curve registry and calculator
/// @author Carter Carlson (@cartercarlson), Chris Robison (@CBobRobison), @zgorizzo69
contract BancorCurve is ICurve {
    using ABDKMathQuad for uint256;
    using ABDKMathQuad for bytes16;

    struct CurveInfo {
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
    mapping(uint256 => CurveInfo) private _curves;

    modifier onlyHub() {
        require(msg.sender == hub, "!hub");
        _;
    }

    constructor(address _hub) {
        require(_hub != address(0), "!hub");
        hub = _hub;
    }

    /// @inheritdoc ICurve
    function register(uint256 hubId, bytes calldata encodedCurveInfo)
        external
        override
        onlyHub
    {
        require(encodedCurveInfo.length > 0, "!encodedCurveInfo");

        (uint256 baseY, uint32 reserveWeight) = abi.decode(
            encodedCurveInfo,
            (uint256, uint32)
        );
        require(baseY > 0, "!baseY");
        require(
            reserveWeight > 0 && reserveWeight <= MAX_WEIGHT,
            "!reserveWeight"
        );

        CurveInfo storage curveInfo = _curves[hubId];
        curveInfo.baseY = baseY;
        curveInfo.reserveWeight = reserveWeight;
    }

    /// @inheritdoc ICurve
    function initReconfigure(uint256 hubId, bytes calldata encodedCurveInfo)
        external
        override
        onlyHub
    {
        uint32 targetReserveWeight = abi.decode(encodedCurveInfo, (uint32));
        CurveInfo storage curveInfo = _curves[hubId];

        require(targetReserveWeight > 0, "!reserveWeight");
        require(
            targetReserveWeight != curveInfo.reserveWeight,
            "targetWeight!=Weight"
        );

        // targetBaseX = (old baseY * oldR) / newR
        // uint256 targetBaseY = (curveInfo.baseY * curveInfo.reserveWeight) /
        //     targetReserveWeight;

        curveInfo.targetBaseY =
            (curveInfo.baseY * curveInfo.reserveWeight) /
            targetReserveWeight;
        curveInfo.targetReserveWeight = targetReserveWeight;
    }

    /// @inheritdoc ICurve
    function finishReconfigure(uint256 hubId) external override onlyHub {
        CurveInfo storage curveInfo = _curves[hubId];
        curveInfo.reserveWeight = curveInfo.targetReserveWeight;
        curveInfo.baseY = curveInfo.targetBaseY;
        curveInfo.targetReserveWeight = 0;
        curveInfo.targetBaseY = 0;
    }

    function getCurveInfoBancor(uint256 hubId)
        external
        view
        returns (CurveInfo memory)
    {
        return _curves[hubId];
    }

    /// @inheritdoc ICurve
    function getCurveInfo(uint256 hubId)
        external
        view
        override
        returns (uint256[4] memory)
    {
        return [
            _curves[hubId].baseY,
            uint256(_curves[hubId].reserveWeight),
            _curves[hubId].targetBaseY,
            uint256(_curves[hubId].targetReserveWeight)
        ];
    }

    /// @inheritdoc ICurve
    function viewMeTokensMinted(
        uint256 assetsDeposited,
        uint256 hubId,
        uint256 supply,
        uint256 balancePooled
    ) external view override returns (uint256 meTokensMinted) {
        CurveInfo memory curveInfo = _curves[hubId];

        if (supply > 0) {
            meTokensMinted = _viewMeTokensMinted(
                assetsDeposited,
                curveInfo.reserveWeight,
                supply,
                balancePooled
            );
        } else {
            meTokensMinted = _viewMeTokensMintedFromZero(
                assetsDeposited,
                curveInfo.reserveWeight,
                curveInfo.baseY
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
        CurveInfo memory curveInfo = _curves[hubId];

        if (supply > 0) {
            meTokensMinted = _viewMeTokensMinted(
                assetsDeposited,
                curveInfo.targetReserveWeight,
                supply,
                balancePooled
            );
        } else {
            meTokensMinted = _viewMeTokensMintedFromZero(
                assetsDeposited,
                curveInfo.targetReserveWeight,
                curveInfo.targetBaseY
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
        assetsReturned = _viewAssetsReturned(
            meTokensBurned,
            _curves[hubId].reserveWeight,
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
        assetsReturned = _viewAssetsReturned(
            meTokensBurned,
            _curves[hubId].targetReserveWeight,
            supply,
            balancePooled
        );
    }

    ///************************* CALCULATE FUNCTIONS **************************/
    ///**************** - USED BY MINT & BURN IN FOUNDRY.SOL - ****************/

    // CALCULATE MINT
    /*******************************************************************************
    //                                                                            //
    // T = meTokensReturned             / /             \      rW           \     //
    // D = assetsDeposited              | |        D    |  ^ ------         |     //
    // rW = reserveWeight        T = S *| |  1 + -----  |    100000    - 1  |     //
    // bP = balancePooled               | |       bP    |                   |     //
    // S = supply                       \ \             /                   /     //
    //                                                                            //
    *******************************************************************************/

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
    //                                                                        //
    // T = meTokensReturned          /             (1/rW)   \     rW          //
    // D = assetsDeposited           |      D * x ^         |  ^              //
    // rW = reserveWeight        T = |   ----------------   |                 //
    // x = baseX                     |     rW * x * y       |                 //
    // y = baseY                     \                      /                 //
    //                                                                        //
    ***************************************************************************/

    /// @dev Given a deposit (in the collateral token) meToken supply of 0, constant x and
    ///         constant y, calculates the return for a given conversion (in the meToken)
    /// @dev   ( assetsDeposited * baseX ^(1/reserveWeight ) / (reserveWeight * baseX  * baseY )) ^ reserveWeight
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
    /**************************************************************************************
    //                                                                                   //
    // T = tokensReturned                 /     /                \  ^    1,000,000   \   //
    // B = meTokensBurned                 |     |          B     |      -----------  |   //
    // rW = reserveWeight        T = bP * | 1 - |  1  -  ------  |          r        |   //
    // bP = balancePooled                 |     |          s     |                   |   //
    // S = supply                         \     \                /                   /   //
    //                                                                                   //
    **************************************************************************************/

    /// @dev Given an amount of meTokens to burn, connector weight, supply and collateral pooled,
    ///     calculates the return for a given conversion (in the collateral token)
    /// @dev balancePooled * (1 - (1 - meTokensBurned/supply) ^ (1,000,000 / reserveWeight))
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
        // MAX_WEIGHT / reserveWeight
        bytes16 exponent = _maxWeight.div(uint256(reserveWeight).fromUInt());

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
