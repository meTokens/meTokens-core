import { ethers, getNamedAccounts } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Signer, BigNumber } from "ethers";
import { expect } from "chai";
import {
  calculateCollateralReturned,
  calculateCollateralToDepositFromZero,
  calculateTokenReturned,
  calculateTokenReturnedFromZero,
  deploy,
  fromETHNumber,
  getContractAt,
  toETHNumber,
} from "../../utils/helpers";
import { mineBlock } from "../../utils/hardhatNode";
import { hubSetup } from "../../utils/hubSetup";
import {
  ICurve,
  HubFacet,
  FoundryFacet,
  MeTokenRegistryFacet,
  MeToken,
  ERC20,
  MigrationRegistry,
  CurveRegistry,
  SingleAssetVault,
  BancorCurve,
  UniswapSingleTransferMigration,
  SameAssetTransferMigration,
  IERC20Permit,
  LiquidityMiningFacet,
  MockERC20,
} from "../../../artifacts/types";
import { TypedDataDomain } from "@ethersproject/abstract-signer";
import { domainSeparator } from "../../utils/eip712";

const setup = async () => {
  describe("LiquidityMiningFacet.sol", () => {
    let DAI: string;
    let dai: ERC20;
    let WETH: string;
    let weth: ERC20;
    let usdc: ERC20;
    let usdcPermit: IERC20Permit;
    let USDC: string;
    let USDCWhale: string;
    let account0: SignerWithAddress;
    let account1: SignerWithAddress;
    let account2: SignerWithAddress;
    let curve: ICurve;
    let meTokenRegistry: MeTokenRegistryFacet;
    let foundry: FoundryFacet;
    let token: ERC20;
    let meToken: MeToken;
    let tokenHolder: Signer;
    let hub: HubFacet;
    let liquidityMining: LiquidityMiningFacet;
    let singleAssetVault: SingleAssetVault;
    let migrationRegistry: MigrationRegistry;
    let curveRegistry: CurveRegistry;
    let encodedCurveInfo: string;
    let encodedVaultArgs: string;
    let mockToken: MockERC20;

    const hubId = 1;
    const usdcDoaminSeparator =
      "0x19d64970ae67135faab873f0abe76a5ee18734cb628c32659f75b220300d19a5";
    const name = "Carl meToken";
    const symbol = "CARL";
    const refundRatio = 240000;
    const value = ethers.utils.parseUnits("100", 6);
    const initRefundRatio = 50000;
    const PRECISION = ethers.utils.parseEther("1");
    const amount = ethers.utils.parseEther("10");
    const amount1 = ethers.utils.parseEther("100");
    const tokenDepositedInETH = 10;
    const tokenDeposited = ethers.utils.parseEther(
      tokenDepositedInETH.toString()
    );
    const fee = 3000;

    const warmup = 2 * 60 * 24 * 24; // 2 days
    const duration = 4 * 60 * 24 * 24; // 4 days
    const issuerCooldown = 4 * 60 * 24 * 24; // 4 days

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
        tokenHolder,
        hub,
        liquidityMining,
        curve,
        foundry,
        singleAssetVault,
        curveRegistry,
        migrationRegistry,
        meTokenRegistry,
        account0,
        account1,
        account2,
        mockToken,
      } = await hubSetup(
        encodedCurveInfo,
        encodedVaultArgs,
        initRefundRatio,
        "BancorCurve"
      ));

      // Prefund owner/buyer w/ DAI
      dai = token;
      weth = await getContractAt<ERC20>("ERC20", WETH);

      await dai
        .connect(tokenHolder)
        .transfer(account0.address, amount1.mul(10));
      await weth
        .connect(tokenHolder)
        .transfer(account0.address, amount1.mul(10));
      await dai
        .connect(tokenHolder)
        .transfer(account1.address, amount1.mul(10));
      await dai
        .connect(tokenHolder)
        .transfer(account2.address, amount1.mul(10));
      const max = ethers.constants.MaxUint256;
      await dai.connect(account0).approve(singleAssetVault.address, max);
      await weth.connect(account0).approve(singleAssetVault.address, max);
      await dai.connect(account1).approve(singleAssetVault.address, max);
      await dai.connect(account2).approve(singleAssetVault.address, max);
      await dai.connect(account1).approve(meTokenRegistry.address, max);
      // account0 is registering a metoken
      await meTokenRegistry.connect(account0).subscribe(name, symbol, hubId, 0);
      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account0.address
      );

      meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);
    });

    // TODO check initialised variables
    describe("Initial States", () => {
      it("State check", async () => {
        const poolInfo = await liquidityMining.getPoolInfo(meToken.address);
        const seasonInfo = await liquidityMining.getSeasonInfo(0);

        expect((await liquidityMining.getIssuerCooldown()).toNumber()).to.equal(
          0
        );
        expect((await liquidityMining.getLMWarmup()).toNumber()).to.equal(0);
        expect((await liquidityMining.getLMWarmup()).toNumber()).to.equal(0);
        expect((await liquidityMining.getSeasonCount()).toNumber()).to.equal(0);

        expect(poolInfo.seasonId.toNumber()).to.equal(0);
        expect(poolInfo.pendingIssuerRewards.toNumber()).to.equal(0);
        expect(poolInfo.pendingIssuerRewardsAdded).to.equal(false);
        expect(poolInfo.lastUpdateTime.toNumber()).to.equal(0);
        expect(poolInfo.totalSupply.toNumber()).to.equal(0);
        expect(poolInfo.lastCirculatingSupply.toNumber()).to.equal(0);
        expect(poolInfo.rewardPerTokenStored.toNumber()).to.equal(0);

        expect(seasonInfo.initTime.toNumber()).to.equal(0);
        expect(seasonInfo.startTime.toNumber()).to.equal(0);
        expect(seasonInfo.endTime.toNumber()).to.equal(0);
        expect(seasonInfo.allocationPool.toNumber()).to.equal(0);
        expect(seasonInfo.allocationIssuers.toNumber()).to.equal(0);
        expect(seasonInfo.totalPctStaked.toNumber()).to.equal(0);
        expect(seasonInfo.rewardRate.toNumber()).to.equal(0);
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
      xit("revert when sender is not liquidityMiningController", async () => {});
      xit("should be able to initSeason", async () => {
        const block = await ethers.provider.getBlock("latest");
        // Add mock me token
        const initTime = block.timestamp;

        await mockToken.setBalance(
          account0.address,
          ethers.utils.parseEther("100")
        );
        await mockToken.approve(
          liquidityMining.address,
          ethers.constants.MaxUint256
        );

        await liquidityMining.initSeason(
          initTime,
          ethers.utils.parseEther("1"),
          ethers.utils.parseEther("1"),
          ethers.constants.HashZero
        );
      });
    });
  });
};

setup().then(() => {
  run();
});
