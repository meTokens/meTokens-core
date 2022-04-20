// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SeasonInfo} from "../libs/LibLiquidityMining.sol";

/// @title MeToken liquidity mining interface
/// @author Carter Carlson (@cartercarlson)
interface ILiquidityMiningFacet {
    event RewardPaid(address meToken, address sender, uint256 reward);
    event Staked(address meToken, address sender, uint256 amount);
    event Withdrawn(address meToken, address sender, uint256 amount);
    event RewardAdded(uint256 seasonNum, uint256 amount);
    event Recovered(IERC20 token, uint256 amount);

    function setLMWarmup(uint256 lmWarmup) external;

    function setLMDuration(uint256 lmDuration) external;

    function setIssuerCooldown(uint256 issuerCooldown) external;

    function balanceOf(address meToken, address account)
        external
        view
        returns (uint256 stakedBalance);

    function getIssuerCooldown() external view returns (uint256 issuerCooldown);

    function getLMWarmup() external view returns (uint256 lmWarmup);

    function getLMDuration() external view returns (uint256 lmDuration);

    function getSeasonCount() external view returns (uint256 seasonCount);

    function getPoolInfo(address meToken)
        external
        view
        returns (
            uint256 seasonId,
            uint256 pendingIssuerRewards,
            bool pendingIssuerRewardsAdded,
            uint256 lastUpdateTime,
            uint256 totalSupply,
            uint256 lastCirculatingSupply,
            uint256 rewardPerTokenStored
        );

    function getSeasonInfo(uint256 seasonId)
        external
        view
        returns (SeasonInfo memory);
}
