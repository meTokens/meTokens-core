// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

import {LibAppStorage, AppStorage} from "./LibAppStorage.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

struct LiquidityMiningStorage {
    // LiquidityMining-specific
    uint256 issuerCooldown; // # of seasons a meToken issuer has to wait before participating again
    uint256 lmDuration; // = 1000000; // timeframe from a season starting to ending - about 11.5 days
    mapping(address => mapping(address => uint256)) stakedBalances; // key 1: meToken addr- key2: staker addr- value: amount staked
    mapping(address => PoolInfo) pools;
    SeasonInfo season;
    uint256 status;
    IERC20 me; // reward token
}
struct PoolInfo {
    bytes32 seasonMerkleRoot; // used to identify if it is a new season
    uint256 lastUpdateTime;
    uint256 totalSupply; // supply staked
    uint256 rewardPerTokenStored;
    mapping(address => uint256) userRewardPerTokenPaid;
    mapping(address => uint256) rewards; // key: staker addr
}

struct SeasonInfo {
    uint256 startTime;
    uint256 endTime;
    uint256 allocationPool; // allocation for each meToken in a season
    uint256 rewardRate;
    bytes32 merkleRoot;
}

library LibLiquidityMining {
    bytes32 public constant LIQUIDITY_MINING_STORAGE_POSITION =
        keccak256("diamond.standard.liquidity.mining.storage");

    function getPoolInfo(address meToken, address user)
        internal
        view
        returns (
            bytes32 seasonMerkleRoot,
            uint256 lastUpdateTime,
            uint256 totalSupply,
            uint256 rewardPerTokenStored,
            uint256 userRewardPerTokenPaid,
            uint256 rewards
        )
    {
        LiquidityMiningStorage storage ls = liquidityMiningStorage();
        seasonMerkleRoot = ls.pools[meToken].seasonMerkleRoot;
        lastUpdateTime = ls.pools[meToken].lastUpdateTime;
        totalSupply = ls.pools[meToken].totalSupply;
        rewardPerTokenStored = ls.pools[meToken].rewardPerTokenStored;
        userRewardPerTokenPaid = ls.pools[meToken].userRewardPerTokenPaid[user];
        rewards = ls.pools[meToken].rewards[user];
    }

    function getUserPoolInfo(address meToken, address user)
        internal
        view
        returns (uint256 userRewardPerTokenPaid, uint256 rewards)
    {
        LiquidityMiningStorage storage ls = liquidityMiningStorage();
        PoolInfo storage poolInfo = ls.pools[meToken];
        userRewardPerTokenPaid = poolInfo.userRewardPerTokenPaid[user];
        rewards = poolInfo.rewards[user];
    }

    function liquidityMiningStorage()
        internal
        pure
        returns (LiquidityMiningStorage storage ds)
    {
        bytes32 position = LIQUIDITY_MINING_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }
}
