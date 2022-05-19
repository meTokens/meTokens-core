// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

import {LibAppStorage, AppStorage} from "./LibAppStorage.sol";

struct LiquidityMiningStorage {
    // LiquidityMining-specific
    uint256 issuerCooldown; // # of seasons a meToken issuer has to wait before participating again
    uint256 lmWarmup; // = 3 days; timeframe between initTime and startTime
    uint256 lmDuration; // = 1000000; // timeframe from a season starting to ending - about 11.5 days
    uint256 seasonCount; // # of seasons
    mapping(address => mapping(address => uint256)) stakedBalances; // key 1: meToken addr- key2: staker addr- value: amount staked
    mapping(address => PoolInfo) pools;
    mapping(uint256 => SeasonInfo) seasons;
    uint256 status;
}
struct PoolInfo {
    uint256 seasonId;
    uint256 pendingIssuerRewards;
    bool pendingIssuerRewardsAdded;
    uint256 lastUpdateTime;
    uint256 totalSupply; // supply staked
    uint256 lastCirculatingSupply;
    uint256 rewardPerTokenStored;
    mapping(address => uint256) userRewardPerTokenPaid;
    mapping(address => uint256) rewards; // key: staker addr
}

struct SeasonInfo {
    uint256 initTime;
    uint256 startTime;
    uint256 endTime;
    uint256 allocationPool; // allocation for each meToken in a season
    uint256 allocationIssuers; // total allocation for issuers in a season
    uint256 totalPctStaked;
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
            uint256 seasonId,
            uint256 pendingIssuerRewards,
            bool pendingIssuerRewardsAdded,
            uint256 lastUpdateTime,
            uint256 totalSupply,
            uint256 lastCirculatingSupply,
            uint256 rewardPerTokenStored,
            uint256 userRewardPerTokenPaid,
            uint256 rewards
        )
    {
        LiquidityMiningStorage storage ls = liquidityMiningStorage();
        seasonId = ls.pools[meToken].seasonId;
        pendingIssuerRewards = ls.pools[meToken].pendingIssuerRewards;
        pendingIssuerRewardsAdded = ls.pools[meToken].pendingIssuerRewardsAdded;
        lastUpdateTime = ls.pools[meToken].lastUpdateTime;
        totalSupply = ls.pools[meToken].totalSupply;
        lastCirculatingSupply = ls.pools[meToken].lastCirculatingSupply;
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
