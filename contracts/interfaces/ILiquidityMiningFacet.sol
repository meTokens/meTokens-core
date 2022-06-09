// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title MeToken liquidity mining interface
/// @author Carter Carlson (@cartercarlson)
interface ILiquidityMiningFacet {
    event InitSeason(bytes32 merkleRoot);
    event RewardPaid(address meToken, address sender, uint256 reward);
    event Staked(address meToken, address sender, uint256 amount);
    event Withdrawn(address meToken, address sender, uint256 amount);
    // event RewardAdded(uint256 seasonId, uint256 amount);
    event Recovered(IERC20 token, uint256 amount);

    function setLMDuration(uint256 lmDuration) external;

    function balanceOf(address meToken, address account)
        external
        view
        returns (uint256 stakedBalance);

    function getLMDuration() external view returns (uint256 lmDuration);

    function getPoolInfo(address meToken, address user)
        external
        view
        returns (
            bytes32 seasonMerkleRoot,
            uint256 lastUpdateTime,
            uint256 totalSupply,
            uint256 rewardPerTokenStored,
            uint256 userRewardPerTokenPaid,
            uint256 rewards
        );

    function getSeasonInfo()
        external
        view
        returns (
            uint256 startTime,
            uint256 endTime,
            uint256 allocationPool,
            uint256 rewardRate,
            bytes32 merkleRoot
        );
}
