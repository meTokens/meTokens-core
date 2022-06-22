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
    uint256 status;
    IERC20 me; // reward token
    uint256 startTime;
    uint256 endTime;
    uint256 allocationPool; // allocation for each meToken in a season
    uint256 rewardRate;
    bytes32 merkleRoot;
}
struct UserPoolInfo {
    bytes32 currentMerkleRoot;
    uint256 rewardPerTokenPaid;
    uint256 rewards;
}
struct PoolInfo {
    bytes32 seasonMerkleRoot; // used to identify if it is a new season
    uint256 lastUpdateTime;
    uint256 totalSupply; // supply staked
    uint256 rewardPerTokenStored;
    uint256 rewardRate;
    uint256 endTime;
    mapping(address => UserPoolInfo) user;
    /*  mapping(address => bytes32) seasonMerkleRoot;
    mapping(address => uint256) userRewardPerTokenPaid;
    mapping(address => uint256) rewards; // key: staker addr */
}

library LibLiquidityMining {
    bytes32 public constant LIQUIDITY_MINING_STORAGE_POSITION =
        keccak256("diamond.standard.liquidity.mining.storage");

    function getPoolInfo(address meToken, address account)
        internal
        view
        returns (
            bytes32 seasonMerkleRoot,
            uint256 lastUpdateTime,
            uint256 totalSupply,
            uint256 rewardPerTokenStored,
            uint256 userRewardPerTokenPaid,
            uint256 rewards,
            uint256 rewardRate,
            uint256 endTime
        )
    {
        PoolInfo storage p = liquidityMiningStorage().pools[meToken];
        UserPoolInfo memory u = liquidityMiningStorage().pools[meToken].user[
            account
        ];
        seasonMerkleRoot = p.seasonMerkleRoot;
        lastUpdateTime = p.lastUpdateTime;
        totalSupply = p.totalSupply;
        // rewardPerTokenStored and userRewardPerTokenPaid might no be
        // accurate for the current season. Indeed it could come from a previous season
        // unless user stake again in a new season these amounts will stay the same
        rewardPerTokenStored = p.rewardPerTokenStored;
        userRewardPerTokenPaid = u.rewardPerTokenPaid;
        rewards = u.rewards;
        rewardRate = p.rewardRate;
        endTime = p.endTime;
    }

    function getSeasonInfo()
        internal
        view
        returns (
            uint256 startTime,
            uint256 endTime,
            uint256 allocationPool, // allocation for each meToken in a season
            uint256 rewardRate,
            bytes32 merkleRoot
        )
    {
        LiquidityMiningStorage storage ls = liquidityMiningStorage();
        startTime = ls.startTime;
        endTime = ls.endTime;
        allocationPool = ls.allocationPool;
        rewardRate = ls.rewardRate;
        merkleRoot = ls.merkleRoot;
    }

    function getUserPoolInfo(address meToken, address account)
        internal
        view
        returns (uint256 userRewardPerTokenPaid, uint256 rewards)
    {
        UserPoolInfo storage poolInfo = liquidityMiningStorage()
            .pools[meToken]
            .user[account];
        userRewardPerTokenPaid = poolInfo.rewardPerTokenPaid;
        rewards = poolInfo.rewards;
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
