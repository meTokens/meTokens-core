// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

// Modified version of https://github.com/Synthetixio/synthetix/blob/develop/contracts/StakingRewards.sol

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {ILiquidityMiningFacet} from "../interfaces/ILiquidityMiningFacet.sol";
import {LibLiquidityMining, PoolInfo, SeasonInfo, LiquidityMiningStorage} from "../libs/LibLiquidityMining.sol";
import {MeTokenInfo} from "../libs/LibMeToken.sol";
import {Modifiers} from "../libs/LibAppStorage.sol";
import {LibMeta} from "../libs/LibMeta.sol";
import {LibMeToken} from "../libs/LibMeToken.sol";
import {ReentrancyGuard} from "../utils/ReentrancyGuard.sol";
import "hardhat/console.sol";

/// @author @cartercarlson, @bunsdev, @cbobrobison
/// @title Rewards contract for meTokens liquidity mining
// TODO generalize require strings
// TODO add logic to claim metoken issuer rewards.
contract LiquidityMiningFacet is
    ILiquidityMiningFacet,
    Modifiers,
    ReentrancyGuard
{
    using SafeERC20 for IERC20;

    function initSeason(
        uint256 initTime,
        uint256 allocationPool,
        uint256 allocationIssuers,
        bytes32 merkleRoot
    ) external onlyLiquidityMiningController {
        LiquidityMiningStorage storage ls = LibLiquidityMining
            .liquidityMiningStorage();
        require(initTime >= block.timestamp, "init time < timestamp");

        ls.me.safeTransferFrom(
            LibMeta.msgSender(),
            address(this),
            allocationPool + allocationIssuers
        );
        // TODO: need to check for precision here? At least allocationPool > s.lmDuration.
        // TODO to solve this, should we take `rewardRate` as param and cal `allocationPool`?
        uint256 rewardRate = allocationPool / ls.lmDuration;

        // can only schedule once last season has ended? No
        // when a season inits, do we distribute allocations to each meToken in the season?
        // - buyer: arg could be 20 meaning each meTokens pool gets 20 ME, OR arg could be 100 meaning each meTokens
        //      pool gets 20 ME (there are 5 meTokens in the season)
        // - issuer - total amount of ME that issuers could win
        SeasonInfo storage newSeasonInfo = ls.season;
        newSeasonInfo.initTime = initTime;
        newSeasonInfo.startTime = initTime + ls.lmWarmup;
        newSeasonInfo.endTime = newSeasonInfo.startTime + ls.lmDuration;
        newSeasonInfo.allocationPool = allocationPool;
        newSeasonInfo.allocationIssuers = allocationIssuers;
        newSeasonInfo.merkleRoot = merkleRoot;
        newSeasonInfo.rewardRate = rewardRate;

        emit InitSeason(merkleRoot);
    }

    // NOTE: only updates pool from stake/withdraw
    // TODO should revert with `meToken` does not have a hub
    function stake(
        address meToken,
        uint256 amount,
        bytes32[] calldata merkleProof
    ) external nonReentrant {
        require(amount > 0, "RewardsPool: cannot stake zero");

        address sender = LibMeta.msgSender();

        refreshPool(meToken, merkleProof);
        updateReward(meToken, sender);

        IERC20(meToken).safeTransferFrom(sender, address(this), amount);
        LiquidityMiningStorage storage ls = LibLiquidityMining
            .liquidityMiningStorage();
        ls.stakedBalances[meToken][sender] += amount;
        _refreshSupplyStats(meToken, amount, true);

        emit Staked(meToken, sender, amount);
    }

    function exit(address meToken, bytes32[] calldata merkleProof)
        external
        nonReentrant
    {
        address sender = LibMeta.msgSender();
        LiquidityMiningStorage storage ls = LibLiquidityMining
            .liquidityMiningStorage();
        withdraw(meToken, ls.stakedBalances[meToken][sender], merkleProof);
        claimReward(meToken, 0);
    }

    function issuerClaimReward() external {
        address sender = LibMeta.msgSender();

        address meToken = LibMeToken.getOwnerMeToken(sender);
        // Get the pool associated to the meToken issuer
        LiquidityMiningStorage storage ls = LibLiquidityMining
            .liquidityMiningStorage();
        PoolInfo storage poolInfo = ls.pools[meToken];

        // Give the issuer the rewards
        // TODO: ensure pendingIssuerRewards is updated after season end
        uint256 reward = poolInfo.pendingIssuerRewards;
        require(reward > 0, "No reward");
        ls.me.safeTransfer(sender, reward);
        poolInfo.pendingIssuerRewards = 0;

        emit IssuerRewardPaid(meToken, sender, reward);
    }

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

    function setLMWarmup(uint256 lmWarmup)
        external
        override
        onlyDurationsController
    {
        require(lmWarmup != s.meTokenWarmup, "same lmWarmup");
        LiquidityMiningStorage storage ls = LibLiquidityMining
            .liquidityMiningStorage();
        ls.lmWarmup = lmWarmup;
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

    function setIssuerCooldown(uint256 issuerCooldown)
        external
        override
        onlyDurationsController
    {
        LiquidityMiningStorage storage ls = LibLiquidityMining
            .liquidityMiningStorage();
        require(issuerCooldown != ls.issuerCooldown, "same issuerCooldown");

        ls.issuerCooldown = issuerCooldown;
    }

    function getIssuerCooldown() external view override returns (uint256) {
        return LibLiquidityMining.liquidityMiningStorage().issuerCooldown;
    }

    function getLMWarmup() external view override returns (uint256) {
        return LibLiquidityMining.liquidityMiningStorage().lmWarmup;
    }

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
            uint256 pendingIssuerRewards,
            // TODO not using this anywhere
            bool pendingIssuerRewardsAdded,
            uint256 lastUpdateTime,
            uint256 totalSupply,
            uint256 lastCirculatingSupply,
            uint256 rewardPerTokenStored,
            uint256 userRewardPerTokenPaid,
            uint256 rewards
        )
    {
        return LibLiquidityMining.getPoolInfo(meToken, user);
    }

    function getSeasonInfo()
        external
        view
        override
        returns (SeasonInfo memory season)
    {
        // TODO maybe move this to lib
        season = LibLiquidityMining.liquidityMiningStorage().season;
    }

    // TODO: could claim on behalf of someone else?
    /// @param amount pass 0 to claim max else exact amount
    function claimReward(address meToken, uint256 amount) public nonReentrant {
        address sender = LibMeta.msgSender();
        updateReward(meToken, sender);
        LiquidityMiningStorage storage ls = LibLiquidityMining
            .liquidityMiningStorage();
        PoolInfo storage poolInfo = ls.pools[meToken];

        // TODO: check that meToken hasn't been more-recently featured than meToken.numSeason
        // using

        uint256 reward = poolInfo.rewards[sender];
        if (reward == 0) return;

        if (amount > 0) {
            poolInfo.rewards[sender] -= amount;
            ls.me.safeTransfer(sender, amount);
        } else {
            amount = reward;
            poolInfo.rewards[sender] = 0;
            ls.me.safeTransfer(sender, reward);
        }

        emit RewardPaid(meToken, sender, reward);
    }

    function withdraw(
        address meToken,
        uint256 amount,
        bytes32[] calldata merkleProof
    ) public nonReentrant {
        require(amount > 0, "RewardsPool: cannot withdraw zero");

        address sender = LibMeta.msgSender();

        refreshPool(meToken, merkleProof);
        updateReward(meToken, sender);
        LiquidityMiningStorage storage ls = LibLiquidityMining
            .liquidityMiningStorage();
        ls.stakedBalances[meToken][sender] -= amount;
        _refreshSupplyStats(meToken, amount, false);

        IERC20(meToken).safeTransfer(sender, amount);

        emit Withdrawn(meToken, sender, amount);
    }

    /// @notice refreshes & resets meToken pool if featured in a new season
    function refreshPool(address meToken, bytes32[] calldata merkleProof)
        public
    {
        if (isMeTokenInSeason(meToken, merkleProof)) {
            LiquidityMiningStorage storage ls = LibLiquidityMining
                .liquidityMiningStorage();
            PoolInfo storage poolInfo = ls.pools[meToken];
            SeasonInfo storage seasonInfo = ls.season;
            uint256 pendingIssuerRewards = poolInfo.pendingIssuerRewards;
            uint256 totalSupply = poolInfo.totalSupply;

            // Check if meToken was featured in a previous season, as we'll need
            // to update pendingIssuerRewards and totalPctStaked
            /*   console.log(p0);
            (
                "poolInfo.seasonMerkleRoot:%s  seasonInfo.merkleRoot:%s",
                poolInfo.seasonMerkleRoot,
                seasonInfo.merkleRoot
            ); */
            console.log("## poolInfo.seasonMerkleRoot: ");
            console.logBytes32(poolInfo.seasonMerkleRoot);
            console.log("## seasonInfo.merkleRoot: ");
            console.logBytes32(seasonInfo.merkleRoot);

            if (
                poolInfo.seasonMerkleRoot != 0 &&
                poolInfo.seasonMerkleRoot != seasonInfo.merkleRoot
            ) {
                SeasonInfo memory oldSeasonInfo = ls.season;

                uint256 pctStaked = (s.BASE * poolInfo.totalSupply) /
                    poolInfo.lastCirculatingSupply;
                uint256 pctOfTotalStaked = (s.PRECISION * pctStaked) /
                    seasonInfo.totalPctStaked;
                uint256 newIssuerRewards = (pctOfTotalStaked *
                    oldSeasonInfo.allocationIssuers) / s.PRECISION;

                pendingIssuerRewards += newIssuerRewards;
                seasonInfo.totalPctStaked += pctStaked;

                // Refund sender since pool has already built up mapped data
                // TODO why not just update?
                delete ls.pools[meToken];
            }

            PoolInfo storage newMeTokenPool = ls.pools[meToken];
            newMeTokenPool.seasonMerkleRoot = seasonInfo.merkleRoot;
            newMeTokenPool.pendingIssuerRewards = pendingIssuerRewards;
            newMeTokenPool.totalSupply = totalSupply;
        }
    }

    // TODO: have this refreshPools
    // TODO does this need to be public? Users can use `earned` to finds their earnings.
    function updateReward(address meToken, address account) public {
        console.log("updateReward meToken:%s account:%s", meToken, account);
        _updateAccrual(meToken);
        LiquidityMiningStorage storage ls = LibLiquidityMining
            .liquidityMiningStorage();
        if (account != address(0)) {
            PoolInfo storage poolInfo = ls.pools[meToken];
            poolInfo.rewards[account] = earned(meToken, account);
            poolInfo.userRewardPerTokenPaid[account] = poolInfo
                .rewardPerTokenStored;
        }
    }

    function canTokenBeFeaturedInNewSeason(address token)
        public
        view
        returns (bool)
    {
        if (s.meTokens[token].hubId == 0) return false;
        LiquidityMiningStorage storage ls = LibLiquidityMining
            .liquidityMiningStorage();
        bytes32 seasonMerkleRoot = ls.pools[token].seasonMerkleRoot;
        return (seasonMerkleRoot == 0);
    }

    /**
        @notice checks if `meToken` is part of `season`. 
        @param meToken - address a metoken address.
        @param merkleProof - bytes32[] merkle proof that ensures that `meToken` is part of `seasonId`.
     */
    //  TODO can me made internal- as same calculation can be done off-chain.
    function isMeTokenInSeason(address meToken, bytes32[] calldata merkleProof)
        public
        view
        returns (bool)
    {
        return
            MerkleProof.verify(
                merkleProof,
                LibLiquidityMining.liquidityMiningStorage().season.merkleRoot,
                keccak256(abi.encodePacked(meToken))
            );
    }

    function lastTimeRewardApplicable() public view returns (uint256) {
        LiquidityMiningStorage storage ls = LibLiquidityMining
            .liquidityMiningStorage();
        SeasonInfo memory seasonInfo = ls.season;

        // TODO should this return seasonId endTime instead?
        console.log(
            "## lastTimeRewardApplicable isseasonLive:%s",
            isSeasonLive()
        );
        if (!isSeasonLive()) return 0;
        console.log(
            "## lastTimeRewardApplicable return:%s",
            block.timestamp < seasonInfo.endTime
                ? block.timestamp
                : seasonInfo.endTime
        );
        return
            block.timestamp < seasonInfo.endTime
                ? block.timestamp
                : seasonInfo.endTime;
    }

    // TODO: validate
    function timeRemainingInSeason() public view returns (uint256 amount) {
        if (isSeasonLive()) {
            amount =
                LibLiquidityMining.liquidityMiningStorage().season.endTime -
                block.timestamp;
        }
        if (hasSeasonEnded()) {
            amount = 0;
        }
    }

    function isSeasonLive() public view returns (bool) {
        SeasonInfo memory seasonInfo = LibLiquidityMining
            .liquidityMiningStorage()
            .season;
        console.log(
            "\n##isSeasonLive \n block.timestamp:%s \n seasonInfo.startTime:%s \n seasonInfo.endTime:%s\n",
            block.timestamp,
            seasonInfo.startTime,
            seasonInfo.endTime
        );
        return
            (block.timestamp >= seasonInfo.startTime) &&
            (block.timestamp <= seasonInfo.endTime);
    }

    function hasSeasonEnded() public view returns (bool) {
        return
            block.timestamp >=
            LibLiquidityMining.liquidityMiningStorage().season.endTime;
    }

    // TODO: will this ever return an outdated earned balance for a metoken previously featured?
    function earned(address meToken, address account)
        public
        view
        returns (uint256)
    {
        LiquidityMiningStorage storage ls = LibLiquidityMining
            .liquidityMiningStorage();
        // Divide by projectTokenBase in accordance with rewardPerToken()
        PoolInfo storage poolInfo = ls.pools[meToken];
        if (poolInfo.seasonMerkleRoot == 0) return 0;
        return
            (balanceOf(meToken, account) *
                (rewardPerToken(meToken) -
                    poolInfo.userRewardPerTokenPaid[account])) /
            s.PRECISION +
            (poolInfo.rewards[account]);
    }

    function rewardPerToken(address meToken) public view returns (uint256) {
        LiquidityMiningStorage storage ls = LibLiquidityMining
            .liquidityMiningStorage();
        PoolInfo storage poolInfo = ls.pools[meToken];

        // If meToken was featured more than issuerCooldown seasons ago, validate
        // that meToken has not been re-listed since

        SeasonInfo memory seasonInfo = ls.season;
        console.log(
            "## rewardPerToken poolInfo.totalSupply:%s poolInfo.rewardPerTokenStored:%s",
            poolInfo.totalSupply,
            poolInfo.rewardPerTokenStored
        );
        if (poolInfo.totalSupply == 0) {
            // TODO WHY ISN'T  IT 0 ??
            return poolInfo.rewardPerTokenStored;
        }

        uint256 lastUpdateTime = poolInfo.lastUpdateTime;
        uint256 lastTimeRewardApplicable_ = lastTimeRewardApplicable();
        console.log(
            "## rewardPerToken lastTimeRewardApplicable_:%s lastUpdateTime:%s diff:%s",
            lastTimeRewardApplicable_,
            lastUpdateTime,
            lastTimeRewardApplicable_ - lastUpdateTime
        );
        if (seasonInfo.startTime > lastUpdateTime) {
            // If lastTimeRewardApplicable is before the season start time,
            // The rewardPerToken is still constant
            if (seasonInfo.startTime > lastTimeRewardApplicable_) {
                return poolInfo.rewardPerTokenStored;
            }
            // Season is live but poolInfo has not yet modified
            // its' last startTime
            console.log(
                "## rewardPerToken asonInfo.startTime > lastUpdateTime startTime:%s",
                seasonInfo.startTime
            );
            lastUpdateTime = seasonInfo.startTime;
        }
        console.log(
            "## rewardPerToken poolInfo.rewardPerTokenStored :%s rewar",
            poolInfo.rewardPerTokenStored
        );
        // TODO if lastTimeRewardApplicable_=0 and lastUpdateTime>0, then this reverts.
        return
            poolInfo.rewardPerTokenStored +
            (((lastTimeRewardApplicable_ - lastUpdateTime) *
                seasonInfo.rewardRate *
                s.PRECISION) / poolInfo.totalSupply);
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

    function _updateAccrual(address meToken) private {
        PoolInfo storage poolInfo = LibLiquidityMining
            .liquidityMiningStorage()
            .pools[meToken];
        poolInfo.rewardPerTokenStored = rewardPerToken(meToken);

        poolInfo.lastUpdateTime = lastTimeRewardApplicable();
        console.log(
            "## _updateAccrual lastUpdateTime:%s  poolInfo.rewardPerTokenStored:%s",
            poolInfo.lastUpdateTime,
            poolInfo.rewardPerTokenStored
        );
    }

    /// @dev updates poolInfo.lastCirculatingSupply & totalSupply, and seasonInfo.totalPctStaked
    function _refreshSupplyStats(
        address meToken,
        uint256 amount,
        bool add
    ) private {
        LiquidityMiningStorage storage ls = LibLiquidityMining
            .liquidityMiningStorage();
        PoolInfo storage poolInfo = ls.pools[meToken];
        SeasonInfo storage seasonInfo = ls.season;
        uint256 b = s.BASE;

        uint256 circulatingSupply = IERC20(meToken).totalSupply();
        uint256 oldPctStaked = 0;
        if (poolInfo.totalSupply > 0) {
            oldPctStaked =
                (b * poolInfo.totalSupply) /
                poolInfo.lastCirculatingSupply;
        }
        uint256 newPctStaked;

        if (add) {
            newPctStaked =
                (b * (poolInfo.totalSupply + amount)) /
                circulatingSupply;
            poolInfo.totalSupply += amount;
        } else {
            newPctStaked =
                (b * (poolInfo.totalSupply - amount)) /
                circulatingSupply;
            poolInfo.totalSupply -= amount;
        }

        if (circulatingSupply != poolInfo.lastCirculatingSupply) {
            poolInfo.lastCirculatingSupply = circulatingSupply;
        }
        // Only update totalPctStaked if it's a new season
        // TODO: could modifying totalSupply / lastCirculatingSupply have an effect
        // when someone tries to claim rewards from a meToken that isn't in a live season?
        if (poolInfo.seasonMerkleRoot == seasonInfo.merkleRoot) {
            // TODO try by removing this condition
            seasonInfo.totalPctStaked =
                seasonInfo.totalPctStaked -
                oldPctStaked +
                newPctStaked;
        }
    }
}
