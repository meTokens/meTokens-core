// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

// Modified version of https://github.com/Synthetixio/synthetix/blob/develop/contracts/StakingRewards.sol

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {MeTokenInfo} from "../libs/LibMeToken.sol";
import {Modifiers} from "../libs/LibAppStorage.sol";
import {LibMeta} from "../libs/LibMeta.sol";

/// @author @cartercarlson, @bunsdev, @cbobrobison
/// @title Rewards contract for meTokens liquidity mining
contract LiquidityMiningFacet is ReentrancyGuard, Modifiers {
    using SafeERC20 for IERC20;

    // TODO: move these to AppStorage
    uint256 constant PRECISION = 1e18;
    uint256 constant BASE = PRECISION * PRECISION * PRECISION;
    IERC20 public immutable me =
        IERC20(0x8375289350D4143559BF4d035178e35F2a15fc14);
    uint256 public seasonNum; // # of seasons
    uint256 public warmup = 3 days; // timeframe between initTime and startTime
    uint256 public duration = 1000000; // timeframe from a season starting to ending - about 11.5 days
    uint256 public immutable issuerCooldown = 5; // # of seasons a meToken issuer has to wait before participating again

    struct MeTokenPool {
        uint256 seasonNum;
        uint256 pendingIssuerRewards;
        bool pendingIssuerRewardsAdded;
        uint256 lastUpdateTime;
        uint256 totalSupply; // supply staked
        uint256 lastCirculatingSupply;
        uint256 rewardPerTokenStored;
        mapping(address => uint256) userRewardPerTokenPaid;
        mapping(address => uint256) rewards; // key: staker addr
    }

    mapping(address => MeTokenPool) public meTokenPools; // key: addr of meToken
    // key 1: meToken addr- key2: staker addr- value: amount staked
    mapping(address => mapping(address => uint256)) public balances;

    struct Season {
        uint256 initTime;
        uint256 startTime;
        uint256 endTime;
        uint256 allocationBuyer;
        uint256 allocationIssuer;
        uint256 totalPctStaked;
        uint256 rewardRate;
        uint256 numPools;
        bytes32 merkleRoot;
    }
    mapping(uint256 => Season) private seasons;

    event RewardPaid(address meToken, address sender, uint256 reward);
    event Staked(address meToken, address sender, uint256 amount);
    event Withdrawn(address meToken, address sender, uint256 amount);
    event RewardAdded(uint256 seasonNum, uint256 amount);
    event Recovered(IERC20 token, uint256 amount);

    constructor() {}

    function canTokenBeFeaturedInNewSeason(address token)
        public
        view
        returns (bool)
    {
        MeTokenInfo memory meTokenInfo = s.meTokens[token];
        MeTokenPool storage meTokenPool = meTokenPools[token];

        if (meTokenInfo.hubId == 0) return false;
        return
            (meTokenPool.seasonNum == 0) ||
            (meTokenPool.seasonNum + issuerCooldown <= seasonNum);
    }

    function isMeTokenInSeason(
        uint256 num,
        address meToken,
        uint256 index,
        bytes32[] calldata merkleProof
    ) public view returns (bool) {
        Season memory season = seasons[num];
        bytes32 node = keccak256(abi.encodePacked(index, meToken, uint256(1)));
        return MerkleProof.verify(merkleProof, season.merkleRoot, node);
    }

    function isSeasonLive(uint256 num) public view returns (bool) {
        Season memory season = seasons[num];
        return
            (block.timestamp >= season.startTime) &&
            (block.timestamp <= season.endTime);
    }

    function hasSeasonEnded(uint256 num) public view returns (bool) {
        return block.timestamp >= seasons[num].endTime;
    }

    function rewardPerToken(address meToken) public view returns (uint256) {
        MeTokenPool storage meTokenPool = meTokenPools[meToken];

        // If meToken was featured more than issuerCooldown seasons ago, validate
        // that meToken has not been re-listed since

        Season storage season = seasons[meTokenPool.seasonNum];
        if (meTokenPool.totalSupply == 0) {
            return meTokenPool.rewardPerTokenStored;
        }

        uint256 lastUpdateTime = meTokenPool.lastUpdateTime;
        uint256 lastTimeRewardApplicable_ = lastTimeRewardApplicable(meToken);

        if (season.startTime > lastUpdateTime) {
            // If lastTimeRewardApplicable is before the season start time,
            // The rewardPerToken is still constant
            if (season.startTime > lastTimeRewardApplicable_) {
                return meTokenPool.rewardPerTokenStored;
            }
            // Season is live but meTokenPool has not yet modified
            // its' last startTime
            lastUpdateTime = season.startTime;
        }

        return
            meTokenPool.rewardPerTokenStored +
            (((lastTimeRewardApplicable_ - lastUpdateTime) *
                season.rewardRate *
                PRECISION) / meTokenPool.totalSupply);
    }

    function balanceOf(address meToken, address account)
        public
        view
        returns (uint256)
    {
        return balances[meToken][account];
    }

    function earned(address meToken, address account)
        public
        view
        returns (uint256)
    {
        // Divide by projectTokenBase in accordance with rewardPerToken()
        MeTokenPool storage meTokenPool = meTokenPools[meToken];
        if (meTokenPool.seasonNum == 0) return 0;
        return
            (balanceOf(meToken, account) *
                (rewardPerToken(meToken) -
                    meTokenPool.userRewardPerTokenPaid[account])) /
            PRECISION +
            (meTokenPool.rewards[account]);
    }

    function lastTimeRewardApplicable(address meToken)
        public
        view
        returns (uint256)
    {
        MeTokenPool storage meTokenPool = meTokenPools[meToken];
        Season storage season = seasons[meTokenPool.seasonNum];

        if (!isSeasonLive(meTokenPool.seasonNum)) return 0;

        return
            block.timestamp < season.endTime ? block.timestamp : season.endTime;
    }

    // TODO: validate
    function timeRemainingInSeason(uint256 num)
        public
        view
        returns (uint256 amount)
    {
        if (isSeasonLive(num)) {
            amount = seasons[num].endTime - block.timestamp;
        }
        if (hasSeasonEnded(num)) {
            amount = 0;
        }
    }

    function initSeason(
        uint256 initTime,
        uint256 allocationBuyer,
        uint256 allocationIssuer,
        uint256 numPools,
        bytes32 merkleRoot
    ) external onlyLiquidityMiningController {
        require(!isSeasonLive(seasonNum), "Season still live");

        me.safeTransferFrom(
            LibMeta.msgSender(),
            address(this),
            allocationBuyer + allocationIssuer
        );
        uint256 rewardRate = allocationBuyer / duration;

        // can only schedule once last season has ended? No
        // when a season inits, do we distribute allocations to each meToken in the season?
        // - buyer: arg could be 20 meaning each meTokens pool gets 20 ME, OR arg could be 100 meaning each meTokens
        //      pool gets 20 ME (there are 5 meTokens in the season)
        // - issuer - total amount of ME that issuers could win
        // How/when would a meToken issuer claim
        // - at end of season - before next time the meToken is featured in a season
        Season storage newSeason = seasons[++seasonNum];
        newSeason.initTime = initTime;
        newSeason.startTime = initTime + warmup;
        newSeason.endTime = initTime + warmup + duration;
        newSeason.allocationBuyer = allocationBuyer;
        newSeason.allocationIssuer = allocationIssuer;
        newSeason.numPools = numPools;
        newSeason.merkleRoot = merkleRoot;
        newSeason.rewardRate = rewardRate;
    }

    function exit(
        address meToken,
        uint256 index,
        bytes32[] calldata merkleProof
    ) external nonReentrant {
        address sender = LibMeta.msgSender();

        withdraw(meToken, balances[meToken][sender], index, merkleProof);
        claimReward(meToken, index, merkleProof);
    }

    // TODO: could claim on behalf of someone else?
    function claimReward(
        address meToken,
        uint256 index,
        bytes32[] calldata merkleProof
    ) public nonReentrant {
        address sender = LibMeta.msgSender();
        updateReward(meToken, sender);
        MeTokenPool storage meTokenPool = meTokenPools[meToken];

        // TODO: check that meToken hasnt been more-recently featured than meToken.numSeason
        // using

        uint256 reward = meTokenPool.rewards[sender];
        if (reward == 0) return;

        meTokenPool.rewards[sender] = 0;
        me.safeTransfer(sender, reward);

        emit RewardPaid(meToken, sender, reward);
    }

    function claimRewardExact(
        address meToken,
        uint256 amount,
        uint256 index,
        bytes32[] calldata merkleProof
    ) public nonReentrant {
        address sender = LibMeta.msgSender();
        updateReward(meToken, sender);
        MeTokenPool storage meTokenPool = meTokenPools[meToken];

        if (amount == 0) return;

        meTokenPool.rewards[sender] -= amount;
        me.safeTransfer(sender, amount);

        emit RewardPaid(meToken, sender, amount);
    }

    // Ensure that the amount param is equal to the amount you've added to the contract, otherwise the funds will run out before _endTime.
    // Allocated towards to the soonest season: current, else upcoming.
    // TODO - should this update every meToken in a season?
    function addToRewardsAllocation(address meToken, uint256 amount)
        public
        nonReentrant
        onlyLiquidityMiningController
    {
        require(
            amount <= balanceOf(meToken, address(this)),
            "_addToRewardsAllocation: insufficient rewards balance."
        );
        _updateAccrual(meToken);

        Season storage season = seasons[seasonNum];
        uint256 remainingTime;
        if (!isSeasonLive(seasonNum) || hasSeasonEnded(seasonNum)) {
            remainingTime = season.endTime - season.startTime;
        } else {
            remainingTime = timeRemainingInSeason(seasonNum);
        }

        season.rewardRate = season.rewardRate + (amount / (remainingTime));

        emit RewardAdded(seasonNum, amount);
    }

    function stake(
        address meToken,
        uint256 amount,
        uint256 index,
        bytes32[] calldata merkleProof
    ) public nonReentrant {
        require(amount > 0, "RewardsPool: cannot stake zero");

        address sender = LibMeta.msgSender();

        refreshPool(meToken, index, merkleProof);

        updateReward(meToken, sender);
        IERC20(meToken).safeTransferFrom(sender, address(this), amount);

        balances[meToken][sender] += amount;
        _refreshSupplyStats(meToken, amount, true);

        emit Staked(meToken, sender, amount);
    }

    function updateReward(address meToken, address account)
        public
        nonReentrant
    {
        _updateAccrual(meToken);
        MeTokenPool storage meTokenPool = meTokenPools[meToken];
        if (account != address(0)) {
            meTokenPool.rewards[account] = earned(meToken, account);
            meTokenPool.userRewardPerTokenPaid[account] = meTokenPool
                .rewardPerTokenStored;
        }
    }

    function withdraw(
        address meToken,
        uint256 amount,
        uint256 index,
        bytes32[] calldata merkleProof
    ) public nonReentrant {
        require(amount > 0, "RewardsPool: cannot withdraw zero");

        address sender = LibMeta.msgSender();

        // TODO: do we need to check if meToken in season num?

        updateReward(meToken, sender);

        balances[meToken][sender] -= amount;
        _refreshSupplyStats(meToken, amount, false);

        IERC20(meToken).safeTransfer(sender, amount);

        emit Withdrawn(meToken, sender, amount);
    }

    function _updateAccrual(address meToken) private {
        MeTokenPool storage meTokenPool = meTokenPools[meToken];
        meTokenPool.rewardPerTokenStored = rewardPerToken(meToken);
        meTokenPool.lastUpdateTime = lastTimeRewardApplicable(meToken);
    }

    /// @notice refreshes & resets meToken pool if featured in a new season
    function refreshPool(
        address meToken,
        uint256 index,
        bytes32[] calldata merkleProof
    ) public {
        MeTokenPool storage meTokenPool = meTokenPools[meToken];

        if (
            meTokenPool.seasonNum == seasonNum ||
            !canTokenBeFeaturedInNewSeason(meToken)
        ) {
            // Refresh not needed :)
            return;
        }

        uint256 soonestSeason = meTokenPool.seasonNum == 0
            ? 1
            : meTokenPool.seasonNum + issuerCooldown;

        for (uint256 i = soonestSeason; i <= seasonNum; i++) {
            if (isMeTokenInSeason(i, meToken, index, merkleProof)) {
                Season storage season = seasons[i];
                uint256 pendingIssuerRewards = meTokenPool.pendingIssuerRewards;
                uint256 totalSupply = meTokenPool.totalSupply;

                // Check if meToken was featured in a previous season, as we'll need
                // to update pendingIssuerRewards and totalPctStaked
                if (soonestSeason > 1) {
                    Season memory oldSeason = seasons[meTokenPool.seasonNum];

                    uint256 pctStaked = (BASE * meTokenPool.totalSupply) /
                        meTokenPool.lastCirculatingSupply;
                    uint256 pctOfTotalStaked = (PRECISION * pctStaked) /
                        season.totalPctStaked;
                    uint256 newIssuerRewards = (pctOfTotalStaked *
                        oldSeason.allocationIssuer) / PRECISION;

                    pendingIssuerRewards += newIssuerRewards;
                    season.totalPctStaked += pctStaked;

                    // Refund sender since pool has already built up mapped data
                    delete meTokenPools[meToken];
                }

                MeTokenPool storage newMeTokenPool = meTokenPools[meToken];
                newMeTokenPool.seasonNum = i;
                newMeTokenPool.pendingIssuerRewards = pendingIssuerRewards;
                newMeTokenPool.totalSupply = totalSupply;
            }
        }
    }

    /// @dev updates meTokenPool.lastCirculatingSupply & totalSupply, and season.totalPctStaked
    function _refreshSupplyStats(
        address meToken,
        uint256 amount,
        bool add
    ) private {
        MeTokenPool storage meTokenPool = meTokenPools[meToken];
        Season storage season = seasons[meTokenPool.seasonNum];

        uint256 circulatingSupply = IERC20(meToken).totalSupply();
        uint256 oldPctStaked = (BASE * meTokenPool.totalSupply) /
            meTokenPool.lastCirculatingSupply;
        uint256 newPctStaked;

        if (add) {
            newPctStaked =
                (BASE * (meTokenPool.totalSupply + amount)) /
                circulatingSupply;
            meTokenPool.totalSupply += amount;
        } else {
            newPctStaked =
                (BASE * (meTokenPool.totalSupply - amount)) /
                circulatingSupply;
            meTokenPool.totalSupply -= amount;
        }

        if (circulatingSupply != meTokenPool.lastCirculatingSupply) {
            meTokenPool.lastCirculatingSupply = circulatingSupply;
        }
        // Only update totalPctStaked if it's a new season
        // TODO: could modifying totalSupply / lastCirculatingSupply have an effect
        // when someone tries to claim rewards from a meToken that isn't in a live season?
        if (meTokenPool.seasonNum == seasonNum) {
            season.totalPctStaked =
                season.totalPctStaked -
                oldPctStaked +
                newPctStaked;
        }
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
        require(token != me, "Cannot withdraw the staking token");
        MeTokenInfo memory meTokenInfo = s.meTokens[address(token)];
        require(meTokenInfo.hubId == 0, "Cannot withdraw a meToken");
        token.safeTransfer(recipient, amount);
        emit Recovered(token, amount);
    }
}
