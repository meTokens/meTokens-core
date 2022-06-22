// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

// Modified version of https://github.com/Synthetixio/synthetix/blob/develop/contracts/StakingRewards.sol

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {ILiquidityMiningFacet} from "../interfaces/ILiquidityMiningFacet.sol";
import {LibLiquidityMining, PoolInfo, LiquidityMiningStorage} from "../libs/LibLiquidityMining.sol";
import {MeTokenInfo} from "../libs/LibMeToken.sol";
import {Modifiers} from "../libs/LibAppStorage.sol";
import {LibMeta} from "../libs/LibMeta.sol";
import {ReentrancyGuard} from "../utils/ReentrancyGuard.sol";
import "hardhat/console.sol";

/// @author @cartercarlson, @bunsdev, @cbobrobison
/// @title Rewards contract for meTokens liquidity mining
contract LiquidityMiningFacet is
    ILiquidityMiningFacet,
    Modifiers,
    ReentrancyGuard
{
    using SafeERC20 for IERC20;
    /// @notice checks if `meToken` is part of `season`.
    /// @param  meToken - address a metoken address.
    /// @param merkleProof - bytes32[] merkle proof that ensures that `meToken` is part of `seasonId`.
    modifier onlyMeTokenInSeason(
        address meToken,
        bytes32[] calldata merkleProof
    ) {
        require(
            isMeTokenInSeason(meToken, merkleProof) == true,
            "not in season"
        );
        _;
    }
    modifier onlyLiveSeason() {
        require(
            block.timestamp >=
                LibLiquidityMining.liquidityMiningStorage().startTime &&
                block.timestamp <=
                LibLiquidityMining.liquidityMiningStorage().endTime,
            "not live"
        );
        _;
    }

    function initSeason(
        uint256 initTime,
        uint256 allocationPool, // ME tokens allocated for the season for metoken stakers
        uint256 meTokenCount, // number of metoken included in the season
        bytes32 merkleRoot
    ) external onlyLiquidityMiningController {
        require(allocationPool > 0, "allocationPool=0");
        require(meTokenCount > 0, "meTokenCount=0");
        LiquidityMiningStorage storage ls = LibLiquidityMining
            .liquidityMiningStorage();
        require(initTime >= block.timestamp, "init time < timestamp");

        ls.me.safeTransferFrom(
            LibMeta.msgSender(),
            address(this),
            allocationPool
        );
        // TODO: need to check for precision here? At least allocationPool > s.lmDuration.
        // TODO to solve this, should we take `rewardRate` as param and cal `allocationPool`?
        uint256 rewardRate = allocationPool / meTokenCount / ls.lmDuration;

        ls.startTime = initTime;
        ls.endTime = ls.startTime + ls.lmDuration;
        ls.allocationPool = allocationPool;
        ls.merkleRoot = merkleRoot;
        ls.rewardRate = rewardRate;

        emit InitSeason(merkleRoot);
    }

    // Staking is only allowed while the season is live and the meToken is featured
    function stake(
        address meToken,
        uint256 amount,
        bytes32[] calldata merkleProof
    )
        external
        nonReentrant
        onlyLiveSeason
        onlyMeTokenInSeason(meToken, merkleProof)
    {
        require(amount > 0, "cannot stake 0");
        address sender = LibMeta.msgSender();
        _resetPool(meToken, sender);

        LiquidityMiningStorage storage ls = LibLiquidityMining
            .liquidityMiningStorage();

        _updateReward(meToken, sender);
        PoolInfo storage poolInfo = ls.pools[meToken];
        poolInfo.totalSupply += amount;
        // _totalSupply = _totalSupply.add(amount);
        //_balances[msg.sender] = _balances[msg.sender].add(amount);
        ls.stakedBalances[meToken][sender] += amount;

        //stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        IERC20(meToken).safeTransferFrom(sender, address(this), amount);
        emit Staked(meToken, sender, amount);
    }

    function exit(address meToken) external {
        address sender = LibMeta.msgSender();
        LiquidityMiningStorage storage ls = LibLiquidityMining
            .liquidityMiningStorage();
        withdraw(meToken, ls.stakedBalances[meToken][sender]);
        claimReward(meToken);
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function recoverERC20(
        IERC20 token,
        address recipient,
        uint256 amount
    ) external onlyLiquidityMiningController {
        LiquidityMiningStorage storage ls = LibLiquidityMining
            .liquidityMiningStorage();
        require(
            address(token) != address(ls.me),
            "Cannot withdraw the reward token"
        );
        require(
            s.meTokens[address(token)].hubId == 0,
            "Cannot withdraw a meToken"
        );
        token.safeTransfer(recipient, amount);
        emit Recovered(token, amount);
    }

    function setLMDuration(uint256 lmDuration)
        external
        override
        onlyDurationsController
    {
        LiquidityMiningStorage storage ls = LibLiquidityMining
            .liquidityMiningStorage();
        require(lmDuration != ls.lmDuration, "same lmDuration");

        ls.lmDuration = lmDuration;
    }

    /* ==========  ========== */

    function getLMDuration()
        external
        view
        override
        returns (uint256 lmDuration)
    {
        lmDuration = LibLiquidityMining.liquidityMiningStorage().lmDuration;
    }

    function getPoolInfo(address meToken, address user)
        external
        view
        override
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
        return LibLiquidityMining.getPoolInfo(meToken, user);
    }

    function getSeasonInfo()
        external
        view
        override
        returns (
            uint256 startTime,
            uint256 endTime,
            uint256 allocationPool, // allocation for each meToken in a season
            uint256 rewardRate,
            bytes32 merkleRoot
        )
    {
        return LibLiquidityMining.getSeasonInfo();
    }

    function withdraw(address meToken, uint256 amount) public nonReentrant {
        require(amount > 0, "Cannot withdraw 0");

        address sender = LibMeta.msgSender();
        _updateReward(meToken, sender);
        LiquidityMiningStorage storage ls = LibLiquidityMining
            .liquidityMiningStorage();
        PoolInfo storage poolInfo = ls.pools[meToken];

        // _totalSupply = _totalSupply.sub(amount);
        poolInfo.totalSupply -= amount;
        // _balances[msg.sender] = _balances[msg.sender].sub(amount);
        ls.stakedBalances[meToken][sender] -= amount;
        // stakingToken.safeTransfer(msg.sender, amount);
        IERC20(meToken).safeTransfer(sender, amount);
        emit Withdrawn(meToken, sender, amount);
    }

    function claimReward(address meToken) public nonReentrant {
        address sender = LibMeta.msgSender();
        _updateReward(meToken, sender);
        LiquidityMiningStorage storage ls = LibLiquidityMining
            .liquidityMiningStorage();
        PoolInfo storage poolInfo = ls.pools[meToken];

        //uint256 reward = rewards[msg.sender];
        uint256 reward = poolInfo.rewards[sender];
        if (reward > 0) {
            /*    rewards[msg.sender] = 0;
            rewardsToken.safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward); */
            poolInfo.rewards[sender] = 0;

            ls.me.safeTransfer(sender, reward);
            emit RewardPaid(meToken, sender, reward);
        }
    }

    function earned(address meToken, address account)
        public
        view
        returns (uint256)
    {
        LiquidityMiningStorage storage ls = LibLiquidityMining
            .liquidityMiningStorage();
        PoolInfo storage poolInfo = ls.pools[meToken];
        if (poolInfo.seasonMerkleRoot[account] == 0) return 0;
        console.log(
            "## earned \n meToken:%s \n account:%s \n  poolInfo.userRewardPerTokenPaid[account]:%s",
            meToken,
            account,
            poolInfo.userRewardPerTokenPaid[account]
        );
        console.log(
            " rewardPerToken(meToken):%s \n balanceOf(meToken, account):%s \n ##",
            rewardPerToken(meToken),
            balanceOf(meToken, account)
        );
        return
            ((balanceOf(meToken, account) *
                (rewardPerToken(meToken) -
                    poolInfo.userRewardPerTokenPaid[account])) / s.PRECISION) +
            poolInfo.rewards[account];

        /*   return
            _balances[account]
                .mul(rewardPerToken().sub(userRewardPerTokenPaid[account]))
                .div(1e18)
                .add(rewards[account]); */
    }

    function balanceOf(address meToken, address account)
        public
        view
        override
        returns (uint256)
    {
        return
            LibLiquidityMining.liquidityMiningStorage().stakedBalances[meToken][
                account
            ];
    }

    function lastTimeRewardApplicable(address meToken)
        public
        view
        returns (uint256)
    {
        LiquidityMiningStorage storage ls = LibLiquidityMining
            .liquidityMiningStorage();
        uint256 endTime = ls.pools[meToken].endTime;

        return block.timestamp < endTime ? block.timestamp : endTime;
        // return block.timestamp < periodFinish ? block.timestamp : periodFinish;
    }

    function rewardPerToken(address meToken) public view returns (uint256) {
        LiquidityMiningStorage storage ls = LibLiquidityMining
            .liquidityMiningStorage();
        PoolInfo storage poolInfo = ls.pools[meToken];

        /*   if (_totalSupply == 0) {
            return rewardPerTokenStored;
        } */

        if (poolInfo.totalSupply == 0) {
            return poolInfo.rewardPerTokenStored;
        }
        /*         return
            rewardPerTokenStored.add(
                lastTimeRewardApplicable()
                    .sub(lastUpdateTime)
                    .mul(rewardRate)
                    .mul(1e18)
                    .div(_totalSupply)
            ); */
        /* console.log(
            "##  rewardPerToken \n lastTimeRewardApplicable(meToken):%s \n poolInfo.lastUpdateTime:%s \n poolInfo.rewardPerTokenStored:%s  ",
            lastTimeRewardApplicable(meToken),
            poolInfo.lastUpdateTime,
            poolInfo.rewardPerTokenStored
        );
        console.log(
            " poolInfo.rewardRate):%s \n poolInfo.totalSupply:%s \n meToken:%s \n##",
            poolInfo.rewardRate,
            poolInfo.totalSupply,
            meToken
        ); */
        return
            poolInfo.rewardPerTokenStored +
            (((lastTimeRewardApplicable(meToken) - poolInfo.lastUpdateTime) *
                poolInfo.rewardRate *
                s.PRECISION) / poolInfo.totalSupply);
    }

    function timeRemainingInSeason() public view returns (uint256 amount) {
        if (isSeasonLive()) {
            amount =
                LibLiquidityMining.liquidityMiningStorage().endTime -
                block.timestamp;
        }
    }

    function isSeasonLive() public view returns (bool) {
        LiquidityMiningStorage storage ls = LibLiquidityMining
            .liquidityMiningStorage();

        return
            (block.timestamp >= ls.startTime) &&
            (block.timestamp <= ls.endTime);
    }

    function hasSeasonEnded() public view returns (bool) {
        return
            block.timestamp >=
            LibLiquidityMining.liquidityMiningStorage().endTime;
    }

    /// @notice checks if `meToken` is part of `season`.
    /// @param  meToken - address a metoken address.
    /// @param merkleProof - bytes32[] merkle proof that ensures that `meToken` is part of `seasonId`.
    function isMeTokenInSeason(address meToken, bytes32[] calldata merkleProof)
        public
        view
        returns (bool)
    {
        return
            MerkleProof.verify(
                merkleProof,
                LibLiquidityMining.liquidityMiningStorage().merkleRoot,
                keccak256(abi.encodePacked(meToken))
            );
    }

    /// @notice resets meToken pool if featured in a new season
    function _resetPool(address meToken, address account) internal {
        LiquidityMiningStorage storage ls = LibLiquidityMining
            .liquidityMiningStorage();
        PoolInfo storage poolInfo = ls.pools[meToken];
        console.log("## _resetPool \n poolInfo.seasonMerkleRoot ");
        console.logBytes32(poolInfo.seasonMerkleRoot[account]);
        console.log(" ls.merkleRoot  ");
        console.logBytes32(ls.merkleRoot);
        console.log("meToken:%s  ", meToken);
        // If meToken pool has the same merkle root as the active season,
        //   we don't need to reset the pool as it's active
        if (poolInfo.seasonMerkleRoot[account] == ls.merkleRoot) return;

        // Keep track of total supply so that we still know how much is staked if we
        // clean the pool
        uint256 totalSupply = poolInfo.totalSupply;

        // clean pool info if already featured
        if (poolInfo.seasonMerkleRoot[account] != 0) {
            delete ls.pools[meToken];
            delete ls.pools[meToken].userRewardPerTokenPaid[account];
            delete ls.pools[meToken].rewards[account];
        }

        PoolInfo storage newMeTokenPool = ls.pools[meToken];
        newMeTokenPool.seasonMerkleRoot[account] = ls.merkleRoot;
        newMeTokenPool.totalSupply = totalSupply;
        newMeTokenPool.rewardRate = ls.rewardRate;
        newMeTokenPool.endTime = ls.endTime;
        newMeTokenPool.lastUpdateTime = ls.startTime;
    }

    function _updateReward(address meToken, address account) internal {
        LiquidityMiningStorage storage ls = LibLiquidityMining
            .liquidityMiningStorage();
        PoolInfo storage poolInfo = ls.pools[meToken];
        poolInfo.rewardPerTokenStored = rewardPerToken(meToken);
        poolInfo.lastUpdateTime = lastTimeRewardApplicable(meToken);

        if (account != address(0)) {
            //  rewards[account] = earned(account);
            poolInfo.rewards[account] = earned(meToken, account);
            //   userRewardPerTokenPaid[account] = rewardPerTokenStored;
            poolInfo.userRewardPerTokenPaid[account] = poolInfo
                .rewardPerTokenStored;
        }
    }
}
