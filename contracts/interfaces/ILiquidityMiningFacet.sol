// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SeasonInfo} from "../libs/LibLiquidityMining.sol";

/// @title MeToken liquidity mining interface
/// @author Carter Carlson (@cartercarlson)
interface ILiquidityMiningFacet {
    event InitSeason(bytes32 merkleRoot);
    event RewardPaid(address meToken, address sender, uint256 reward);
    event IssuerRewardPaid(address meToken, address sender, uint256 reward);
    event Staked(address meToken, address sender, uint256 amount);
    event Withdrawn(address meToken, address sender, uint256 amount);
    // event RewardAdded(uint256 seasonId, uint256 amount);
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

    function getPoolInfo(address meToken, address user)
        external
        view
        returns (
            bytes32 seasonMerkleRoot,
            uint256 pendingIssuerRewards,
            bool pendingIssuerRewardsAdded,
            uint256 lastUpdateTime,
            uint256 totalSupply,
            uint256 lastCirculatingSupply,
            uint256 rewardPerTokenStored,
            uint256 userRewardPerTokenPaid,
            uint256 rewards
        );

    function getSeasonInfo() external view returns (SeasonInfo memory);
}
