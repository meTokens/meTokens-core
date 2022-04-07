// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

import {ABDKMathQuad} from "../utils/ABDKMathQuad.sol";
import {LibAppStorage, AppStorage} from "./LibAppStorage.sol";

struct CurveInfo {
    uint256 baseY;
    uint256 targetBaseY;
    uint32 reserveWeight;
    uint32 targetReserveWeight;
}

library LibCurve {
    using ABDKMathQuad for uint256;
    using ABDKMathQuad for bytes16;

    uint32 private constant _MAX_WEIGHT = 1e6;

    function register(uint256 hubId, bytes calldata encodedCurveInfo) internal {
        AppStorage storage s = LibAppStorage.diamondStorage();
        CurveInfo storage curveInfo = s.curves[hubId];
        require(encodedCurveInfo.length > 0, "!encodedCurveInfo");

        (uint256 baseY, uint32 reserveWeight) = abi.decode(
            encodedCurveInfo,
            (uint256, uint32)
        );
        require(baseY > 0, "!baseY");
        require(
            reserveWeight > 0 && reserveWeight <= _MAX_WEIGHT,
            "!reserveWeight"
        );

        curveInfo.baseY = baseY;
        curveInfo.reserveWeight = reserveWeight;
    }

    function initReconfigure(uint256 hubId, bytes calldata encodedCurveInfo)
        internal
    {
        AppStorage storage s = LibAppStorage.diamondStorage();
        CurveInfo storage curveInfo = s.curves[hubId];
        uint32 targetReserveWeight = abi.decode(encodedCurveInfo, (uint32));

        require(targetReserveWeight > 0, "!reserveWeight");
        require(
            targetReserveWeight != curveInfo.reserveWeight,
            "targetWeight!=Weight"
        );

        // targetBaseX = (old baseY * oldR) / newR
        uint256 targetBaseY = (curveInfo.baseY * curveInfo.reserveWeight) /
            targetReserveWeight;
        curveInfo.targetBaseY = targetBaseY;
        curveInfo.targetReserveWeight = targetReserveWeight;
    }

    function finishReconfigure(uint256 hubId) internal {
        AppStorage storage s = LibAppStorage.diamondStorage();
        CurveInfo storage curveInfo = s.curves[hubId];

        curveInfo.reserveWeight = curveInfo.targetReserveWeight;
        curveInfo.baseY = curveInfo.targetBaseY;
        curveInfo.targetReserveWeight = 0;
        curveInfo.targetBaseY = 0;
    }

    function getCurveInfo(uint256 hubId)
        internal
        view
        returns (CurveInfo memory curveInfo)
    {
        AppStorage storage s = LibAppStorage.diamondStorage();
        curveInfo.baseY = s.curves[hubId].baseY;
        curveInfo.reserveWeight = s.curves[hubId].reserveWeight;
        curveInfo.targetBaseY = s.curves[hubId].targetBaseY;
        curveInfo.targetReserveWeight = s.curves[hubId].targetReserveWeight;
    }

    function viewMeTokensMinted(
        uint256 assetsDeposited,
        uint256 hubId,
        uint256 supply,
        uint256 balancePooled
    ) internal view returns (uint256 meTokensMinted) {
        AppStorage storage s = LibAppStorage.diamondStorage();

        if (supply > 0) {
            meTokensMinted = _viewMeTokensMinted(
                assetsDeposited,
                s.curves[hubId].reserveWeight,
                supply,
                balancePooled
            );
        } else {
            meTokensMinted = _viewMeTokensMintedFromZero(
                assetsDeposited,
                s.curves[hubId].reserveWeight,
                s.curves[hubId].baseY
            );
        }
    }

    function viewTargetMeTokensMinted(
        uint256 assetsDeposited,
        uint256 hubId,
        uint256 supply,
        uint256 balancePooled
    ) internal view returns (uint256 meTokensMinted) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        if (supply > 0) {
            meTokensMinted = _viewMeTokensMinted(
                assetsDeposited,
                s.curves[hubId].targetReserveWeight,
                supply,
                balancePooled
            );
        } else {
            meTokensMinted = _viewMeTokensMintedFromZero(
                assetsDeposited,
                s.curves[hubId].targetReserveWeight,
                s.curves[hubId].targetBaseY
            );
        }
    }

    function viewAssetsReturned(
        uint256 meTokensBurned,
        uint256 hubId,
        uint256 supply,
        uint256 balancePooled
    ) internal view returns (uint256 assetsReturned) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        assetsReturned = _viewAssetsReturned(
            meTokensBurned,
            s.curves[hubId].reserveWeight,
            supply,
            balancePooled
        );
    }

    function viewTargetAssetsReturned(
        uint256 meTokensBurned,
        uint256 hubId,
        uint256 supply,
        uint256 balancePooled
    ) internal view returns (uint256 assetsReturned) {
        AppStorage storage s = LibAppStorage.diamondStorage();

        assetsReturned = _viewAssetsReturned(
            meTokensBurned,
            s.curves[hubId].targetReserveWeight,
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
    ) private pure returns (uint256) {
        // validate input
        require(
            balancePooled > 0 &&
                reserveWeight > 0 &&
                reserveWeight <= _MAX_WEIGHT
        );
        // special case for 0 deposit amount
        if (assetsDeposited == 0) {
            return 0;
        }
        // special case if the weight = 100%
        if (reserveWeight == _MAX_WEIGHT) {
            return (supply * assetsDeposited) / balancePooled;
        }
        bytes16 _one = (uint256(1)).fromUInt();
        bytes16 _maxWeight = uint256(_MAX_WEIGHT).fromUInt();
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
    ) private pure returns (uint256) {
        bytes16 _baseX = uint256(1 ether).fromUInt();
        bytes16 _one = (uint256(1)).fromUInt();
        bytes16 _maxWeight = uint256(_MAX_WEIGHT).fromUInt();

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
    ) private pure returns (uint256) {
        // validate input
        require(
            supply > 0 &&
                balancePooled > 0 &&
                reserveWeight > 0 &&
                reserveWeight <= _MAX_WEIGHT &&
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
        if (reserveWeight == _MAX_WEIGHT) {
            return (balancePooled * meTokensBurned) / supply;
        }
        // _MAX_WEIGHT / reserveWeight
        bytes16 _maxWeight = uint256(_MAX_WEIGHT).fromUInt();
        bytes16 _one = (uint256(1)).fromUInt();
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
