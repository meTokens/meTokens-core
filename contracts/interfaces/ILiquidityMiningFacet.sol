// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title MeToken liquidity mining interface
/// @author Carter Carlson (@cartercarlson)
interface ILiquidityMiningFacet {
    event RewardPaid(address meToken, address sender, uint256 reward);
    event Staked(address meToken, address sender, uint256 amount);
    event Withdrawn(address meToken, address sender, uint256 amount);
    event RewardAdded(uint256 seasonNum, uint256 amount);
    event Recovered(IERC20 token, uint256 amount);
}
