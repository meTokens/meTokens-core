// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

import {LibAppStorage, AppStorage} from "./LibAppStorage.sol";

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
    struct LiquidityMiningStorage {
        uint256 status;
    }
    uint256 constant _NOT_ENTERED = 1;
    uint256 constant _ENTERED = 2;
    bytes32 public constant LIQUIDITY_MINING_STORAGE_POSITION =
        keccak256("diamond.standard.liquidity.mining.storage");

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

    function getPoolInfo(address meToken)
        internal
        view
        returns (
            uint256 seasonId,
            uint256 pendingIssuerRewards,
            bool pendingIssuerRewardsAdded,
            uint256 lastUpdateTime,
            uint256 totalSupply,
            uint256 lastCirculatingSupply,
            uint256 rewardPerTokenStored
        )
    {
        AppStorage storage s = LibAppStorage.diamondStorage();
        seasonId = s.pools[meToken].seasonId;
        pendingIssuerRewards = s.pools[meToken].pendingIssuerRewards;
        pendingIssuerRewardsAdded = s.pools[meToken].pendingIssuerRewardsAdded;
        lastUpdateTime = s.pools[meToken].lastUpdateTime;
        totalSupply = s.pools[meToken].totalSupply;
        lastCirculatingSupply = s.pools[meToken].lastCirculatingSupply;
        rewardPerTokenStored = s.pools[meToken].rewardPerTokenStored;
    }

    function getUserPoolInfo(address meToken, address user)
        internal
        view
        returns (uint256 userRewardPerTokenPaid, uint256 rewards)
    {
        AppStorage storage s = LibAppStorage.diamondStorage();
        PoolInfo storage poolInfo = s.pools[meToken];
        userRewardPerTokenPaid = poolInfo.userRewardPerTokenPaid[user];
        rewards = poolInfo.rewards[user];
    }
}
