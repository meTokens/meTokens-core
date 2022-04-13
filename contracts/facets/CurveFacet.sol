// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

import {LibHub, HubInfo} from "../libs/LibHub.sol";
import {LibMeta} from "../libs/LibMeta.sol";
import {LibMeToken, MeTokenInfo} from "../libs/LibMeToken.sol";
import {LibWeightedAverage} from "../libs/LibWeightedAverage.sol";

import {LibCurve} from "../libs/LibCurve.sol";
import {Modifiers} from "../libs/LibAppStorage.sol";

import {ICurveFacet} from "../interfaces/ICurveFacet.sol";

contract CurveFacet is Modifiers, ICurveFacet {
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
                hubId,
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
            LibCurve.viewTargetAssetsReturned(
                meTokensBurned,
                hubId,
                supply,
                balancePooled
            );
    }

    function getCurveInfo(uint256 hubId)
        external
        view
        returns (LibCurve.CurveInfo memory)
    {
        return LibCurve.getCurveInfo(hubId);
    }
}
