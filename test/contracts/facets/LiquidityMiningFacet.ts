import { ethers, getNamedAccounts, network } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Signer, BigNumber, ContractTransaction } from "ethers";
import { expect } from "chai";
import { getContractAt } from "../../utils/helpers";
import { mineBlock, setNextBlockTimestamp } from "../../utils/hardhatNode";
import { hubSetup } from "../../utils/hubSetup";
import {
  FoundryFacet,
  MeTokenRegistryFacet,
  MeToken,
  ERC20,
  SingleAssetVault,
  LiquidityMiningFacet,
  MockERC20,
} from "../../../artifacts/types";
import { MerkleTree } from "../../utils/merkleTree";

const setup = async () => {
  describe("LiquidityMiningFacet.sol", () => {
    let DAI: string;
    let dai: ERC20;
    let WETH: string;
    let weth: ERC20;
    let account0: SignerWithAddress;
    let account1: SignerWithAddress;
    let account2: SignerWithAddress;
    let account3: SignerWithAddress;
    let account4: SignerWithAddress;
    let meTokenRegistry: MeTokenRegistryFacet;
    let foundry: FoundryFacet;
    let token: ERC20;
    let meToken: MeToken;
    let meToken1: MeToken;
    let meToken2: MeToken;
    let meToken3: MeToken;
    let meToken4: MeToken;
    let whale: Signer;
    let liquidityMining: LiquidityMiningFacet;
    let singleAssetVault: SingleAssetVault;
    let encodedCurveInfo: string;
    let encodedVaultArgs: string;
    let mockToken: MockERC20;
    let merkleTree: MerkleTree;
    const max = ethers.constants.MaxUint256;
    const hubId = 1;
    const name = "Carl meToken";
    const symbol = "CARL";
    const initRefundRatio = 50000;
    const PRECISION = ethers.utils.parseEther("1");
    const amount1 = ethers.utils.parseEther("100");
    const tokenDepositedInETH = 100;
    const tokenDeposited = ethers.utils.parseEther(
      tokenDepositedInETH.toString()
    );

    const oneDayInSeconds = 60 * 60 * 24;
    const duration = oneDayInSeconds * 20; // 20 days in seconds

    const allocationForOneMetoken = ethers.utils.parseEther("10");
    let whitelist = [];
    const allocationForOneMetokenSeason2 = ethers.utils.parseEther("100");

    let snapshotId: any;
    before(async () => {
      snapshotId = await network.provider.send("evm_snapshot");
    });
    describe("first season", () => {
      before(async () => {
        const MAX_WEIGHT = 1000000;
        const reserveWeight = MAX_WEIGHT / 2;
        const baseY = PRECISION.div(1000);
        ({ DAI, WETH } = await getNamedAccounts());
        encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
          ["address"],
          [DAI]
        );
        encodedCurveInfo = ethers.utils.defaultAbiCoder.encode(
          ["uint256", "uint32"],
          [baseY, reserveWeight]
        );
        ({
          token,
          whale,
          liquidityMining,
          foundry,
          singleAssetVault,
          meTokenRegistry,
          account0,
          account1,
          account2,
          account3,
          account4,
          mockToken,
        } = await hubSetup(
          baseY,
          reserveWeight,
          encodedVaultArgs,
          initRefundRatio
        ));

        // Prefund owner/buyer w/ DAI
        dai = token;
        weth = await getContractAt<ERC20>("ERC20", WETH);

        await dai.connect(whale).transfer(account0.address, amount1.mul(10));
        await weth.connect(whale).transfer(account0.address, amount1.mul(10));
        await dai.connect(whale).transfer(account1.address, amount1.mul(10));
        await dai.connect(whale).transfer(account2.address, amount1.mul(10));
        await dai.connect(whale).transfer(account3.address, amount1.mul(10));
        await dai.connect(whale).transfer(account4.address, amount1.mul(10));
        const max = ethers.constants.MaxUint256;
        await dai.connect(account0).approve(singleAssetVault.address, max);
        await weth.connect(account0).approve(singleAssetVault.address, max);
        await dai.connect(account1).approve(singleAssetVault.address, max);
        await dai.connect(account2).approve(singleAssetVault.address, max);
        await dai.connect(account3).approve(singleAssetVault.address, max);
        await dai.connect(account4).approve(singleAssetVault.address, max);
        await dai.connect(account0).approve(meTokenRegistry.address, max);
        await dai.connect(account1).approve(meTokenRegistry.address, max);
        await dai.connect(account2).approve(meTokenRegistry.address, max);
        await dai.connect(account3).approve(meTokenRegistry.address, max);
        await dai.connect(account4).approve(meTokenRegistry.address, max);
        // account0 is registering a metoken
        await meTokenRegistry
          .connect(account0)
          .subscribe(name, symbol, hubId, tokenDeposited);
        const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
          account0.address
        );

        meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);
        await foundry.mint(meToken.address, tokenDeposited, account1.address);
        // account2 is registering another metoken
        await meTokenRegistry
          .connect(account2)
          .subscribe(`${name}-2`, `${symbol}2`, hubId, tokenDeposited);
        const meTokenAddr2 = await meTokenRegistry.getOwnerMeToken(
          account2.address
        );
        meToken2 = await getContractAt<MeToken>("MeToken", meTokenAddr2);
        await foundry
          .connect(account2)
          .mint(meToken2.address, tokenDeposited, account2.address);

        // account3 is registering another metoken
        await meTokenRegistry
          .connect(account3)
          .subscribe(`${name}-3`, `${symbol}3`, hubId, tokenDeposited);
        const meTokenAddr3 = await meTokenRegistry.getOwnerMeToken(
          account3.address
        );
        meToken3 = await getContractAt<MeToken>("MeToken", meTokenAddr3);
        await foundry
          .connect(account3)
          .mint(meToken3.address, tokenDeposited, account3.address);

        // account4 is registering another metoken
        await meTokenRegistry
          .connect(account4)
          .subscribe(`${name}-4`, `${symbol}4`, hubId, tokenDeposited);
        const meTokenAddr4 = await meTokenRegistry.getOwnerMeToken(
          account4.address
        );
        meToken4 = await getContractAt<MeToken>("MeToken", meTokenAddr4);
        await foundry
          .connect(account4)
          .mint(meToken4.address, tokenDeposited, account4.address);

        // meToken approvals
        await meToken.approve(liquidityMining.address, max);
        await meToken2.approve(liquidityMining.address, max);
        await meToken2.connect(account2).approve(liquidityMining.address, max);
        await meToken2.connect(account3).approve(liquidityMining.address, max);
        await meToken3.connect(account3).approve(liquidityMining.address, max);
        await meToken4.connect(account4).approve(liquidityMining.address, max);
        await meToken2.connect(account3).approve(liquidityMining.address, max);

        await mockToken.approve(liquidityMining.address, max);
        // second metokens will be used to check that we can claim rewards during season 2 if I am not featured in season 2
        // third metoken will be used to check that rewards form season 1 are lost if we claim rewards during season 2 when I am featured in season 2
        whitelist = [
          meToken.address,
          meToken2.address,
          meToken3.address,
          meToken4.address,
        ];
        merkleTree = new MerkleTree(whitelist);
        await mockToken.setBalance(
          account0.address,
          allocationForOneMetoken.mul(whitelist.length)
        );
      });

      describe("Initial States", () => {
        it("State check", async () => {
          const poolInfo = await liquidityMining.getPoolInfo(
            meToken.address,
            ethers.constants.AddressZero
          );
          const seasonInfo = await liquidityMining.getSeasonInfo();

          expect(poolInfo.seasonMerkleRoot).to.equal(ethers.constants.HashZero);
          expect(poolInfo.lastUpdateTime).to.equal(0);
          expect(poolInfo.totalSupply).to.equal(0);
          expect(poolInfo.rewardPerTokenStored).to.equal(0);
          expect(seasonInfo.startTime).to.equal(0);
          expect(seasonInfo.endTime).to.equal(0);
          expect(seasonInfo.allocationPool).to.equal(0);
          expect(seasonInfo.rewardRate).to.equal(0);
          expect(seasonInfo.merkleRoot).to.equal(ethers.constants.HashZero);
        });
      });

      describe("setLMDuration()", () => {
        it("revert when sender is not durationController", async () => {
          await expect(
            liquidityMining.connect(account1).setLMDuration(duration)
          ).to.revertedWith("!durationsController");
        });
        it("revert when setting same value", async () => {
          await expect(liquidityMining.setLMDuration(0)).to.revertedWith(
            "same lmDuration"
          );
        });
        it("should set lmwDuration", async () => {
          await liquidityMining.setLMDuration(duration);
          expect(await liquidityMining.getLMDuration()).to.equal(duration);
        });
      });

      describe("initSeason()", () => {
        it("revert when sender is not liquidityMiningController", async () => {
          const initTime =
            (await ethers.provider.getBlock("latest")).timestamp + 10;
          await expect(
            liquidityMining
              .connect(account1)
              .initSeason(initTime, 0, 0, ethers.constants.HashZero)
          ).to.be.revertedWith("!liquidityMiningController");
        });
        it("revert when allocation or metoken count is zero", async () => {
          const initTime =
            (await ethers.provider.getBlock("latest")).timestamp + 100;
          await expect(
            liquidityMining.initSeason(
              initTime,
              0,
              1,
              ethers.constants.HashZero
            )
          ).to.be.revertedWith("allocationPool=0");
          await expect(
            liquidityMining.initSeason(
              initTime,
              1,
              0,
              ethers.constants.HashZero
            )
          ).to.be.revertedWith("meTokenCount=0");
        });
        it("revert when season initialization time is less than block timestamp", async () => {
          const initTime =
            (await ethers.provider.getBlock("latest")).timestamp - 10;
          await expect(
            liquidityMining.initSeason(
              initTime,
              1,
              1,
              ethers.constants.HashZero
            )
          ).to.be.revertedWith("init time < timestamp");
        });
        it("should be able to initSeason", async () => {
          const initTime =
            (await ethers.provider.getBlock("latest")).timestamp + 10;
          const bSenderBalance = await mockToken.balanceOf(account0.address);
          const bLMBalance = await mockToken.balanceOf(liquidityMining.address);
          const merkleRoot = merkleTree.getHexRoot();
          const allocationPool = allocationForOneMetoken.mul(whitelist.length);
          await liquidityMining.initSeason(
            initTime,
            allocationPool,
            whitelist.length,
            merkleRoot
          );

          const aSenderBalance = await mockToken.balanceOf(account0.address);
          const aLMBalance = await mockToken.balanceOf(liquidityMining.address);
          const seasonInfo = await liquidityMining.getSeasonInfo();

          expect(bSenderBalance.sub(aSenderBalance))
            .to.equal(allocationPool)
            .to.equal(aLMBalance.sub(bLMBalance));

          expect(seasonInfo.startTime.toNumber()).to.equal(initTime);
          expect(seasonInfo.endTime.toNumber()).to.equal(initTime + duration);
          expect(seasonInfo.allocationPool).to.equal(allocationPool);
          expect(seasonInfo.rewardRate).to.equal(
            allocationForOneMetoken.div(duration)
          );
          expect(seasonInfo.merkleRoot).to.equal(merkleRoot);
        });
      });

      describe("isMeTokenInSeason()", () => {
        it("should return false if a metoken is not present in a season", async () => {
          expect(
            await liquidityMining.isMeTokenInSeason(
              account0.address, // wrong token address
              merkleTree.getHexProof(meToken.address)
            )
          ).to.equal(false);
        });
      });

      describe("stake withdraw claim for one season", () => {
        let tx: ContractTransaction;

        it("revert to stake when season is not live", async () => {
          const isSeasonLive = await liquidityMining.isSeasonLive();
          expect(isSeasonLive).to.be.false;

          await expect(
            liquidityMining.stake(
              meToken.address,
              tokenDeposited.div(2),
              merkleTree.getHexProof(meToken.address)
            )
          ).to.be.revertedWith("not live");
          const seasonInfo = await liquidityMining.getSeasonInfo();
          await setNextBlockTimestamp(seasonInfo.startTime.toNumber());
        });
        it("revert to stake with zero amount", async () => {
          await expect(
            liquidityMining.stake(meToken.address, 0, [
              ethers.constants.HashZero,
            ])
          ).to.be.revertedWith("not in season");
        });
        it("revert to stake with zero amount", async () => {
          await expect(
            liquidityMining.stake(
              meToken.address,
              0,
              merkleTree.getHexProof(meToken.address)
            )
          ).to.be.revertedWith("cannot stake 0");
        });

        it("should be able to stake when season is live", async () => {
          // stake for metoken 2 to check in the next tests that claiming during season 2
          // works and season 1 reward is not lost until I am featured in a new season.
          await liquidityMining
            .connect(account2)
            .stake(
              meToken2.address,
              tokenDeposited,
              merkleTree.getHexProof(meToken2.address)
            );

          // stake for meToken4 to check in next the tests that claiming during season 2
          //  *warmup* works
          await liquidityMining
            .connect(account4)
            .stake(
              meToken4.address,
              tokenDeposited,
              merkleTree.getHexProof(meToken4.address)
            );

          // stake for metoken 3 to check in the next tests that claiming during season 2
          // works but erase rewards from season 1 as it is featured in this new season.
          await liquidityMining
            .connect(account3)
            .stake(
              meToken3.address,
              tokenDeposited,
              merkleTree.getHexProof(meToken3.address)
            );

          // Normal stake which we are testing
          tx = await liquidityMining.stake(
            meToken.address,
            tokenDeposited,
            merkleTree.getHexProof(meToken.address)
          );

          await expect(tx)
            .to.emit(meToken, "Transfer")
            .withArgs(
              account0.address,
              liquidityMining.address,
              tokenDeposited
            );
          await expect(tx)
            .to.emit(liquidityMining, "Staked")
            .withArgs(meToken.address, account0.address, tokenDeposited);

          expect(
            await liquidityMining.balanceOf(meToken.address, account0.address)
          ).to.equal(tokenDeposited);
        });
        it("check new pool and season information", async () => {
          const txBlockTime = (
            await ethers.provider.getBlock((await tx.wait()).blockNumber)
          ).timestamp;

          // travel to one day in the future
          await mineBlock(txBlockTime + oneDayInSeconds);

          const poolInfo = await liquidityMining.getPoolInfo(
            meToken.address,
            account0.address
          );
          const seasonInfo = await liquidityMining.getSeasonInfo();

          const merkleRoot = merkleTree.getHexRoot();
          expect(poolInfo.seasonMerkleRoot).to.equal(merkleRoot);

          expect(poolInfo.lastUpdateTime).to.equal(
            (await ethers.provider.getBlock((await tx.wait()).blockNumber))
              .timestamp
          );

          expect(poolInfo.totalSupply).to.equal(tokenDeposited);

          const rewardPerToken = await liquidityMining.rewardPerToken(
            meToken.address
          );

          // only begins at start time and not before
          // reward takes only into account previously deposited token amount so tokenDeposited.div(2)
          const calculatedRewardPerToken = BigNumber.from(oneDayInSeconds)
            .mul(seasonInfo.rewardRate)
            .mul(PRECISION)
            .div(tokenDeposited);
          expect(rewardPerToken).to.equal(calculatedRewardPerToken);
          // poolInfo.userRewardPerTokenPaid[account] is equal to 0 when they've received no rewards
          expect(poolInfo.userRewardPerTokenPaid).to.equal(0);

          //(balance account * (rewardPerToken - userRewardPerTokenPaid) ) + rewards
          const calculatedEarned = tokenDeposited
            .mul(calculatedRewardPerToken)
            .div(PRECISION); // simplified calculation as userRewardPerTokenPaid == 0
          expect(calculatedEarned).to.be.gt(0);
          const earned = await liquidityMining.earned(
            meToken.address,
            account0.address
          );
          expect(earned).to.equal(calculatedEarned);
        });
        it("should be able to claim when season is live", async () => {
          tx = await liquidityMining.claimReward(meToken.address);
          const poolInfo = await liquidityMining.getPoolInfo(
            meToken.address,
            account0.address
          );
          const rewardPaid =
            poolInfo.userRewardPerTokenPaid.mul(tokenDepositedInETH);

          // it should send ME tokens corresponding to the rewards
          await expect(tx)
            .to.emit(mockToken, "Transfer")
            .withArgs(liquidityMining.address, account0.address, rewardPaid);
          await expect(tx)
            .to.emit(liquidityMining, "RewardPaid")
            .withArgs(meToken.address, account0.address, rewardPaid);

          expect(
            await liquidityMining.balanceOf(meToken.address, account0.address)
          ).to.equal(tokenDeposited);

          // reward should now be 0
          const poolInfoAfter = await liquidityMining.getPoolInfo(
            meToken.address,
            account0.address
          );
          expect(poolInfoAfter.rewards).to.equal(0);
        });
        it("should be able to withdraw when season is live", async () => {
          const poolInfo = await liquidityMining.getPoolInfo(
            meToken.address,
            account0.address
          );
          // last tx holds the lastUpdateTime
          // const lastUpdateTime = tx.timestamp ?? 0;
          const lastUpdateTime = poolInfo.lastUpdateTime.toNumber();
          expect(
            (await ethers.provider.getBlock((await tx.wait()).blockNumber))
              .timestamp
          ).to.equal(lastUpdateTime);
          // travel to the futur
          await setNextBlockTimestamp(lastUpdateTime + oneDayInSeconds);

          const balanceStakedBefore = await liquidityMining.balanceOf(
            meToken.address,
            account0.address
          );
          tx = await liquidityMining.withdraw(
            meToken.address,
            tokenDeposited.div(2)
          );
          const txBlockTime = (
            await ethers.provider.getBlock((await tx.wait()).blockNumber)
          ).timestamp;
          expect(txBlockTime).to.equal(lastUpdateTime + oneDayInSeconds);
          const balanceStakedAfter = await liquidityMining.balanceOf(
            meToken.address,
            account0.address
          );
          await expect(tx)
            .to.emit(meToken, "Transfer")
            .withArgs(
              liquidityMining.address,
              account0.address,
              tokenDeposited.div(2)
            );
          await expect(tx)
            .to.emit(liquidityMining, "Withdrawn")
            .withArgs(meToken.address, account0.address, tokenDeposited.div(2));
          const poolInfoAfter = await liquidityMining.getPoolInfo(
            meToken.address,
            account0.address
          );
          //balance staked has been updated
          expect(balanceStakedBefore.sub(balanceStakedAfter)).to.equal(
            tokenDeposited.div(2)
          );
          // reward per token stored has been updated
          // Previous reward per token stored + ((now-lastUpdateTime)  * RewardRate)/ (TotalSupply staked))
          // at that time TotalSupply staked == tokenDeposited because _updateReward is ran before updating totalSupply
          const calculatedRewardPerTokenStored = BigNumber.from(
            txBlockTime - lastUpdateTime
          )
            .mul(poolInfo.rewardRate)
            .mul(PRECISION)
            .div(tokenDeposited)
            .add(poolInfo.rewardPerTokenStored);
          expect(poolInfoAfter.rewardPerTokenStored).to.equal(
            calculatedRewardPerTokenStored
          );

          // poolInfo.userRewardPerTokenPaid[account] is equal to the value of rewardPerTokenStored when account last interacted with LM
          expect(poolInfoAfter.userRewardPerTokenPaid).to.equal(
            calculatedRewardPerTokenStored
          );
        });
        it("should be able to withdraw when season is not live", async () => {
          const seasonInfo = await liquidityMining.getSeasonInfo();
          // move forward to the end of the season
          await setNextBlockTimestamp(
            seasonInfo.endTime.toNumber() + oneDayInSeconds
          );

          const poolInfo = await liquidityMining.getPoolInfo(
            meToken.address,
            account0.address
          );
          const lastUpdateTime = (
            await ethers.provider.getBlock((await tx.wait()).blockNumber)
          ).timestamp;
          expect(lastUpdateTime).to.equal(poolInfo.lastUpdateTime);
          // last withdraw tx holds the lastUpdateTime

          const balanceStakedBefore = await liquidityMining.balanceOf(
            meToken.address,
            account0.address
          );

          // half is still staked
          expect(balanceStakedBefore).to.equal(tokenDeposited.div(2));
          tx = await liquidityMining.withdraw(
            meToken.address,
            tokenDeposited.div(2)
          );
          const txBlockTime = (
            await ethers.provider.getBlock((await tx.wait()).blockNumber)
          ).timestamp;
          expect(txBlockTime).to.equal(
            seasonInfo.endTime.toNumber() + oneDayInSeconds
          );
          expect(txBlockTime).to.be.gt(lastUpdateTime);
          const balanceStakedAfter = await liquidityMining.balanceOf(
            meToken.address,
            account0.address
          );
          // nothing is staked anymore
          expect(balanceStakedAfter).to.equal(0);
          await expect(tx)
            .to.emit(meToken, "Transfer")
            .withArgs(
              liquidityMining.address,
              account0.address,
              tokenDeposited.div(2)
            );
          await expect(tx)
            .to.emit(liquidityMining, "Withdrawn")
            .withArgs(meToken.address, account0.address, tokenDeposited.div(2));
          const poolInfoAfter = await liquidityMining.getPoolInfo(
            meToken.address,
            account0.address
          );
          expect(poolInfoAfter.lastUpdateTime).to.equal(seasonInfo.endTime);
          // reward per token stored has been updated
          // Previous reward per token stored + ((seasonInfo.endTime-lastUpdateTime)  * RewardRate)/ (TotalSupply staked))
          // at that time TotalSupply staked == tokenDeposited.div(2) because it was updated after previous withdraw
          const calculatedRewardPerTokenStored = BigNumber.from(
            seasonInfo.endTime.toNumber() - lastUpdateTime
          )
            .mul(poolInfo.rewardRate)
            .mul(PRECISION)
            .div(tokenDeposited.div(2))
            .add(poolInfo.rewardPerTokenStored);
          expect(poolInfoAfter.rewardPerTokenStored).to.equal(
            calculatedRewardPerTokenStored
          );

          // poolInfo.userRewardPerTokenPaid[account] is equal to the value of rewardPerTokenStored when account last interacted with LM
          expect(poolInfoAfter.userRewardPerTokenPaid).to.equal(
            calculatedRewardPerTokenStored
          );

          // rewards have been updated
          //(balance account * (rewardPerToken - userRewardPerTokenPaid) ) + rewards
          const calculatedEarned = tokenDeposited
            .div(2)
            .mul(
              calculatedRewardPerTokenStored.sub(
                poolInfo.userRewardPerTokenPaid
              )
            )
            .div(PRECISION)
            .add(poolInfo.rewards);
          expect(calculatedEarned).to.be.gt(0);
          expect(poolInfoAfter.rewards).to.equal(calculatedEarned);
        });
        it("should be able to claim when season is not live", async () => {
          const poolInfo = await liquidityMining.getPoolInfo(
            meToken.address,
            account0.address
          );
          tx = await liquidityMining.claimReward(meToken.address);
          const balanceBefore = await mockToken.balanceOf(account0.address);
          // it should send ME tokens corresponding to the rewards
          await expect(tx)
            .to.emit(mockToken, "Transfer")
            .withArgs(
              liquidityMining.address,
              account0.address,
              poolInfo.rewards
            );
          await expect(tx)
            .to.emit(liquidityMining, "RewardPaid")
            .withArgs(meToken.address, account0.address, poolInfo.rewards);

          expect(
            await liquidityMining.balanceOf(meToken.address, account0.address)
          ).to.equal(0);
          const balanceAfter = await mockToken.balanceOf(account0.address);
          // reward should now be 0
          const poolInfoAfter = await liquidityMining.getPoolInfo(
            meToken.address,
            account0.address
          );
          expect(poolInfoAfter.rewards).to.equal(0);
          expect(poolInfoAfter.rewards).to.equal(
            balanceAfter.sub(balanceBefore)
          );
        });
      });
    });
    describe("second season", () => {
      before(async () => {
        // let's send more rewards

        await meTokenRegistry
          .connect(account1)
          .subscribe(`${name}-1`, `${symbol}1`, hubId, tokenDeposited);
        const meTokenAddr1 = await meTokenRegistry.getOwnerMeToken(
          account1.address
        );
        meToken1 = await getContractAt<MeToken>("MeToken", meTokenAddr1);
        await foundry
          .connect(account1)
          .mint(meToken1.address, tokenDeposited, account1.address);
        // metoken2 from account2 and metoken from account0 are not part of season 2
        // metoken3 from account3 is again part of this season
        whitelist = [meToken1.address, meToken3.address, meToken4.address];
        merkleTree = new MerkleTree(whitelist);
        await mockToken.setBalance(
          account0.address,
          allocationForOneMetokenSeason2.mul(whitelist.length)
        );
        // mint more metokens for metoken 1 and 3

        await foundry
          .connect(account3)
          .mint(meToken3.address, tokenDeposited, account3.address);
        // allow liquidity mining contract to move their metokens
        await meToken1.connect(account1).approve(liquidityMining.address, max);
        await meToken3.connect(account3).approve(liquidityMining.address, max);
      });
      describe("stake withdraw claim for second season", () => {
        let tx: ContractTransaction;
        let pendingS1Acc2Rewards: BigNumber;
        let pendingS1Acc3Rewards: BigNumber;
        let seasonRewardRate: BigNumber;
        it("should have pending rewards from previous season", async () => {
          pendingS1Acc2Rewards = await liquidityMining.earned(
            meToken2.address,
            account2.address
          );
          pendingS1Acc3Rewards = await liquidityMining.earned(
            meToken3.address,
            account3.address
          );
          expect(pendingS1Acc2Rewards).to.be.gt(0);
          expect(pendingS1Acc3Rewards).to.be.gt(0);
        });
        it("revert to stake when season is not live", async () => {
          const isSeasonLive = await liquidityMining.isSeasonLive();
          expect(isSeasonLive).to.be.false;

          await expect(
            liquidityMining.stake(
              meToken3.address,
              tokenDeposited.div(2),
              merkleTree.getHexProof(meToken3.address)
            )
          ).to.be.revertedWith("not live");
        });
        it("should be able to initSeason", async () => {
          const initTime =
            (await ethers.provider.getBlock("latest")).timestamp + 10;
          const bSenderBalance = await mockToken.balanceOf(account0.address);
          const bLMBalance = await mockToken.balanceOf(liquidityMining.address);
          const merkleRoot = merkleTree.getHexRoot();
          const allocationPoolSeason2 = allocationForOneMetokenSeason2.mul(
            whitelist.length
          );
          await liquidityMining.initSeason(
            initTime,
            allocationPoolSeason2,
            whitelist.length, // two metokens featured in this season
            merkleRoot
          );

          const aSenderBalance = await mockToken.balanceOf(account0.address);
          const aLMBalance = await mockToken.balanceOf(liquidityMining.address);
          const seasonInfo = await liquidityMining.getSeasonInfo();

          expect(bSenderBalance.sub(aSenderBalance))
            .to.equal(allocationPoolSeason2)
            .to.equal(aLMBalance.sub(bLMBalance));

          expect(seasonInfo.startTime.toNumber()).to.equal(initTime);
          expect(seasonInfo.endTime.toNumber()).to.equal(initTime + duration);
          expect(seasonInfo.allocationPool).to.equal(allocationPoolSeason2);
          expect(seasonInfo.rewardRate).to.equal(
            allocationForOneMetokenSeason2.div(duration)
          );
          seasonRewardRate = seasonInfo.rewardRate;
          expect(seasonInfo.merkleRoot).to.equal(merkleRoot);
        });
        it("should be able to withdraw featured meToken before season is live", async () => {
          // Check that season has not started and meToken is in season
          expect(
            await liquidityMining.isMeTokenInSeason(
              meToken4.address,
              merkleTree.getHexProof(meToken4.address)
            )
          ).to.equal(true);

          const poolInfoBefore = await liquidityMining.getPoolInfo(
            meToken4.address,
            account4.address
          );

          tx = await liquidityMining
            .connect(account4)
            .withdraw(meToken4.address, tokenDeposited);

          const txBlockTime = (
            await ethers.provider.getBlock((await tx.wait()).blockNumber)
          ).timestamp;
          const { startTime } = await liquidityMining.getSeasonInfo();
          expect(txBlockTime).to.be.lt(startTime);

          expect(tx)
            .to.emit(meToken4, "Transfer")
            .withArgs(
              liquidityMining.address,
              account4.address,
              tokenDeposited
            );

          const poolInfoAfter = await liquidityMining.getPoolInfo(
            meToken4.address,
            account4.address
          );
          // Ensure poolInfo still shows state from season 1
          expect(poolInfoBefore.endTime).to.equal(poolInfoAfter.lastUpdateTime);
        });

        it("revert to stake when not part of the season", async () => {
          const seasonInfo = await liquidityMining.getSeasonInfo();
          await setNextBlockTimestamp(seasonInfo.startTime.toNumber());
          await expect(
            liquidityMining.stake(
              meToken.address,
              tokenDeposited.div(2),
              merkleTree.getHexProof(meToken3.address)
            )
          ).to.be.revertedWith("not in season");

          await expect(
            liquidityMining.stake(
              meToken2.address,
              tokenDeposited.div(2),
              merkleTree.getHexProof(meToken1.address)
            )
          ).to.be.revertedWith("not in season");
        });
        it("should be able to stake when season is live", async () => {
          tx = await liquidityMining
            .connect(account1)
            .stake(
              meToken1.address,
              tokenDeposited,
              merkleTree.getHexProof(meToken1.address)
            );
          await expect(tx)
            .to.emit(meToken1, "Transfer")
            .withArgs(
              account1.address,
              liquidityMining.address,
              tokenDeposited
            );
          await expect(tx)
            .to.emit(liquidityMining, "Staked")
            .withArgs(meToken1.address, account1.address, tokenDeposited);

          expect(
            await liquidityMining.balanceOf(meToken1.address, account1.address)
          ).to.equal(tokenDeposited);
        });
        it("check new pool and season information", async () => {
          const txBlockTime = (
            await ethers.provider.getBlock((await tx.wait()).blockNumber)
          ).timestamp;
          // travel to one day in the futur
          await mineBlock(txBlockTime + oneDayInSeconds);

          const previousPoolInfo = await liquidityMining.getPoolInfo(
            meToken.address,
            account0.address
          );
          const poolInfo = await liquidityMining.getPoolInfo(
            meToken1.address,
            account1.address
          );

          const seasonInfo = await liquidityMining.getSeasonInfo();

          const merkleRoot = merkleTree.getHexRoot();
          expect(previousPoolInfo.seasonMerkleRoot).not.to.equal(merkleRoot);
          expect(poolInfo.seasonMerkleRoot).to.equal(merkleRoot);
          expect(poolInfo.lastUpdateTime).to.equal(
            (await ethers.provider.getBlock((await tx.wait()).blockNumber))
              .timestamp
          );

          expect(poolInfo.totalSupply).to.equal(tokenDeposited);
          // only begins at start time and not before
          // reward takes only into account previously deposited token amount so tokenDeposited.div(2)
          const calculatedRewardPerTokenStored = BigNumber.from(oneDayInSeconds)
            .mul(seasonRewardRate)
            .mul(PRECISION)
            .div(tokenDeposited);
          const instantRewardPerToken = await liquidityMining.rewardPerToken(
            meToken1.address
          );
          expect(instantRewardPerToken).to.equal(
            calculatedRewardPerTokenStored
          );
          // this is zero because when we stake for the first time the total supply staked at that time was 0
          expect(poolInfo.rewardPerTokenStored).to.equal(0);
          // poolInfo.userRewardPerTokenPaid[account] is equal to the value of rewardPerTokenStored when account last interacted with LM
          expect(poolInfo.userRewardPerTokenPaid).to.equal(0);
          expect(poolInfo.rewards).to.equal(0);
          //(balance account * (rewardPerToken - userRewardPerTokenPaid) ) + rewards
          const calculatedEarned = tokenDeposited
            .mul(calculatedRewardPerTokenStored)
            .div(PRECISION); // simplified calculation as userRewardPerTokenPaid == 0
          expect(calculatedEarned).to.be.gt(0);

          expect(
            await liquidityMining.earned(meToken1.address, account1.address)
          ).to.equal(calculatedEarned);
        });

        it("should be able to claim rewards from season 1 if no one has staked yet", async () => {
          tx = await liquidityMining
            .connect(account2)
            .claimReward(meToken2.address);
          // it should send ME tokens corresponding to the rewards
          await expect(tx)
            .to.emit(mockToken, "Transfer")
            .withArgs(
              liquidityMining.address,
              account2.address,
              pendingS1Acc2Rewards
            );
          await expect(tx)
            .to.emit(liquidityMining, "RewardPaid")
            .withArgs(meToken2.address, account2.address, pendingS1Acc2Rewards);

          // reward should now be 0
          const poolInfoAfter = await liquidityMining.getPoolInfo(
            meToken2.address,
            account2.address
          );
          expect(poolInfoAfter.rewards).to.equal(0);
        });
        it("should be able to stake with season 1 metoken when season 2 is live", async () => {
          const balanceBefore = await liquidityMining.balanceOf(
            meToken3.address,
            account3.address
          );

          // staked from season 1 and rewards are not claimed
          expect(balanceBefore).to.be.gt(0);
          const rewardsFromS1 = await liquidityMining.earned(
            meToken3.address,
            account3.address
          );
          expect(rewardsFromS1).to.be.gt(0);
          tx = await liquidityMining
            .connect(account3)
            .stake(
              meToken3.address,
              tokenDeposited,
              merkleTree.getHexProof(meToken3.address)
            );

          await expect(tx)
            .to.emit(meToken3, "Transfer")
            .withArgs(
              account3.address,
              liquidityMining.address,
              tokenDeposited
            );
          await expect(tx)
            .to.emit(liquidityMining, "Staked")
            .withArgs(meToken3.address, account3.address, tokenDeposited);
          const balanceAfter = await liquidityMining.balanceOf(
            meToken3.address,
            account3.address
          );
          expect(balanceAfter.sub(balanceBefore)).to.equal(tokenDeposited);
        });
        it("shouldn't be able to claim rewards from season 1 if featured in season 2 ", async () => {
          const poolInfo = await liquidityMining.getPoolInfo(
            meToken3.address,
            account3.address
          );
          const txBlockTime = (
            await ethers.provider.getBlock((await tx.wait()).blockNumber)
          ).timestamp;
          const seasonInfo = await liquidityMining.getSeasonInfo();
          // rewards from season1 are wiped
          // but as the user was already staked when season2 begun he is entitled to some rewards
          const calculatedInitialRewardPerTokenStored = BigNumber.from(
            txBlockTime - seasonInfo.startTime.toNumber()
          )
            .mul(poolInfo.rewardRate)
            .mul(PRECISION)
            .div(tokenDeposited);
          expect(poolInfo.rewardPerTokenStored).to.equal(
            calculatedInitialRewardPerTokenStored
          );
          expect(poolInfo.userRewardPerTokenPaid).to.equal(
            calculatedInitialRewardPerTokenStored
          );
          const balanceDeposited = await liquidityMining.balanceOf(
            meToken3.address,
            account3.address
          );
          expect(balanceDeposited).to.equal(tokenDeposited.mul(2));
          //(balance account * (rewardPerToken - userRewardPerTokenPaid) ) + rewards
          const calculatedInitialEarned = tokenDeposited
            .mul(calculatedInitialRewardPerTokenStored)
            .div(PRECISION); // simplified calculation as userRewardPerTokenPaid == 0
          expect(poolInfo.rewards).to.equal(calculatedInitialEarned);
          // move forward only 10 seconds
          await setNextBlockTimestamp(txBlockTime + 10);

          // Previous reward per token stored + ((now-lastUpdateTime)  * RewardRate)/ (TotalSupply staked))
          // at that time TotalSupply staked == tokenDeposited
          const calculatedRewardPerTokenStored = BigNumber.from(10)
            .mul(poolInfo.rewardRate)
            .mul(PRECISION)
            .div(balanceDeposited)
            .add(poolInfo.rewardPerTokenStored);
          //(balance account * (rewardPerToken - userRewardPerTokenPaid) ) + rewards
          const calculatedEarned = balanceDeposited
            .mul(
              calculatedRewardPerTokenStored.sub(
                poolInfo.userRewardPerTokenPaid
              )
            )
            .div(PRECISION)
            .add(calculatedInitialEarned);

          // rewards should be less than rewards for whole season1
          expect(calculatedEarned).to.lt(pendingS1Acc3Rewards);
          // rewards should not take into account previous season rewards
          // it should reflect rewards accrued this season
          tx = await liquidityMining
            .connect(account3)
            .claimReward(meToken3.address);
          // it should send ME tokens corresponding to the rewards
          await expect(tx)
            .to.emit(mockToken, "Transfer")
            .withArgs(
              liquidityMining.address,
              account3.address,
              calculatedEarned
            );
          await expect(tx)
            .to.emit(liquidityMining, "RewardPaid")
            .withArgs(meToken3.address, account3.address, calculatedEarned);

          // reward should now be 0
          const poolInfoAfter = await liquidityMining.getPoolInfo(
            meToken3.address,
            account3.address
          );

          expect(poolInfoAfter.rewards).to.equal(0);

          // poolInfo.userRewardPerTokenPaid[account] is equal to the value of rewardPerTokenStored when account last interacted with LM
          expect(poolInfoAfter.userRewardPerTokenPaid).to.equal(
            calculatedRewardPerTokenStored
          );

          expect(poolInfoAfter.rewardPerTokenStored).to.equal(
            calculatedRewardPerTokenStored
          );
          expect(poolInfoAfter.lastUpdateTime).to.equal(txBlockTime + 10);
        });
        it("should be able to claim when season is live", async () => {
          const poolInfo = await liquidityMining.getPoolInfo(
            meToken1.address,
            account1.address
          );
          const curTime = (await ethers.provider.getBlock("latest")).timestamp;
          // add 1 second to take into account next block timestamp
          const calculatedRewardPerTokenStored = BigNumber.from(
            curTime + 1 - poolInfo.lastUpdateTime.toNumber()
          )
            .mul(seasonRewardRate)
            .mul(PRECISION)
            .div(tokenDeposited);

          // this is zero because when we stake for the first time the total supply staked at that time was 0
          expect(poolInfo.rewardPerTokenStored).to.equal(0);
          // poolInfo.userRewardPerTokenPaid[account] is equal to the value of rewardPerTokenStored when account last interacted with LM
          expect(poolInfo.userRewardPerTokenPaid).to.equal(0);
          expect(poolInfo.rewards).to.equal(0);
          //(balance account * (rewardPerToken - userRewardPerTokenPaid) ) + rewards
          const calculatedEarned = tokenDeposited
            .mul(calculatedRewardPerTokenStored)
            .div(PRECISION); // simplified calculation as userRewardPerTokenPaid == 0
          expect(calculatedEarned).to.be.gt(0);
          tx = await liquidityMining
            .connect(account1)
            .claimReward(meToken1.address);

          // it should send ME tokens corresponding to the rewards
          await expect(tx)
            .to.emit(mockToken, "Transfer")
            .withArgs(
              liquidityMining.address,
              account1.address,
              calculatedEarned
            );
          await expect(tx)
            .to.emit(liquidityMining, "RewardPaid")
            .withArgs(meToken1.address, account1.address, calculatedEarned);

          expect(
            await liquidityMining.balanceOf(meToken1.address, account1.address)
          ).to.equal(tokenDeposited);

          // reward should now be 0
          const poolInfoAfter = await liquidityMining.getPoolInfo(
            meToken1.address,
            account1.address
          );
          expect(poolInfoAfter.rewards).to.equal(0);
          expect(poolInfoAfter.rewardPerTokenStored).to.equal(
            calculatedRewardPerTokenStored
          );
          expect(poolInfoAfter.userRewardPerTokenPaid).to.equal(
            calculatedRewardPerTokenStored
          );
          expect(poolInfoAfter.lastUpdateTime).to.equal(curTime + 1);
        });
        it("should be able to withdraw when season is live", async () => {
          const poolInfo = await liquidityMining.getPoolInfo(
            meToken3.address,
            account3.address
          );
          // last tx holds the lastUpdateTime
          const lastUpdateTime = poolInfo.lastUpdateTime.toNumber();
          // move one day forward
          await setNextBlockTimestamp(lastUpdateTime + oneDayInSeconds);

          const balanceStakedBefore = await liquidityMining.balanceOf(
            meToken3.address,
            account3.address
          );
          tx = await liquidityMining
            .connect(account3)
            .withdraw(meToken3.address, tokenDeposited.div(2));
          const txBlockTime = (
            await ethers.provider.getBlock((await tx.wait()).blockNumber)
          ).timestamp;
          expect(txBlockTime).to.equal(lastUpdateTime + oneDayInSeconds);
          const balanceStakedAfter = await liquidityMining.balanceOf(
            meToken3.address,
            account3.address
          );
          //balance staked has been updated
          expect(balanceStakedBefore.sub(balanceStakedAfter)).to.equal(
            tokenDeposited.div(2)
          );
          expect(balanceStakedAfter).to.equal(
            tokenDeposited.mul(2).sub(tokenDeposited.div(2))
          );
          await expect(tx)
            .to.emit(meToken3, "Transfer")
            .withArgs(
              liquidityMining.address,
              account3.address,
              tokenDeposited.div(2)
            );
          await expect(tx)
            .to.emit(liquidityMining, "Withdrawn")
            .withArgs(
              meToken3.address,
              account3.address,
              tokenDeposited.div(2)
            );
          const poolInfoAfter = await liquidityMining.getPoolInfo(
            meToken3.address,
            account3.address
          );

          // reward per token stored has been updated
          // Previous reward per token stored + ((now-lastUpdateTime)  * RewardRate)/ (TotalSupply staked))
          // at that time TotalSupply staked == tokenDeposited because _updateReward is ran before updating totalSupply
          const calculatedRewardPerTokenStored = BigNumber.from(oneDayInSeconds)
            .mul(poolInfo.rewardRate)
            .mul(PRECISION)
            .div(tokenDeposited.mul(2))
            .add(poolInfo.rewardPerTokenStored);

          expect(
            await liquidityMining.rewardPerToken(meToken3.address)
          ).to.equal(calculatedRewardPerTokenStored);

          expect(poolInfoAfter.rewardPerTokenStored).to.equal(
            calculatedRewardPerTokenStored
          );

          // poolInfo.userRewardPerTokenPaid[account] is equal to the value of rewardPerTokenStored when account last interacted with LM
          expect(poolInfoAfter.userRewardPerTokenPaid).to.equal(
            calculatedRewardPerTokenStored
          );
          expect(poolInfoAfter.lastUpdateTime).to.equal(txBlockTime);
        });
        it("should be able to withdraw when season is not live", async () => {
          const seasonInfo = await liquidityMining.getSeasonInfo();
          // move forward to the end of the season
          await setNextBlockTimestamp(
            seasonInfo.endTime.toNumber() + oneDayInSeconds
          );

          const poolInfo = await liquidityMining.getPoolInfo(
            meToken3.address,
            account3.address
          );
          // last withdraw tx holds the lastUpdateTime
          const lastUpdateTime = poolInfo.lastUpdateTime.toNumber();
          const balanceStakedBefore = await liquidityMining.balanceOf(
            meToken3.address,
            account3.address
          );

          // half is still staked
          expect(balanceStakedBefore).to.equal(
            tokenDeposited.mul(2).sub(tokenDeposited.div(2))
          );
          tx = await liquidityMining
            .connect(account3)
            .withdraw(meToken3.address, balanceStakedBefore);
          const txBlockTime = (
            await ethers.provider.getBlock((await tx.wait()).blockNumber)
          ).timestamp;
          expect(txBlockTime).to.equal(
            seasonInfo.endTime.toNumber() + oneDayInSeconds
          );
          const balanceStakedAfter = await liquidityMining.balanceOf(
            meToken3.address,
            account3.address
          );
          // nothing is staked anymore
          expect(balanceStakedAfter).to.equal(0);
          await expect(tx)
            .to.emit(meToken3, "Transfer")
            .withArgs(
              liquidityMining.address,
              account3.address,
              balanceStakedBefore
            );
          await expect(tx)
            .to.emit(liquidityMining, "Withdrawn")
            .withArgs(meToken3.address, account3.address, balanceStakedBefore);
          const poolInfoAfter = await liquidityMining.getPoolInfo(
            meToken3.address,
            account3.address
          );

          // reward per token stored has been updated
          // Previous reward per token stored + ((now-lastUpdateTime)  * RewardRate)/ (TotalSupply staked))
          // at that time TotalSupply staked == tokenDeposited.div(2) because it was updated after previous withdraw
          const calculatedRewardPerTokenStored = BigNumber.from(
            seasonInfo.endTime.toNumber() - lastUpdateTime
          )
            .mul(poolInfo.rewardRate)
            .mul(PRECISION)
            .div(balanceStakedBefore)
            .add(poolInfo.rewardPerTokenStored);
          expect(poolInfoAfter.rewardPerTokenStored).to.equal(
            calculatedRewardPerTokenStored
          );

          // poolInfo.userRewardPerTokenPaid[account] is equal to the value of rewardPerTokenStored when account last interacted with LM
          expect(poolInfoAfter.userRewardPerTokenPaid).to.equal(
            calculatedRewardPerTokenStored
          );

          // rewards have been updated
          //(balance account * (rewardPerToken - userRewardPerTokenPaid) ) + rewards
          const calculatedEarned = balanceStakedBefore
            .mul(
              calculatedRewardPerTokenStored.sub(
                poolInfo.userRewardPerTokenPaid
              )
            )
            .div(PRECISION)
            .add(poolInfo.rewards);

          expect(calculatedEarned).to.be.gt(0);
          expect(poolInfoAfter.rewards).to.equal(calculatedEarned);
        });
        it("should not accrue rewards after full withdrawal", async () => {
          const poolInfoBefore = await liquidityMining.getPoolInfo(
            meToken3.address,
            account3.address
          );

          const txBlockTime = (
            await ethers.provider.getBlock((await tx.wait()).blockNumber)
          ).timestamp;
          await mineBlock(txBlockTime + oneDayInSeconds);
          const poolInfoAfter = await liquidityMining.getPoolInfo(
            meToken3.address,
            account3.address
          );
          expect(poolInfoBefore.rewards).to.equal(poolInfoAfter.rewards);
        });
      });
    });
    describe("third season", () => {
      before(async () => {
        // the goal here will be mainly to check calculation for several accounts
        // staking the same metoken

        await mockToken.approve(
          liquidityMining.address,
          ethers.constants.MaxUint256
        );
        //account0 mints some metoken's
        await foundry
          .connect(account0)
          .mint(meToken.address, tokenDeposited, account0.address);

        // account3 and account4 mint metoken1
        await foundry
          .connect(account3)
          .mint(meToken2.address, tokenDeposited, account3.address);
        await foundry
          .connect(account4)
          .mint(meToken2.address, tokenDeposited, account4.address);

        whitelist = [meToken.address, meToken2.address];
        merkleTree = new MerkleTree(whitelist);
        await mockToken.setBalance(
          account0.address,
          allocationForOneMetoken.mul(whitelist.length)
        );
        // account3 and account4 will stake metoken2 while account0 will stake metoken

        // withdraw metoken2 staked by account2 for calculations
        await liquidityMining
          .connect(account2)
          .withdraw(meToken2.address, tokenDeposited);
      });

      describe("initSeason()", () => {
        it("should be able to initSeason", async () => {
          const initTime =
            (await ethers.provider.getBlock("latest")).timestamp + 10;
          const bSenderBalance = await mockToken.balanceOf(account0.address);
          const bLMBalance = await mockToken.balanceOf(liquidityMining.address);
          const merkleRoot = merkleTree.getHexRoot();
          const allocationPool = allocationForOneMetoken.mul(whitelist.length);
          await liquidityMining.initSeason(
            initTime,
            allocationPool,
            whitelist.length,
            merkleRoot
          );

          const aSenderBalance = await mockToken.balanceOf(account0.address);
          const aLMBalance = await mockToken.balanceOf(liquidityMining.address);
          const seasonInfo = await liquidityMining.getSeasonInfo();

          expect(bSenderBalance.sub(aSenderBalance))
            .to.equal(allocationPool)
            .to.equal(aLMBalance.sub(bLMBalance));

          expect(seasonInfo.startTime.toNumber()).to.equal(initTime);
          expect(seasonInfo.endTime.toNumber()).to.equal(initTime + duration);
          expect(seasonInfo.allocationPool).to.equal(allocationPool);
          expect(seasonInfo.rewardRate).to.equal(
            BigNumber.from(allocationPool).div(2).div(duration)
          );
          expect(seasonInfo.merkleRoot).to.equal(merkleRoot);
        });
      });

      describe("isMeTokenInSeason()", () => {
        it("should return false if a metoken is not present in a season", async () => {
          expect(
            await liquidityMining.isMeTokenInSeason(
              account0.address, // wrong token address
              merkleTree.getHexProof(meToken.address)
            )
          ).to.equal(false);
        });
      });

      describe("stake withdraw claim for one metoken and several stakers", () => {
        // metoken2 was not featured in season2 so there should be no pending rewards
        // account 3 and account 4 have some metoken2 to stake
        // here is the flow of events :
        // account 3 stake => account 4 stake => account 3 withdraw => account 4 withdraw
        let tx: ContractTransaction;
        it("should be able to stake from one account when season is live", async () => {
          // stake for metoken 3 to check in the next tests that claiming during season 2
          // works but erase rewards from season 1 as it is featured in this new season.

          // fast-fwd to when season is live
          const seasonInfo = await liquidityMining.getSeasonInfo();
          await setNextBlockTimestamp(seasonInfo.startTime.toNumber());
          tx = await liquidityMining
            .connect(account3)
            .stake(
              meToken2.address,
              tokenDeposited,
              merkleTree.getHexProof(meToken2.address)
            );
          // stake now for last test
          await liquidityMining.stake(
            meToken.address,
            tokenDeposited,
            merkleTree.getHexProof(meToken.address)
          );
          await expect(tx)
            .to.emit(meToken2, "Transfer")
            .withArgs(
              account3.address,
              liquidityMining.address,
              tokenDeposited
            );
          await expect(tx)
            .to.emit(liquidityMining, "Staked")
            .withArgs(meToken2.address, account3.address, tokenDeposited);

          expect(
            await liquidityMining.balanceOf(meToken2.address, account3.address)
          ).to.equal(tokenDeposited);
        });
        it("should be able to stake later from another account ", async () => {
          const txBlockTime = (
            await ethers.provider.getBlock((await tx.wait()).blockNumber)
          ).timestamp;
          await meToken2
            .connect(account4)
            .approve(liquidityMining.address, max);
          // travel to 12h in the futur
          await setNextBlockTimestamp(txBlockTime + oneDayInSeconds / 2);
          const poolInfo = await liquidityMining.getPoolInfo(
            meToken2.address,
            account4.address
          );
          const seasonInfo = await liquidityMining.getSeasonInfo();

          const merkleRoot = merkleTree.getHexRoot();
          expect(poolInfo.seasonMerkleRoot).to.equal(merkleRoot);

          expect(poolInfo.lastUpdateTime).to.equal(txBlockTime);

          expect(poolInfo.totalSupply).to.equal(tokenDeposited);
          // only begins at start time and not before
          // reward takes only into account previously deposited token amount so tokenDeposited
          const calculatedRewardPerTokenStored = BigNumber.from(
            oneDayInSeconds / 2
          )
            .mul(seasonInfo.rewardRate)
            .mul(PRECISION)
            .div(tokenDeposited);

          // poolInfo.userRewardPerTokenPaid[account] is equal to the value of rewardPerTokenStored when account last interacted with LM
          // it should have been reset by acc3 staking
          expect(poolInfo.rewardPerTokenStored).to.equal(0);
          expect(poolInfo.userRewardPerTokenPaid).to.equal(0);
          //(balance account * (rewardPerToken - userRewardPerTokenPaid) ) + rewards
          const calculatedEarned = tokenDeposited
            .mul(calculatedRewardPerTokenStored)
            .div(PRECISION); // simplified calculation as userRewardPerTokenPaid == 0
          expect(calculatedEarned).to.be.gt(0);
          expect(poolInfo.rewards).to.equal(0);

          // stake for metoken 2 to check in the next tests that claiming during season 2
          // works and season 1 reward is not lost until I am featured in a new season.
          tx = await liquidityMining
            .connect(account4)
            .stake(
              meToken2.address,
              tokenDeposited,
              merkleTree.getHexProof(meToken2.address)
            );

          await expect(tx)
            .to.emit(meToken2, "Transfer")
            .withArgs(
              account4.address,
              liquidityMining.address,
              tokenDeposited
            );
          await expect(tx)
            .to.emit(liquidityMining, "Staked")
            .withArgs(meToken2.address, account4.address, tokenDeposited);

          expect(
            await liquidityMining.balanceOf(meToken2.address, account4.address)
          ).to.equal(tokenDeposited);

          const txBlockTimeAfter = (
            await ethers.provider.getBlock((await tx.wait()).blockNumber)
          ).timestamp;

          const currentRewardPerTokenStored =
            await liquidityMining.rewardPerToken(meToken2.address);
          expect(currentRewardPerTokenStored).to.equal(
            calculatedRewardPerTokenStored
          );
          // travel to one day in the futur
          await mineBlock(txBlockTimeAfter + oneDayInSeconds);

          const poolInfoAfter = await liquidityMining.getPoolInfo(
            meToken2.address,
            account4.address
          );
          expect(poolInfoAfter.lastUpdateTime).to.equal(txBlockTimeAfter);
          // account3 and account4 each deposited 'txBlockTimeAfter'
          expect(poolInfoAfter.totalSupply).to.equal(tokenDeposited.mul(2));
          expect(poolInfoAfter.rewardPerTokenStored).to.equal(
            calculatedRewardPerTokenStored
          );
          expect(poolInfoAfter.userRewardPerTokenPaid).to.equal(
            calculatedRewardPerTokenStored
          );
          // only begins at start time and not before
          // reward takes only into account previously deposited token amount so tokenDeposited.div(2)
          const acc4CalculatedRewardPerTokenStored = BigNumber.from(
            oneDayInSeconds
          )
            .mul(seasonInfo.rewardRate)
            .mul(PRECISION)
            .div(tokenDeposited.mul(2));
          expect(
            await liquidityMining.rewardPerToken(meToken2.address)
          ).to.equal(
            calculatedRewardPerTokenStored.add(
              acc4CalculatedRewardPerTokenStored
            )
          );

          const pendingCalculatedEarned = tokenDeposited
            .mul(poolInfoAfter.userRewardPerTokenPaid)
            .div(PRECISION);
          expect(
            await liquidityMining.earned(meToken2.address, account4.address)
          ).to.equal(pendingCalculatedEarned);
          //.add(calculatedInitialEarned);

          // poolInfo.userRewardPerTokenPaid[account] is equal to the value of rewardPerTokenStored when account last interacted with LM
          expect(poolInfoAfter.userRewardPerTokenPaid).to.equal(
            acc4CalculatedRewardPerTokenStored
          );

          //(balance account * (rewardPerToken - userRewardPerTokenPaid) ) + rewards

          const acc4CalculatedEarned = tokenDeposited
            .mul(calculatedRewardPerTokenStored)
            .div(PRECISION); // simplified calculation as userRewardPerTokenPaid == 0
          expect(acc4CalculatedEarned).to.be.gt(0);
          expect(
            acc4CalculatedRewardPerTokenStored.mul(tokenDepositedInETH)
          ).to.equal(acc4CalculatedEarned);

          // check that rewards for account3 are greater
          const acc3PoolInfoAfter = await liquidityMining.getPoolInfo(
            meToken2.address,
            account3.address
          );
          expect(acc3PoolInfoAfter.lastUpdateTime).to.equal(txBlockTimeAfter);
          const acc3CalculatedRewardPerTokenStored = BigNumber.from(
            oneDayInSeconds
          )
            .mul(acc3PoolInfoAfter.rewardRate)
            .mul(PRECISION)
            .div(tokenDeposited)
            .add(poolInfo.rewardPerTokenStored);
          expect(acc3PoolInfoAfter.rewardPerTokenStored).to.be.gt(0);

          expect(
            await liquidityMining.rewardPerToken(meToken2.address)
          ).to.equal(acc3CalculatedRewardPerTokenStored);
          //(balance account * (rewardPerToken - userRewardPerTokenPaid) ) + rewards
          const acc3CalculatedEarned = tokenDeposited
            .mul(acc3CalculatedRewardPerTokenStored)
            .div(PRECISION);

          expect(
            await liquidityMining.earned(meToken2.address, account3.address)
          ).to.equal(acc3CalculatedEarned);
        });
        it("should be able to exit first user when season is live", async () => {
          // we already  traveled one day in the futur in the previous test
          const poolInfo = await liquidityMining.getPoolInfo(
            meToken2.address,
            account3.address
          );

          const balanceStakedBefore = await liquidityMining.balanceOf(
            meToken2.address,
            account3.address
          );
          tx = await liquidityMining.connect(account3).exit(meToken2.address);
          const txBlockTime = (
            await ethers.provider.getBlock((await tx.wait()).blockNumber)
          ).timestamp;

          const balanceStakedAfter = await liquidityMining.balanceOf(
            meToken2.address,
            account3.address
          );
          await expect(tx)
            .to.emit(meToken2, "Transfer")
            .withArgs(
              liquidityMining.address,
              account3.address,
              tokenDeposited
            );
          // exit withdraw and claim reward
          await expect(tx)
            .to.emit(liquidityMining, "Withdrawn")
            .withArgs(meToken2.address, account3.address, tokenDeposited);

          const poolInfoAfter = await liquidityMining.getPoolInfo(
            meToken2.address,
            account3.address
          );
          const rewardPaid =
            poolInfoAfter.userRewardPerTokenPaid.mul(tokenDepositedInETH);
          await expect(tx)
            .to.emit(liquidityMining, "RewardPaid")
            .withArgs(meToken2.address, account3.address, rewardPaid);

          //balance staked has been updated
          expect(balanceStakedBefore).to.equal(tokenDeposited);
          expect(balanceStakedAfter).to.equal(0);
          // reward per token stored has been updated
          // Previous reward per token stored + ((now-lastUpdateTime)  * RewardRate)/ (TotalSupply staked))
          // at that time TotalSupply staked == tokenDeposited because _updateReward is ran before updating totalSupply
          const calculatedRewardPerTokenStored = BigNumber.from(
            txBlockTime - poolInfo.lastUpdateTime.toNumber()
          )
            .mul(poolInfo.rewardRate)
            .mul(PRECISION)
            .div(tokenDeposited.mul(2))
            .add(poolInfo.rewardPerTokenStored);

          expect(poolInfoAfter.rewardPerTokenStored).to.equal(
            calculatedRewardPerTokenStored
          );

          // poolInfo.userRewardPerTokenPaid[account] is equal to the value of rewardPerTokenStored when account last interacted with LM
          expect(poolInfoAfter.userRewardPerTokenPaid).to.equal(
            calculatedRewardPerTokenStored
          );
        });
        it("should be able to exit last user when season is live", async () => {
          const txBlockTimeAfter = (
            await ethers.provider.getBlock((await tx.wait()).blockNumber)
          ).timestamp;
          // travel to two days in the futur
          await setNextBlockTimestamp(txBlockTimeAfter + oneDayInSeconds * 2);

          const poolInfo = await liquidityMining.getPoolInfo(
            meToken2.address,
            account4.address
          );

          const balanceStakedBefore = await liquidityMining.balanceOf(
            meToken2.address,
            account4.address
          );

          tx = await liquidityMining.connect(account4).exit(meToken2.address);
          const txBlockTime = (
            await ethers.provider.getBlock((await tx.wait()).blockNumber)
          ).timestamp;

          const balanceStakedAfter = await liquidityMining.balanceOf(
            meToken2.address,
            account4.address
          );
          const poolInfoAfter = await liquidityMining.getPoolInfo(
            meToken2.address,
            account4.address
          );

          await expect(tx)
            .to.emit(meToken2, "Transfer")
            .withArgs(
              liquidityMining.address,
              account4.address,
              tokenDeposited
            );
          // exit withdraw and claim reward
          await expect(tx)
            .to.emit(liquidityMining, "Withdrawn")
            .withArgs(meToken2.address, account4.address, tokenDeposited);

          //balance staked has been updated
          expect(balanceStakedBefore).to.equal(tokenDeposited);
          expect(balanceStakedAfter).to.equal(0);
          // reward per token stored has been updated
          // Previous reward per token stored + ((now-lastUpdateTime)  * RewardRate)/ (TotalSupply staked))
          // at that time TotalSupply staked == tokenDeposited because _updateReward is ran before updating totalSupply
          const calculatedRewardPerTokenStored = BigNumber.from(
            txBlockTime - poolInfo.lastUpdateTime.toNumber()
          )
            .mul(poolInfo.rewardRate)
            .mul(PRECISION)
            .div(tokenDeposited)
            .add(poolInfo.rewardPerTokenStored);

          expect(poolInfoAfter.rewardPerTokenStored).to.equal(
            calculatedRewardPerTokenStored
          );
          //(balance account * (rewardPerToken - userRewardPerTokenPaid) ) + rewards
          const rewardPaid = tokenDeposited
            .mul(
              calculatedRewardPerTokenStored.sub(
                poolInfo.userRewardPerTokenPaid
              )
            )
            .div(PRECISION);

          await expect(tx)
            .to.emit(liquidityMining, "RewardPaid")
            .withArgs(meToken2.address, account4.address, rewardPaid);
          // poolInfo.userRewardPerTokenPaid[account] is equal to the value of rewardPerTokenStored when account last interacted with LM
          expect(poolInfoAfter.userRewardPerTokenPaid).to.equal(
            calculatedRewardPerTokenStored
          );
          expect(poolInfoAfter.lastUpdateTime).to.equal(txBlockTime);
        });
        it("should be able to withdraw and claim rewards when season is over", async () => {
          const seasonInfo = await liquidityMining.getSeasonInfo();
          // move forward to end of season
          await setNextBlockTimestamp(
            seasonInfo.endTime.toNumber() + oneDayInSeconds
          );

          const poolInfo = await liquidityMining.getPoolInfo(
            meToken.address,
            account0.address
          );

          const balanceStakedBefore = await liquidityMining.balanceOf(
            meToken.address,
            account0.address
          );

          tx = await liquidityMining.connect(account0).exit(meToken.address);
          const txBlockTime = (
            await ethers.provider.getBlock((await tx.wait()).blockNumber)
          ).timestamp;

          const balanceStakedAfter = await liquidityMining.balanceOf(
            meToken.address,
            account0.address
          );
          const poolInfoAfter = await liquidityMining.getPoolInfo(
            meToken.address,
            account0.address
          );

          await expect(tx)
            .to.emit(meToken, "Transfer")
            .withArgs(
              liquidityMining.address,
              account0.address,
              tokenDeposited
            );
          // exit withdraw and claim reward
          await expect(tx)
            .to.emit(liquidityMining, "Withdrawn")
            .withArgs(meToken.address, account0.address, tokenDeposited);

          //balance staked has been updated
          expect(balanceStakedBefore).to.equal(tokenDeposited);
          expect(balanceStakedAfter).to.equal(0);
          // reward per token stored has been updated
          // Previous reward per token stored + ((now-lastUpdateTime)  * RewardRate)/ (TotalSupply staked))
          // at that time TotalSupply staked == tokenDeposited because _updateReward is ran before updating totalSupply
          const calculatedRewardPerTokenStored = BigNumber.from(
            seasonInfo.endTime.toNumber() -
              (seasonInfo.startTime.toNumber() + 1)
          )
            .mul(poolInfo.rewardRate)
            .mul(PRECISION)
            .div(tokenDeposited)
            .add(poolInfo.rewardPerTokenStored);

          expect(poolInfoAfter.rewardPerTokenStored).to.equal(
            calculatedRewardPerTokenStored
          );
          //(balance account * (rewardPerToken - userRewardPerTokenPaid) ) + rewards
          const rewardPaid = tokenDeposited
            .mul(
              calculatedRewardPerTokenStored.sub(
                poolInfo.userRewardPerTokenPaid
              )
            )
            .div(PRECISION);

          await expect(tx)
            .to.emit(liquidityMining, "RewardPaid")
            .withArgs(meToken.address, account0.address, rewardPaid);
          // poolInfo.userRewardPerTokenPaid[account] is equal to the value of rewardPerTokenStored when account last interacted with LM
          expect(poolInfoAfter.userRewardPerTokenPaid).to.equal(
            calculatedRewardPerTokenStored
          );
          expect(poolInfoAfter.lastUpdateTime).to.equal(seasonInfo.endTime);
        });
      });
    });

    after(async () => {
      await network.provider.send("evm_revert", [snapshotId]);
    });
  });
};

setup().then(() => {
  run();
});
