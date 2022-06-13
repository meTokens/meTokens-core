import { ethers, getNamedAccounts, network } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Signer, BigNumber, ContractTransaction } from "ethers";
import { expect } from "chai";
import { deploy, getContractAt, toETHNumber } from "../../utils/helpers";
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
    let meTokenRegistry: MeTokenRegistryFacet;
    let foundry: FoundryFacet;
    let token: ERC20;
    let meToken: MeToken;
    let meToken1: MeToken;
    let meToken2: MeToken;
    let meToken3: MeToken;
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

    const allocationPool = ethers.utils.parseEther("30");
    const allocationPoolSeason2 = ethers.utils.parseEther("200");
    const BASE = ethers.utils.parseUnits("1", 54);

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
        const max = ethers.constants.MaxUint256;
        await dai.connect(account0).approve(singleAssetVault.address, max);
        await weth.connect(account0).approve(singleAssetVault.address, max);
        await dai.connect(account1).approve(singleAssetVault.address, max);
        await dai.connect(account2).approve(singleAssetVault.address, max);
        await dai.connect(account3).approve(singleAssetVault.address, max);
        await dai.connect(account0).approve(meTokenRegistry.address, max);
        await dai.connect(account1).approve(meTokenRegistry.address, max);
        await dai.connect(account2).approve(meTokenRegistry.address, max);
        await dai.connect(account3).approve(meTokenRegistry.address, max);

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

        await mockToken.setBalance(account0.address, allocationPool);
        await mockToken.approve(
          liquidityMining.address,
          ethers.constants.MaxUint256
        );
        // second metokens will be used to check that we can claim rewards during season 2 if I am not featured in season 2
        // third metoken will be used to check that rewards form season 1 are lost if we claim rewards during season 2 when I am featured in season 2
        const whitelist = [meToken.address, meToken2.address, meToken3.address];
        merkleTree = new MerkleTree(whitelist);
      });
      // TODO check initialised variables
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

          await liquidityMining.initSeason(
            initTime,
            allocationPool,
            3,
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

      describe("stake withdraw claim for one season", () => {
        let tx: ContractTransaction;
        it("revert to stake when season is not live", async () => {
          const isSeasonLive = await liquidityMining.isSeasonLive();
          expect(isSeasonLive).to.be.false;
          await meToken.approve(liquidityMining.address, tokenDeposited);

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
          // stake for metoken 3 to check in the next tests that claiming during season 2
          // works but erase rewards from season 1 as it is featured in this new season.
          await liquidityMining
            .connect(account3)
            .stake(
              meToken3.address,
              tokenDeposited,
              merkleTree.getHexProof(meToken3.address)
            );
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

          // travel to one day in the futur
          await setNextBlockTimestamp(txBlockTime + oneDayInSeconds);

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

          console.log(`
        txBlockTime           :${txBlockTime.toString()}
         startTime        :${seasonInfo.startTime}
         minus           :${BigNumber.from(txBlockTime).sub(
           seasonInfo.startTime
         )} 
        rewardRate            :${seasonInfo.rewardRate.toString()}
        tokenDeposited        :${toETHNumber(tokenDeposited)}
        rewardPerTokenStored  :${poolInfo.rewardPerTokenStored}
       
        `);
          // only begins at start time and not before
          // reward takes only into account previously deposited token amount so tokenDeposited.div(2)
          const calculatedRewardPerTokenStored = BigNumber.from(oneDayInSeconds)
            .mul(seasonInfo.rewardRate)
            .mul(PRECISION)
            .div(tokenDeposited);
          console.log(` 
          calculatedRewardPerTokenStored
          :${calculatedRewardPerTokenStored}
          `);
          expect(poolInfo.rewardPerTokenStored).to.equal(
            calculatedRewardPerTokenStored
          );
          // as there is only one user interacting with liquidity mining
          //  poolInfo.userRewardPerTokenPaid[account]  will always be equal to userRewardPerTokenPaid
          expect(poolInfo.userRewardPerTokenPaid).to.equal(
            calculatedRewardPerTokenStored
          );
          console.log(`
        poolInfo.rewards                       :${poolInfo.rewards}
        poolInfo.userRewardPerTokenPaid        :${poolInfo.userRewardPerTokenPaid}
        calculatedRewardPerTokenStored         :${calculatedRewardPerTokenStored} 
        
        `);

          //(balance account * (rewardPerToken - userRewardPerTokenPaid) ) + rewards
          const calculatedEarned = tokenDeposited
            .mul(calculatedRewardPerTokenStored)
            .div(PRECISION); // simplified calculation as userRewardPerTokenPaid == 0
          expect(calculatedEarned).to.be.gt(0);
          expect(poolInfo.rewards).to.equal(calculatedEarned);
        });
        it("should be able to claim when season is live", async () => {
          const poolInfo = await liquidityMining.getPoolInfo(
            meToken.address,
            account0.address
          );
          tx = await liquidityMining.claimReward(meToken.address);
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
          const lastUpdateTime = tx.timestamp ?? 0;
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
              account0.address,
              liquidityMining.address,
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

          //  poolInfo.userRewardPerTokenPaid[account]  will always be equal to userRewardPerTokenPaid
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
          // last withdraw tx holds the lastUpdateTime
          const lastUpdateTime = tx.timestamp ?? 0;
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
            lastUpdateTime + seasonInfo.endTime.toNumber() + oneDayInSeconds
          );
          const balanceStakedAfter = await liquidityMining.balanceOf(
            meToken.address,
            account0.address
          );
          // nothing is staked anymore
          expect(balanceStakedBefore).to.equal(0);
          await expect(tx)
            .to.emit(meToken, "Transfer")
            .withArgs(
              account0.address,
              liquidityMining.address,
              tokenDeposited.div(2)
            );
          await expect(tx)
            .to.emit(liquidityMining, "Withdrawn")
            .withArgs(meToken.address, account0.address, tokenDeposited.div(2));
          const poolInfoAfter = await liquidityMining.getPoolInfo(
            meToken.address,
            account0.address
          );

          // reward per token stored has been updated
          // Previous reward per token stored + ((now-lastUpdateTime)  * RewardRate)/ (TotalSupply staked))
          // at that time TotalSupply staked == tokenDeposited.div(2) because it was updated after previous withdraw
          const calculatedRewardPerTokenStored = BigNumber.from(
            txBlockTime - lastUpdateTime
          )
            .mul(poolInfo.rewardRate)
            .mul(PRECISION)
            .div(tokenDeposited.div(2))
            .add(poolInfo.rewardPerTokenStored);
          expect(poolInfoAfter.rewardPerTokenStored).to.equal(
            calculatedRewardPerTokenStored
          );

          //  poolInfo.userRewardPerTokenPaid[account]  will always be equal to userRewardPerTokenPaid
          expect(poolInfoAfter.userRewardPerTokenPaid).to.equal(
            calculatedRewardPerTokenStored
          );

          // rewards have been updated
          //(balance account * (rewardPerToken - userRewardPerTokenPaid) ) + rewards
          const calculatedEarned = tokenDeposited
            .div(2)
            .mul(calculatedRewardPerTokenStored)
            .div(PRECISION); // simplified calculation as userRewardPerTokenPaid == 0
          expect(calculatedEarned).to.be.gt(0);
          expect(poolInfoAfter.rewards).to.equal(calculatedEarned);
        });
        it("should be able to claim when season is not live", async () => {
          const poolInfo = await liquidityMining.getPoolInfo(
            meToken.address,
            account0.address
          );
          tx = await liquidityMining.claimReward(meToken.address);
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
          ).to.equal(tokenDeposited);

          // reward should now be 0
          const poolInfoAfter = await liquidityMining.getPoolInfo(
            meToken.address,
            account0.address
          );
          expect(poolInfoAfter.rewards).to.equal(0);
        });
      });

      /*    describe("withdraw()", () => {
      let tx: ContractTransaction;
      before(async () => {
        // increase time to 100s before season- 1 endTime
        await mineBlock(
          (await liquidityMining.getSeasonInfo()).endTime.toNumber() - 100
        );
      });

      it("revert to withdraw with zero amount", async () => {
        await expect(
          liquidityMining.withdraw(meToken.address, 0, [
            ethers.constants.HashZero,
          ])
        ).to.be.revertedWith("RewardsPool: cannot withdraw zero");
      });

      it("should be able to withdraw", async () => {
        tx = await liquidityMining.withdraw(
          meToken.address,
          tokenDeposited,
          merkleTree.getHexProof(meToken.address)
        );

        await expect(tx)
          .to.emit(meToken, "Transfer")
          .withArgs(liquidityMining.address, account0.address, tokenDeposited);
        await expect(tx)
          .to.emit(liquidityMining, "Withdrawn")
          .withArgs(meToken.address, account0.address, tokenDeposited);

        expect(
          await liquidityMining.balanceOf(meToken.address, account0.address)
        ).to.equal(0);
      });

      it("check new pool and season information", async () => {
        const poolInfo = await liquidityMining.getPoolInfo(
          meToken.address,
          account0.address
        );
        const seasonInfo = await liquidityMining.getSeasonInfo();
        const metokenTotalSupply = await meToken.totalSupply();
        const calculatedNewPctStaked = 0; // simplified cal
        const txBlockTime = (
          await ethers.provider.getBlock((await tx.wait()).blockNumber)
        ).timestamp;
        const calculatedRewardPerTokenStored = BigNumber.from(txBlockTime)
          .sub(lastUpdateTime)
          .mul(seasonInfo.rewardRate)
          .mul(PRECISION)
          .div(tokenDeposited);
        const calculatedEarned = tokenDeposited
          .mul(calculatedRewardPerTokenStored)
          .div(PRECISION); // simplified calculation
        const merkleRoot = merkleTree.getHexRoot();
        expect(poolInfo.seasonMerkleRoot).to.equal(merkleRoot);
        expect(poolInfo.pendingIssuerRewards).to.equal(0);
        expect(poolInfo.pendingIssuerRewardsAdded).to.equal(false);
        expect(poolInfo.lastUpdateTime).to.equal(
          (await ethers.provider.getBlock((await tx.wait()).blockNumber))
            .timestamp
        );

        expect(poolInfo.totalSupply).to.equal(0);
        expect(poolInfo.lastCirculatingSupply).to.equal(metokenTotalSupply);
        expect(poolInfo.rewardPerTokenStored).to.equal(
          calculatedRewardPerTokenStored
        );
        expect(poolInfo.userRewardPerTokenPaid).to.equal(
          calculatedRewardPerTokenStored
        );
        expect(poolInfo.rewards).to.equal(calculatedEarned);

        expect(seasonInfo.totalPctStaked).to.equal(calculatedNewPctStaked);
      });
    });

    describe("recoverERC20()", () => {
      before(async () => {
        // add some me and meTokens to liquidityMining contract
        await meToken.transfer(liquidityMining.address, 1);
        await mockToken.transfer(liquidityMining.address, 1);
        await mockToken2.setBalance(liquidityMining.address, 1);
      });
      it("revert to recover me(reward) token", async () => {
        await expect(
          liquidityMining.recoverERC20(mockToken.address, account0.address, 1)
        ).to.be.revertedWith("Cannot withdraw the reward token");
      });
      it("revert to recover meToken", async () => {
        await expect(
          liquidityMining.recoverERC20(meToken.address, account0.address, 1)
        ).to.be.revertedWith("Cannot withdraw a meToken");
      });
      it("should be able to recover other tokens", async () => {
        const tx = await liquidityMining.recoverERC20(
          mockToken2.address,
          account0.address,
          1
        );

        await expect(tx)
          .to.emit(liquidityMining, "Recovered")
          .withArgs(mockToken2.address, 1);
      });
    }); */
    });
    describe("second season", () => {
      before(async () => {
        // let's send more rewards
        await mockToken.setBalance(account0.address, allocationPoolSeason2);
        await mockToken.approve(
          liquidityMining.address,
          ethers.constants.MaxUint256
        );
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
        const whitelist = [meToken1.address, meToken3.address]; // metoken2 from account2 and metoken from account0 are not part of season 2
        merkleTree = new MerkleTree(whitelist);
        // mint more metokens for metoken 2 and 3

        await foundry
          .connect(account2)
          .mint(meToken2.address, tokenDeposited, account2.address);

        await foundry
          .connect(account3)
          .mint(meToken3.address, tokenDeposited, account3.address);
      });

      describe("stake withdraw claim for second season", () => {
        let tx: ContractTransaction;
        let pendingAcc2Rewards;
        let pendingAcc3Rewards;
        it("should have pending rewards from previous season", async () => {
          pendingAcc2Rewards = await liquidityMining.earned(
            meToken2.address,
            account2.address
          );
          pendingAcc3Rewards = await liquidityMining.earned(
            meToken3.address,
            account3.address
          );
          expect(pendingAcc2Rewards).to.be.gt(0);
          expect(pendingAcc3Rewards).to.be.gt(0);
        });
        it("revert to stake when season is not live", async () => {
          const isSeasonLive = await liquidityMining.isSeasonLive();
          expect(isSeasonLive).to.be.false;
          await meToken2.approve(liquidityMining.address, tokenDeposited);

          await expect(
            liquidityMining.stake(
              meToken2.address,
              tokenDeposited.div(2),
              merkleTree.getHexProof(meToken2.address)
            )
          ).to.be.revertedWith("not live");
        });
        it("should be able to initSeason", async () => {
          const initTime =
            (await ethers.provider.getBlock("latest")).timestamp + 10;
          const bSenderBalance = await mockToken.balanceOf(account0.address);
          const bLMBalance = await mockToken.balanceOf(liquidityMining.address);
          const merkleRoot = merkleTree.getHexRoot();

          await liquidityMining.initSeason(
            initTime,
            allocationPoolSeason2,
            3,
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
            BigNumber.from(allocationPoolSeason2).div(2).div(duration)
          );
          expect(seasonInfo.merkleRoot).to.equal(merkleRoot);
        });
        it("revert to stake when not part of the season", async () => {
          const seasonInfo = await liquidityMining.getSeasonInfo();
          await setNextBlockTimestamp(seasonInfo.startTime.toNumber());

          const isSeasonLive = await liquidityMining.isSeasonLive();
          expect(isSeasonLive).to.be.true;
          await meToken.approve(liquidityMining.address, tokenDeposited);

          await expect(
            liquidityMining.stake(
              meToken.address,
              tokenDeposited.div(2),
              merkleTree.getHexProof(meToken.address)
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
            .to.emit(meToken, "Transfer")
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
          await setNextBlockTimestamp(txBlockTime + oneDayInSeconds);

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

          console.log(`
        txBlockTime           :${txBlockTime.toString()}
         startTime        :${seasonInfo.startTime}
         minus           :${BigNumber.from(txBlockTime).sub(
           seasonInfo.startTime
         )} 
        rewardRate            :${seasonInfo.rewardRate.toString()}
        tokenDeposited        :${toETHNumber(tokenDeposited)}
        rewardPerTokenStored  :${poolInfo.rewardPerTokenStored}
       
        `);
          // only begins at start time and not before
          // reward takes only into account previously deposited token amount so tokenDeposited.div(2)
          const calculatedRewardPerTokenStored = BigNumber.from(oneDayInSeconds)
            .mul(seasonInfo.rewardRate)
            .mul(PRECISION)
            .div(tokenDeposited);
          console.log(` 
          calculatedRewardPerTokenStored
          :${calculatedRewardPerTokenStored}
          `);
          expect(poolInfo.rewardPerTokenStored).to.equal(
            calculatedRewardPerTokenStored
          );
          // as there is only one user interacting with liquidity mining
          //  poolInfo.userRewardPerTokenPaid[account]  will always be equal to userRewardPerTokenPaid
          expect(poolInfo.userRewardPerTokenPaid).to.equal(
            calculatedRewardPerTokenStored
          );
          console.log(`
        poolInfo.rewards                       :${poolInfo.rewards}
        poolInfo.userRewardPerTokenPaid        :${poolInfo.userRewardPerTokenPaid}
        calculatedRewardPerTokenStored         :${calculatedRewardPerTokenStored} 
        
        `);

          //(balance account * (rewardPerToken - userRewardPerTokenPaid) ) + rewards
          const calculatedEarned = tokenDeposited
            .mul(calculatedRewardPerTokenStored)
            .div(PRECISION); // simplified calculation as userRewardPerTokenPaid == 0
          expect(calculatedEarned).to.be.gt(0);
          expect(poolInfo.rewards).to.equal(calculatedEarned);
        });
        it("should be able to claim rewards from season 1 ", async () => {
          const poolInfo = await liquidityMining.getPoolInfo(
            meToken.address,
            account0.address
          );
          tx = await liquidityMining.claimReward(meToken.address);
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
          ).to.equal(tokenDeposited);

          // reward should now be 0
          const poolInfoAfter = await liquidityMining.getPoolInfo(
            meToken.address,
            account0.address
          );
          expect(poolInfoAfter.rewards).to.equal(0);
        });
        it("shouldn't be able to claim rewards from season 1 if featured in season 2 ", async () => {
          const poolInfo = await liquidityMining.getPoolInfo(
            meToken.address,
            account0.address
          );
          tx = await liquidityMining.claimReward(meToken.address);
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
          ).to.equal(tokenDeposited);

          // reward should now be 0
          const poolInfoAfter = await liquidityMining.getPoolInfo(
            meToken.address,
            account0.address
          );
          expect(poolInfoAfter.rewards).to.equal(0);
        });
        it("should be able to claim when season is live", async () => {
          const poolInfo = await liquidityMining.getPoolInfo(
            meToken.address,
            account0.address
          );
          tx = await liquidityMining.claimReward(meToken.address);
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
          const lastUpdateTime = tx.timestamp ?? 0;
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
              account0.address,
              liquidityMining.address,
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

          //  poolInfo.userRewardPerTokenPaid[account]  will always be equal to userRewardPerTokenPaid
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
          // last withdraw tx holds the lastUpdateTime
          const lastUpdateTime = tx.timestamp ?? 0;
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
            lastUpdateTime + seasonInfo.endTime.toNumber() + oneDayInSeconds
          );
          const balanceStakedAfter = await liquidityMining.balanceOf(
            meToken.address,
            account0.address
          );
          // nothing is staked anymore
          expect(balanceStakedBefore).to.equal(0);
          await expect(tx)
            .to.emit(meToken, "Transfer")
            .withArgs(
              account0.address,
              liquidityMining.address,
              tokenDeposited.div(2)
            );
          await expect(tx)
            .to.emit(liquidityMining, "Withdrawn")
            .withArgs(meToken.address, account0.address, tokenDeposited.div(2));
          const poolInfoAfter = await liquidityMining.getPoolInfo(
            meToken.address,
            account0.address
          );

          // reward per token stored has been updated
          // Previous reward per token stored + ((now-lastUpdateTime)  * RewardRate)/ (TotalSupply staked))
          // at that time TotalSupply staked == tokenDeposited.div(2) because it was updated after previous withdraw
          const calculatedRewardPerTokenStored = BigNumber.from(
            txBlockTime - lastUpdateTime
          )
            .mul(poolInfo.rewardRate)
            .mul(PRECISION)
            .div(tokenDeposited.div(2))
            .add(poolInfo.rewardPerTokenStored);
          expect(poolInfoAfter.rewardPerTokenStored).to.equal(
            calculatedRewardPerTokenStored
          );

          //  poolInfo.userRewardPerTokenPaid[account]  will always be equal to userRewardPerTokenPaid
          expect(poolInfoAfter.userRewardPerTokenPaid).to.equal(
            calculatedRewardPerTokenStored
          );

          // rewards have been updated
          //(balance account * (rewardPerToken - userRewardPerTokenPaid) ) + rewards
          const calculatedEarned = tokenDeposited
            .div(2)
            .mul(calculatedRewardPerTokenStored)
            .div(PRECISION); // simplified calculation as userRewardPerTokenPaid == 0
          expect(calculatedEarned).to.be.gt(0);
          expect(poolInfoAfter.rewards).to.equal(calculatedEarned);
        });
        it("should be able to claim when season is not live", async () => {
          const poolInfo = await liquidityMining.getPoolInfo(
            meToken.address,
            account0.address
          );
          tx = await liquidityMining.claimReward(meToken.address);
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
          ).to.equal(tokenDeposited);

          // reward should now be 0
          const poolInfoAfter = await liquidityMining.getPoolInfo(
            meToken.address,
            account0.address
          );
          expect(poolInfoAfter.rewards).to.equal(0);
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
