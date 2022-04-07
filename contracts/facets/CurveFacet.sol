// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

import {LibHub, HubInfo} from "../libs/LibHub.sol";
import {LibMeta} from "../libs/LibMeta.sol";
import {LibMeToken, MeTokenInfo} from "../libs/LibMeToken.sol";
import {LibWeightedAverage} from "../libs/LibWeightedAverage.sol";

import {LibCurve, CurveInfo} from "../libs/LibCurve.sol";
import {Modifiers} from "../libs/LibAppStorage.sol";

contract CurveFacet is Modifiers {
    function viewMeTokensMinted(
        uint256 assetsDeposited,
        uint256 hubId,
        uint256 supply,
        uint256 balancePooled
    ) external view returns (uint256) {
        return
            LibCurve.viewMeTokensMinted(
                assetsDeposited,
                hubId,
                supply,
                balancePooled
            );
    }

    function viewTargetMeTokensMinted(
        uint256 assetsDeposited,
        uint256 hubId,
        uint256 supply,
        uint256 balancePooled
    ) external view returns (uint256) {
        return
            LibCurve.viewTargetMeTokensMinted(
                assetsDeposited,
                hubId,
                supply,
                balancePooled
            );
    }

    function viewAssetsReturned(
        uint256 meTokensBurned,
        uint256 hubId,
        uint256 supply,
        uint256 balancePooled
    ) external view returns (uint256) {
        return
            LibCurve.viewAssetsReturned(
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
    ) external view returns (uint256) {
        return
            LibCurve.viewAssetsReturned(
                meTokensBurned,
                s.curves[hubId].targetReserveWeight,
                supply,
                balancePooled
            );
    }
}
