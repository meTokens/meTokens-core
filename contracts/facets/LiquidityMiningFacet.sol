// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

// Modified version of https://github.com/Synthetixio/synthetix/blob/develop/contracts/StakingRewards.sol

import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {ILiquidityMiningFacet} from "../interfaces/ILiquidityMiningFacet.sol";
import {LibLiquidityMining, PoolInfo, SeasonInfo} from "../libs/LibLiquidityMining.sol";
import {MeTokenInfo} from "../libs/LibMeToken.sol";
import {Modifiers} from "../libs/LibAppStorage.sol";
import {LibMeta} from "../libs/LibMeta.sol";

/// @author @cartercarlson, @bunsdev, @cbobrobison
/// @title Rewards contract for meTokens liquidity mining
contract LiquidityMiningFacet is
    ILiquidityMiningFacet,
    ReentrancyGuard,
    Modifiers
{
    using SafeERC20 for IERC20;

    function initSeason(
        uint256 initTime,
        uint256 allocationPool,
        uint256 allocationIssuers,
        bytes32 merkleRoot
    ) external onlyLiquidityMiningController {
        require(!isSeasonLive(s.seasonCount), "season still live");

        s.me.safeTransferFrom(
            LibMeta.msgSender(),
            address(this),
            allocationPool + allocationIssuers
        );
        // TODO: need to check for precision here? At least allocationPool > s.lmDuration.
        uint256 rewardRate = allocationPool / s.lmDuration;

        // can only schedule once last season has ended? No
        // when a season inits, do we distribute allocations to each meToken in the season?
        // - buyer: arg could be 20 meaning each meTokens pool gets 20 ME, OR arg could be 100 meaning each meTokens
        //      pool gets 20 ME (there are 5 meTokens in the season)
        // - issuer - total amount of ME that issuers could win
        SeasonInfo storage newSeasonInfo = s.seasons[++s.seasonCount];
        newSeasonInfo.initTime = initTime;
        newSeasonInfo.startTime = initTime + s.lmWarmup;
        newSeasonInfo.endTime = newSeasonInfo.startTime + s.lmDuration;
        newSeasonInfo.allocationPool = allocationPool;
        newSeasonInfo.allocationIssuers = allocationIssuers;
        newSeasonInfo.merkleRoot = merkleRoot;
        newSeasonInfo.rewardRate = rewardRate;
        // TODO emit an event?
    }

    // TODO - should this update every meToken in a season?
    function addToRewardsAllocation(address meToken, uint256 amount)
        external
        nonReentrant
        onlyLiquidityMiningController
    {
        require(
            amount <= balanceOf(meToken, address(this)),
            "_addToRewardsAllocation: insufficient rewards balance."
        );
        _updateAccrual(meToken);

        SeasonInfo storage seasonInfo = s.seasons[s.seasonCount];
        uint256 remainingTime;
        if (!isSeasonLive(s.seasonCount) || hasSeasonEnded(s.seasonCount)) {
            remainingTime = seasonInfo.endTime - seasonInfo.startTime;
        } else {
            remainingTime = timeRemainingInSeason(s.seasonCount);
        }

        seasonInfo.rewardRate =
            seasonInfo.rewardRate +
            (amount / (remainingTime));

        emit RewardAdded(s.seasonCount, amount);
    }

    // NOTE: only updates pool from stake/withdraw
    function stake(
        address meToken,
        uint256 amount,
        uint256 index,
        bytes32[] calldata merkleProof
    ) external nonReentrant {
        require(amount > 0, "RewardsPool: cannot stake zero");

        address sender = LibMeta.msgSender();

        refreshPool(meToken, index, merkleProof);
        updateReward(meToken, sender);

        IERC20(meToken).safeTransferFrom(sender, address(this), amount);

        s.stakedBalances[meToken][sender] += amount;
        _refreshSupplyStats(meToken, amount, true);

        emit Staked(meToken, sender, amount);
    }

    function exit(
        address meToken,
        uint256 index,
        bytes32[] calldata merkleProof
    ) external nonReentrant {
        address sender = LibMeta.msgSender();

        withdraw(
            meToken,
            s.stakedBalances[meToken][sender],
            index,
            merkleProof
        );
        claimReward(meToken, 0);
    }

    function recoverERC20(
        IERC20 token,
        address recipient,
        uint256 amount
    )
        external
        // TODO: should this access control be different
        onlyLiquidityMiningController
    {
        require(
            address(token) != address(s.me),
            "Cannot withdraw the staking token"
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
        // TODO: do we need to add any condition on lmWarmup?
        s.lmWarmup = lmWarmup;
    }

    function setLMDuration(uint256 lmDuration)
        external
        override
        onlyDurationsController
    {
        require(lmDuration != s.meTokenDuration, "same lmDuration");
        // TODO: do we need to add any condition on lmDuration?
        s.lmDuration = lmDuration;
    }

    function setIssuerCooldown(uint256 issuerCooldown)
        external
        override
        onlyDurationsController
    {
        require(issuerCooldown != s.issuerCooldown, "same issuerCooldown");
        // TODO: do we need to add any condition on lmDuration?
        s.issuerCooldown = issuerCooldown;
    }

    // TODO: could claim on behalf of someone else?
    /// @param amount pass 0 to claim max else exact amount
    function claimReward(address meToken, uint256 amount) public nonReentrant {
        address sender = LibMeta.msgSender();
        updateReward(meToken, sender);
        PoolInfo storage poolInfo = s.pools[meToken];

        // TODO: check that meToken hasn't been more-recently featured than meToken.numSeason
        // using

        uint256 reward = poolInfo.rewards[sender];
        if (reward == 0) return;

        if (amount > 0) {
            poolInfo.rewards[sender] -= amount;
            s.me.safeTransfer(sender, amount);
        } else {
            amount = reward;
            poolInfo.rewards[sender] = 0;
            s.me.safeTransfer(sender, reward);
        }

        emit RewardPaid(meToken, sender, reward);
    }

    function withdraw(
        address meToken,
        uint256 amount,
        uint256 index,
        bytes32[] calldata merkleProof
    ) public nonReentrant {
        require(amount > 0, "RewardsPool: cannot withdraw zero");

        address sender = LibMeta.msgSender();

        refreshPool(meToken, index, merkleProof);
        updateReward(meToken, sender);

        s.stakedBalances[meToken][sender] -= amount;
        _refreshSupplyStats(meToken, amount, false);

        IERC20(meToken).safeTransfer(sender, amount);

        emit Withdrawn(meToken, sender, amount);
    }

    /// @notice refreshes & resets meToken pool if featured in a new season
    function refreshPool(
        address meToken,
        uint256 index,
        bytes32[] calldata merkleProof
    ) public {
        PoolInfo storage poolInfo = s.pools[meToken];

        if (
            poolInfo.seasonId == s.seasonCount ||
            !canTokenBeFeaturedInNewSeason(meToken)
        ) {
            // Refresh not needed :)
            return;
        }

        uint256 soonestSeason = poolInfo.seasonId == 0
            ? 1
            : poolInfo.seasonId + s.issuerCooldown;

        for (uint256 i = soonestSeason; i <= s.seasonCount; i++) {
            if (isMeTokenInSeason(i, meToken, index, merkleProof)) {
                SeasonInfo storage seasonInfo = s.seasons[i];
                uint256 pendingIssuerRewards = poolInfo.pendingIssuerRewards;
                uint256 totalSupply = poolInfo.totalSupply;

                // Check if meToken was featured in a previous season, as we'll need
                // to update pendingIssuerRewards and totalPctStaked
                if (soonestSeason > 1) {
                    SeasonInfo memory oldSeasonInfo = s.seasons[
                        poolInfo.seasonId
                    ];

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
                    delete s.pools[meToken];
                }

                PoolInfo storage newMeTokenPool = s.pools[meToken];
                newMeTokenPool.seasonId = i;
                newMeTokenPool.pendingIssuerRewards = pendingIssuerRewards;
                newMeTokenPool.totalSupply = totalSupply;
            }
        }
    }

    // TODO: have this refreshPools
    function updateReward(address meToken, address account)
        public
        nonReentrant
    {
        _updateAccrual(meToken);
        PoolInfo storage poolInfo = s.pools[meToken];
        if (account != address(0)) {
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
        uint256 seasonId = s.pools[token].seasonId;

        if (s.meTokens[token].hubId == 0) return false;
        return
            (seasonId == 0) || (seasonId + s.issuerCooldown <= s.seasonCount);
    }

    function isMeTokenInSeason(
        uint256 _seasonId,
        address meToken,
        uint256 index,
        bytes32[] calldata merkleProof
    ) public view returns (bool) {
        bytes32 node = keccak256(abi.encodePacked(index, meToken, uint256(1)));
        return
            MerkleProof.verify(
                merkleProof,
                s.seasons[_seasonId].merkleRoot,
                node
            );
    }

    function lastTimeRewardApplicable(address meToken)
        public
        view
        returns (uint256)
    {
        uint256 seasonId = s.pools[meToken].seasonId;
        SeasonInfo memory seasonInfo = s.seasons[seasonId];

        if (!isSeasonLive(seasonId)) return 0;

        return
            block.timestamp < seasonInfo.endTime
                ? block.timestamp
                : seasonInfo.endTime;
    }

    // TODO: validate
    function timeRemainingInSeason(uint256 num)
        public
        view
        returns (uint256 amount)
    {
        if (isSeasonLive(num)) {
            amount = s.seasons[num].endTime - block.timestamp;
        }
        if (hasSeasonEnded(num)) {
            amount = 0;
        }
    }

    function isSeasonLive(uint256 _seasonId) public view returns (bool) {
        SeasonInfo memory seasonInfo = s.seasons[_seasonId];
        return
            (block.timestamp >= seasonInfo.startTime) &&
            (block.timestamp <= seasonInfo.endTime);
    }

    function hasSeasonEnded(uint256 _seasonId) public view returns (bool) {
        return block.timestamp >= s.seasons[_seasonId].endTime;
    }

    // TODO: will this ever return an outdated earned balance for a metoken previously featured?
    function earned(address meToken, address account)
        public
        view
        returns (uint256)
    {
        // Divide by projectTokenBase in accordance with rewardPerToken()
        PoolInfo storage poolInfo = s.pools[meToken];
        if (poolInfo.seasonId == 0) return 0;
        return
            (balanceOf(meToken, account) *
                (rewardPerToken(meToken) -
                    poolInfo.userRewardPerTokenPaid[account])) /
            s.PRECISION +
            (poolInfo.rewards[account]);
    }

    function rewardPerToken(address meToken) public view returns (uint256) {
        PoolInfo storage poolInfo = s.pools[meToken];

        // If meToken was featured more than issuerCooldown seasons ago, validate
        // that meToken has not been re-listed since

        SeasonInfo memory seasonInfo = s.seasons[poolInfo.seasonId];
        if (poolInfo.totalSupply == 0) {
            return poolInfo.rewardPerTokenStored;
        }

        uint256 lastUpdateTime = poolInfo.lastUpdateTime;
        uint256 lastTimeRewardApplicable_ = lastTimeRewardApplicable(meToken);

        if (seasonInfo.startTime > lastUpdateTime) {
            // If lastTimeRewardApplicable is before the season start time,
            // The rewardPerToken is still constant
            if (seasonInfo.startTime > lastTimeRewardApplicable_) {
                return poolInfo.rewardPerTokenStored;
            }
            // Season is live but poolInfo has not yet modified
            // its' last startTime
            lastUpdateTime = seasonInfo.startTime;
        }

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
        returns (uint256 stakedBalance)
    {
        stakedBalance = s.stakedBalances[meToken][account];
    }

    function getIssuerCooldown()
        external
        view
        override
        returns (uint256 issuerCooldown)
    {
        issuerCooldown = s.issuerCooldown;
    }

    function getLMWarmup() external view override returns (uint256 lmWarmup) {
        lmWarmup = s.lmWarmup;
    }

    function getLMDuration()
        external
        view
        override
        returns (uint256 lmDuration)
    {
        lmDuration = s.lmDuration;
    }

    function getSeasonCount()
        external
        view
        override
        returns (uint256 seasonCount)
    {
        seasonCount = s.seasonCount;
    }

    function getPoolInfo(address meToken)
        external
        view
        override
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
        return LibLiquidityMining.getPoolInfo(meToken);
    }

    function getSeasonInfo(uint256 seasonId)
        external
        view
        override
        returns (SeasonInfo memory season)
    {
        // TODO maybe move this to lib
        season = s.seasons[seasonId];
    }

    function _updateAccrual(address meToken) private {
        PoolInfo storage poolInfo = s.pools[meToken];
        poolInfo.rewardPerTokenStored = rewardPerToken(meToken);
        poolInfo.lastUpdateTime = lastTimeRewardApplicable(meToken);
    }

    /// @dev updates poolInfo.lastCirculatingSupply & totalSupply, and seasonInfo.totalPctStaked
    function _refreshSupplyStats(
        address meToken,
        uint256 amount,
        bool add
    ) private {
        PoolInfo storage poolInfo = s.pools[meToken];
        SeasonInfo storage seasonInfo = s.seasons[poolInfo.seasonId];
        uint256 b = s.BASE;

        uint256 circulatingSupply = IERC20(meToken).totalSupply();
        uint256 oldPctStaked = (b * poolInfo.totalSupply) /
            poolInfo.lastCirculatingSupply;
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
        if (poolInfo.seasonId == s.seasonCount) {
            seasonInfo.totalPctStaked =
                seasonInfo.totalPctStaked -
                oldPctStaked +
                newPctStaked;
        }
    }
}