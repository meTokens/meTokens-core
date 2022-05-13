import { ethers, getNamedAccounts } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Signer, BigNumber, ContractTransaction } from "ethers";
import { expect } from "chai";
import { deploy, getContractAt } from "../../utils/helpers";
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
    let meTokenRegistry: MeTokenRegistryFacet;
    let foundry: FoundryFacet;
    let token: ERC20;
    let meToken: MeToken;
    let whale: Signer;
    let liquidityMining: LiquidityMiningFacet;
    let singleAssetVault: SingleAssetVault;
    let encodedCurveInfo: string;
    let encodedVaultArgs: string;
    let mockToken: MockERC20;
    let mockToken2: MockERC20;
    let merkleTree: MerkleTree;
    let lastUpdateTime: BigNumber;

    const hubId = 1;
    const name = "Carl meToken";
    const symbol = "CARL";
    const initRefundRatio = 50000;
    const PRECISION = ethers.utils.parseEther("1");
    const amount1 = ethers.utils.parseEther("100");
    const tokenDepositedInETH = 10;
    const tokenDeposited = ethers.utils.parseEther(
      tokenDepositedInETH.toString()
    );

    const warmup = 2 * 60 * 24 * 24; // 2 days
    const duration = 4 * 60 * 24 * 24; // 4 days
    const issuerCooldown = 4 * 60 * 24 * 24; // 4 days

    const allocationPool = ethers.utils.parseEther("20");
    const allocationIssuers = ethers.utils.parseEther("10");
    const BASE = ethers.utils.parseUnits("1", 54);

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
      const max = ethers.constants.MaxUint256;
      await dai.connect(account0).approve(singleAssetVault.address, max);
      await weth.connect(account0).approve(singleAssetVault.address, max);
      await dai.connect(account1).approve(singleAssetVault.address, max);
      // account0 is registering a metoken
      await meTokenRegistry.connect(account0).subscribe(name, symbol, hubId, 0);
      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account0.address
      );

      meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);

      await foundry.mint(meToken.address, tokenDeposited, account0.address);

      await mockToken.setBalance(
        account0.address,
        ethers.utils.parseEther("1000")
      );
      await mockToken.approve(
        liquidityMining.address,
        ethers.constants.MaxUint256
      );

      mockToken2 = (await deploy<MockERC20>("MockERC20")) as MockERC20;

      const whitelist = [meToken.address, mockToken.address]; // TODO replace 2nd address with valid metoken
      merkleTree = new MerkleTree(whitelist);
    });

    // TODO check initialised variables
    describe("Initial States", () => {
      it("State check", async () => {
        const poolInfo = await liquidityMining.getPoolInfo(
          meToken.address,
          ethers.constants.AddressZero
        );
        const seasonInfo = await liquidityMining.getSeasonInfo(0);

        expect(await liquidityMining.getIssuerCooldown()).to.equal(0);
        expect(await liquidityMining.getLMWarmup()).to.equal(0);
        expect(await liquidityMining.getLMWarmup()).to.equal(0);
        expect(await liquidityMining.getSeasonCount()).to.equal(0);

        expect(poolInfo.seasonId).to.equal(0);
        expect(poolInfo.pendingIssuerRewards).to.equal(0);
        expect(poolInfo.pendingIssuerRewardsAdded).to.equal(false);
        expect(poolInfo.lastUpdateTime).to.equal(0);
        expect(poolInfo.totalSupply).to.equal(0);
        expect(poolInfo.lastCirculatingSupply).to.equal(0);
        expect(poolInfo.rewardPerTokenStored).to.equal(0);

        expect(seasonInfo.initTime).to.equal(0);
        expect(seasonInfo.startTime).to.equal(0);
        expect(seasonInfo.endTime).to.equal(0);
        expect(seasonInfo.allocationPool).to.equal(0);
        expect(seasonInfo.allocationIssuers).to.equal(0);
        expect(seasonInfo.totalPctStaked).to.equal(0);
        expect(seasonInfo.rewardRate).to.equal(0);
        expect(seasonInfo.merkleRoot).to.equal(ethers.constants.HashZero);
      });
    });

    describe("setLMWarmup()", () => {
      it("revert when sender is not durationController", async () => {
        await expect(
          liquidityMining.connect(account1).setLMWarmup(warmup)
        ).to.revertedWith("!durationsController");
      });
      it("revert when setting same value", async () => {
        await expect(liquidityMining.setLMWarmup(0)).to.revertedWith(
          "same lmWarmup"
        );
      });
      it("should set lmwWarmup", async () => {
        await liquidityMining.setLMWarmup(warmup);
        expect(await liquidityMining.getLMWarmup()).to.equal(warmup);
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

    describe("setIssuerCooldown()", () => {
      it("revert when sender is not durationController", async () => {
        await expect(
          liquidityMining.connect(account1).setIssuerCooldown(issuerCooldown)
        ).to.revertedWith("!durationsController");
      });
      it("revert when setting same value", async () => {
        await expect(liquidityMining.setIssuerCooldown(0)).to.revertedWith(
          "same issuerCooldown"
        );
      });
      it("should set issuerCooldown", async () => {
        await liquidityMining.setIssuerCooldown(issuerCooldown);
        expect(await liquidityMining.getIssuerCooldown()).to.equal(
          issuerCooldown
        );
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
      it("revert when season initialization time is less than block timestamp", async () => {
        const initTime =
          (await ethers.provider.getBlock("latest")).timestamp - 10;
        await expect(
          liquidityMining.initSeason(initTime, 0, 0, ethers.constants.HashZero)
        ).to.be.revertedWith("init time < timestamp");
      });
      it("should be able to initSeason", async () => {
        expect(
          await liquidityMining.canTokenBeFeaturedInNewSeason(mockToken.address)
        ).to.equal(false);
        expect(
          await liquidityMining.canTokenBeFeaturedInNewSeason(meToken.address)
        ).to.equal(true);
        const initTime =
          (await ethers.provider.getBlock("latest")).timestamp + 1;
        const bSenderBalance = await mockToken.balanceOf(account0.address);
        const bLMBalance = await mockToken.balanceOf(liquidityMining.address);
        const merkleRoot = merkleTree.getHexRoot();

        await liquidityMining.initSeason(
          initTime,
          allocationPool,
          allocationIssuers,
          merkleRoot
        );

        const aSenderBalance = await mockToken.balanceOf(account0.address);
        const aLMBalance = await mockToken.balanceOf(liquidityMining.address);
        const seasonInfo = await liquidityMining.getSeasonInfo(1);

        expect(bSenderBalance.sub(aSenderBalance))
          .to.equal(allocationPool.add(allocationIssuers))
          .to.equal(aLMBalance.sub(bLMBalance));
        expect((await liquidityMining.getSeasonCount()).toNumber()).to.equal(1);
        expect(seasonInfo.initTime.toNumber()).to.equal(initTime);
        expect(seasonInfo.startTime.toNumber()).to.equal(initTime + warmup);
        expect(seasonInfo.endTime.toNumber()).to.equal(
          initTime + warmup + duration
        );
        expect(seasonInfo.allocationPool).to.equal(allocationPool);
        expect(seasonInfo.allocationIssuers).to.equal(allocationIssuers);
        expect(seasonInfo.totalPctStaked).to.equal(0);
        expect(seasonInfo.rewardRate).to.equal(
          BigNumber.from(allocationPool).div(duration)
        );
        expect(seasonInfo.merkleRoot).to.equal(merkleRoot);
      });
      it("revert when last season is live", async () => {
        await setNextBlockTimestamp(
          (await liquidityMining.getSeasonInfo(1)).startTime.toNumber()
        );
        await expect(
          liquidityMining.initSeason(0, 0, 0, ethers.constants.HashZero)
        ).to.be.revertedWith("last season live");
      });
    });

    describe("isMeTokenInSeason()", () => {
      const currentSeason = 1;
      it("should return true if a metoken is present in a season", async () => {
        expect(
          await liquidityMining.isMeTokenInSeason(
            currentSeason,
            meToken.address,
            merkleTree.getHexProof(meToken.address)
          )
        ).to.equal(true);
      });
      it("should return false if a metoken is present in a season", async () => {
        expect(
          await liquidityMining.isMeTokenInSeason(
            currentSeason,
            account0.address, // wrong token address
            merkleTree.getHexProof(meToken.address)
          )
        ).to.equal(false);
      });
    });

    describe("stake()", () => {
      let tx: ContractTransaction;
      it("revert to stake with zero amount", async () => {
        await expect(
          liquidityMining.stake(meToken.address, 0, [ethers.constants.HashZero])
        ).to.be.revertedWith("RewardsPool: cannot stake zero");
      });

      it("should be able to stake", async () => {
        await meToken.approve(liquidityMining.address, tokenDeposited);
        tx = await liquidityMining.stake(
          meToken.address,
          tokenDeposited,
          merkleTree.getHexProof(meToken.address)
        );

        await expect(tx)
          .to.emit(meToken, "Transfer")
          .withArgs(account0.address, liquidityMining.address, tokenDeposited);
        await expect(tx)
          .to.emit(liquidityMining, "Staked")
          .withArgs(meToken.address, account0.address, tokenDeposited);

        expect(
          await liquidityMining.balanceOf(meToken.address, account0.address)
        ).to.equal(tokenDeposited);
      });
      it("check new pool and season information", async () => {
        const poolInfo = await liquidityMining.getPoolInfo(
          meToken.address,
          account0.address
        );
        const seasonInfo = await liquidityMining.getSeasonInfo(1);
        const metokenTotalSupply = await meToken.totalSupply();
        const calculatedNewPctStaked = tokenDeposited
          .mul(BASE)
          .div(metokenTotalSupply);

        expect(poolInfo.seasonId).to.equal(1);
        expect(poolInfo.pendingIssuerRewards).to.equal(0);
        expect(poolInfo.pendingIssuerRewardsAdded).to.equal(false);
        expect(poolInfo.lastUpdateTime).to.equal(
          (await ethers.provider.getBlock((await tx.wait()).blockNumber))
            .timestamp
        );

        expect(poolInfo.totalSupply).to.equal(tokenDeposited);
        expect(poolInfo.lastCirculatingSupply).to.equal(metokenTotalSupply);
        expect(poolInfo.rewardPerTokenStored).to.equal(0);
        expect(poolInfo.userRewardPerTokenPaid).to.equal(0);
        expect(poolInfo.rewards).to.equal(0);

        expect(seasonInfo.totalPctStaked).to.equal(calculatedNewPctStaked);
        lastUpdateTime = poolInfo.lastUpdateTime;
      });
    });

    describe("withdraw()", () => {
      let tx: ContractTransaction;
      before(async () => {
        // increase time to 100s before season- 1 endTime
        await mineBlock(
          (await liquidityMining.getSeasonInfo(1)).endTime.toNumber() - 100
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
        const seasonInfo = await liquidityMining.getSeasonInfo(1);
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

        expect(poolInfo.seasonId).to.equal(1);
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
    });
  });
};

setup().then(() => {
  run();
});
