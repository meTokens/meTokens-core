import { ethers, getNamedAccounts, network } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Signer, BigNumber, ContractTransaction } from "ethers";
import { expect } from "chai";
import { deploy, getContractAt, toETHNumber } from "../../../utils/helpers";
import { mineBlock, setNextBlockTimestamp } from "../../../utils/hardhatNode";
import { hubSetup } from "../../../utils/hubSetup";
import {
  FoundryFacet,
  MeTokenRegistryFacet,
  MeToken,
  ERC20,
  SingleAssetVault,
  LiquidityMiningFacet,
  MockERC20,
} from "../../../../artifacts/types";
import { MerkleTree } from "../../../utils/merkleTree";

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
    let meToken0: MeToken;
    let meToken1: MeToken;
    let whale: Signer;
    let liquidityMining: LiquidityMiningFacet;
    let singleAssetVault: SingleAssetVault;
    let encodedCurveInfo: string;
    let encodedVaultArgs: string;
    let mockToken: MockERC20;
    let merkleTree: MerkleTree;
    let merkleRoot: any;
    let lastUpdateTime: BigNumber;

    const hubId = 1;
    const name0 = "Carl meToken";
    const symbol0 = "CARL";
    const name1 = "Ben meToken";
    const symbol1 = "ZGO";
    const initRefundRatio = 50000;
    const PRECISION = ethers.utils.parseEther("1");
    const amount1 = ethers.utils.parseEther("100");
    const tokenDepositedInETH = 100;
    const tokenDeposited = ethers.utils.parseEther(
      tokenDepositedInETH.toString()
    );

    const warmup = 2 * 60 * 24 * 24; // 2 days
    const duration = 4 * 60 * 24 * 24; // 4 days
    const issuerCooldown = 4 * 60 * 24 * 24; // 4 days

    const allocationPool = ethers.utils.parseEther("20");
    const allocationIssuers = ethers.utils.parseEther("10");
    const BASE = ethers.utils.parseUnits("1", 54);

    let snapshotId: any;
    before(async () => {
      snapshotId = await network.provider.send("evm_snapshot");
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

      // Create meToken for account0 and account1
      await meTokenRegistry
        .connect(account0)
        .subscribe(name0, symbol0, hubId, 0);
      await meTokenRegistry
        .connect(account1)
        .subscribe(name1, symbol1, hubId, 0);
      const meTokenAddr0 = await meTokenRegistry.getOwnerMeToken(
        account0.address
      );
      const meTokenAddr1 = await meTokenRegistry.getOwnerMeToken(
        account1.address
      );
      meToken0 = await getContractAt<MeToken>("MeToken", meTokenAddr0);
      meToken1 = await getContractAt<MeToken>("MeToken", meTokenAddr1);

      await foundry.mint(meToken0.address, tokenDeposited, account0.address);
      await mockToken.setBalance(
        account0.address,
        ethers.utils.parseEther("1000")
      );
      await mockToken.approve(
        liquidityMining.address,
        ethers.constants.MaxUint256
      );

      const whitelist = [meToken0.address, meToken1.address];
      merkleTree = new MerkleTree(whitelist);
      merkleRoot = merkleTree.getHexRoot();
    });

    // TODO check initialised variables
    describe("Initial States", () => {
      it("State check", async () => {
        const poolInfo = await liquidityMining.getPoolInfo(
          meToken0.address,
          ethers.constants.AddressZero
        );
        const seasonInfo = await liquidityMining.getSeasonInfo();

        expect(await liquidityMining.getIssuerCooldown()).to.equal(0);
        expect(await liquidityMining.getLMWarmup()).to.equal(0);
        expect(await liquidityMining.getLMWarmup()).to.equal(0);

        expect(poolInfo.seasonMerkleRoot).to.equal(ethers.constants.HashZero);
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

    describe("initSeason()", () => {
      it("should be able to initSeason", async () => {
        expect(
          await liquidityMining.canTokenBeFeaturedInNewSeason(mockToken.address)
        ).to.equal(false);
        expect(
          await liquidityMining.canTokenBeFeaturedInNewSeason(meToken0.address)
        ).to.equal(true);
        const initTime =
          (await ethers.provider.getBlock("latest")).timestamp + 1;
        const bSenderBalance = await mockToken.balanceOf(account0.address);
        const bLMBalance = await mockToken.balanceOf(liquidityMining.address);

        await liquidityMining.initSeason(
          initTime,
          allocationPool,
          allocationIssuers,
          merkleRoot
        );

        const aSenderBalance = await mockToken.balanceOf(account0.address);
        const aLMBalance = await mockToken.balanceOf(liquidityMining.address);
        const seasonInfo = await liquidityMining.getSeasonInfo();

        expect(bSenderBalance.sub(aSenderBalance))
          .to.equal(allocationPool.add(allocationIssuers))
          .to.equal(aLMBalance.sub(bLMBalance));

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
      it("Pool is uninitialized before stake", async () => {
        const poolInfo = await liquidityMining.getPoolInfo(
          meToken0.address,
          account0.address
        );
        expect(poolInfo.seasonMerkleRoot).to.equal(ethers.constants.HashZero);
        expect(poolInfo.lastUpdateTime).to.equal(0);
        expect(poolInfo.rewardPerTokenStored).to.equal(0);
        expect(poolInfo.userRewardPerTokenPaid).to.equal(0);
        expect(poolInfo.rewards).to.equal(0);
      });
    });

    describe("isMeTokenInSeason()", () => {
      it("should return true if a metoken is present in a season", async () => {
        expect(
          await liquidityMining.isMeTokenInSeason(
            meToken0.address,
            merkleTree.getHexProof(meToken0.address)
          )
        ).to.equal(true);
        expect(
          await liquidityMining.isMeTokenInSeason(
            meToken1.address,
            merkleTree.getHexProof(meToken1.address)
          )
        ).to.equal(true);
      });
      it("should return false if a metoken is present in a season", async () => {
        expect(
          await liquidityMining.isMeTokenInSeason(
            account0.address, // wrong token address
            merkleTree.getHexProof(meToken0.address)
          )
        ).to.equal(false);
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
