import { ethers, getNamedAccounts } from "hardhat";
import { hubSetup } from "../../utils/hubSetup";
import {
  calculateCollateralReturned,
  deploy,
  getContractAt,
  toETHNumber,
  weightedAverageSimulation,
  calculateTokenReturnedFromZero,
  fromETHNumber,
} from "../../utils/helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, Signer } from "ethers";
import { ERC20 } from "../../../artifacts/types/ERC20";
import { FoundryFacet } from "../../../artifacts/types/FoundryFacet";
import { HubFacet } from "../../../artifacts/types/HubFacet";
import { MeTokenRegistryFacet } from "../../../artifacts/types/MeTokenRegistryFacet";
import { MigrationRegistry } from "../../../artifacts/types/MigrationRegistry";
import { expect } from "chai";
import { MeToken } from "../../../artifacts/types/MeToken";
import { UniswapSingleTransferMigration } from "../../../artifacts/types/UniswapSingleTransferMigration";
import { SingleAssetVault } from "../../../artifacts/types/SingleAssetVault";
import { mineBlock, setAutomine } from "../../utils/hardhatNode";
import { FeesFacet } from "../../../artifacts/types/FeesFacet";
import Decimal from "decimal.js";
import { ICurve } from "../../../artifacts/types";

const setup = async () => {
  describe("MeToken Resubscribe - Same curve, new Curve Details", () => {
    let meTokenRegistry: MeTokenRegistryFacet;
    let curve: ICurve;
    let migrationRegistry: MigrationRegistry;
    let migration: UniswapSingleTransferMigration;
    let singleAssetVault: SingleAssetVault;
    let foundry: FoundryFacet;
    let hub: HubFacet;
    let tokenHolder: Signer;
    let dai: ERC20;
    let weth: ERC20;
    let daiWhale: Signer;
    let meToken: MeToken;
    let account0: SignerWithAddress;
    let account1: SignerWithAddress;
    let encodedCurveDetails1: string;
    let encodedCurveDetails2: string;
    let fees: FeesFacet;

    const hubId1 = 1;
    const hubId2 = 2;
    const hubWarmup = 7 * 60 * 24 * 24; // 1 week
    const warmup = 2 * 60 * 24 * 24; // 2 days
    const duration = 4 * 60 * 24 * 24; // 4 days
    const coolDown = 5 * 60 * 24 * 24; // 5 days
    const MAX_WEIGHT = 1000000;
    const PRECISION = BigNumber.from(10).pow(18);
    const baseY1 = PRECISION.div(1000);
    const baseY2 = PRECISION.div(50);
    const reserveWeight1 = MAX_WEIGHT / 10;
    const reserveWeight2 = MAX_WEIGHT / 2;
    const refundRatio = 5000;
    const fee = 3000;
    const tokenDepositedInETH = 100;
    const tokenDeposited = ethers.utils.parseEther(
      tokenDepositedInETH.toString()
    );
    const burnOwnerFee = 1e8;
    const burnBuyerFee = 1e9;

    before(async () => {
      let token: ERC20;
      let DAI, WETH;
      ({ DAI, WETH } = await getNamedAccounts());

      const encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [DAI]
      );
      encodedCurveDetails1 = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint32"],
        [baseY1, reserveWeight1]
      );
      encodedCurveDetails2 = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint32"],
        [baseY2, reserveWeight2]
      );
      const block = await ethers.provider.getBlock("latest");
      const earliestSwapTime = block.timestamp + 600 * 60; // 10h in future
      const encodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint24"],
        [earliestSwapTime, fee]
      );

      // Register first and second hub

      ({
        token,
        tokenHolder,
        hub,
        foundry,
        curve,
        migrationRegistry,
        singleAssetVault,
        account0,
        account1,
        meTokenRegistry,
        fee: fees,
      } = await hubSetup(
        encodedCurveDetails1,
        encodedVaultArgs,
        refundRatio,
        "BancorCurve"
      ));
      dai = token;
      weth = await getContractAt<ERC20>("ERC20", WETH);
      daiWhale = tokenHolder;

      await hub.register(
        account0.address,
        WETH,
        singleAssetVault.address,
        curve.address,
        refundRatio,
        encodedCurveDetails2,
        encodedVaultArgs
      );

      // set update/resubscribe times
      await hub.setHubWarmup(hubWarmup);
      await meTokenRegistry.setMeTokenWarmup(warmup);
      await meTokenRegistry.setMeTokenDuration(duration);
      await meTokenRegistry.setMeTokenCooldown(coolDown);
      await fees.setBurnOwnerFee(burnOwnerFee);
      await fees.setBurnBuyerFee(burnBuyerFee);

      // Deploy uniswap migration and approve it to the registry
      migration = await deploy<UniswapSingleTransferMigration>(
        "UniswapSingleTransferMigration",
        undefined,
        account0.address,
        hub.address // diamond
      );
      await migrationRegistry.approve(
        singleAssetVault.address,
        singleAssetVault.address,
        migration.address
      );

      // Pre-load owner and buyer w/ DAI & WETH
      await dai
        .connect(daiWhale)
        .transfer(account1.address, ethers.utils.parseEther("500"));

      await weth
        .connect(tokenHolder)
        .transfer(account1.address, ethers.utils.parseEther("500"));

      // Create meToken and subscribe to Hub1
      const name = "Carl meToken";
      const symbol = "CARL";
      await meTokenRegistry
        .connect(account0)
        .subscribe(name, symbol, hubId1, 0);
      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account0.address
      );
      meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);

      // initialize resubscription to hub 2
      await meTokenRegistry
        .connect(account0)
        .initResubscribe(
          meTokenAddr,
          hubId2,
          migration.address,
          encodedMigrationArgs
        );

      const max = ethers.constants.MaxUint256;
      await dai.connect(account0).approve(singleAssetVault.address, max);
      await dai.connect(account1).approve(singleAssetVault.address, max);
      await dai.connect(account0).approve(migration.address, max);
      await dai.connect(account0).approve(migration.address, max);
      await weth.connect(account0).approve(migration.address, max);
      await weth.connect(account1).approve(migration.address, max);
      await weth.connect(account0).approve(singleAssetVault.address, max);
      await weth.connect(account1).approve(singleAssetVault.address, max);
    });

    describe("Warmup", () => {
      before(async () => {
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        const block = await ethers.provider.getBlock("latest");
        expect(meTokenInfo.startTime).to.be.gt(block.timestamp);
      });
      it("mint() [buyer]: meTokens received based on initial Curve info", async () => {
        const vaultDAIBefore = await dai.balanceOf(singleAssetVault.address);
        const meTokenTotalSupplyBefore = await meToken.totalSupply();
        expect(meTokenTotalSupplyBefore).to.be.equal(0);

        const calculatedReturn = calculateTokenReturnedFromZero(
          tokenDepositedInETH,
          toETHNumber(baseY1),
          reserveWeight1 / MAX_WEIGHT
        );

        await foundry
          .connect(account1)
          .mint(meToken.address, tokenDeposited, account0.address);

        const ownerMeTokenAfter = await meToken.balanceOf(account0.address);
        const vaultDAIAfter = await dai.balanceOf(singleAssetVault.address);
        const meTokenTotalSupplyAfter = await meToken.totalSupply();

        expect(toETHNumber(ownerMeTokenAfter)).to.be.approximately(
          calculatedReturn,
          1e-15
        );
        expect(meTokenTotalSupplyAfter).to.be.equal(ownerMeTokenAfter);
        expect(vaultDAIAfter.sub(vaultDAIBefore)).to.equal(tokenDeposited);
      });
      it("burn() [buyer]: assets received based on initial Curve info", async () => {
        const ownerMeToken = await meToken.balanceOf(account0.address);
        await meToken.transfer(account1.address, ownerMeToken.div(2));
        const buyerMeToken = await meToken.balanceOf(account1.address);
        expect(buyerMeToken).to.be.equal(ownerMeToken.div(2));

        const vaultDAIBefore = await dai.balanceOf(singleAssetVault.address);
        const meTokenTotalSupply = await meToken.totalSupply();
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        const buyerDAIBefore = await dai.balanceOf(account1.address);

        const rawAssetsReturned = calculateCollateralReturned(
          toETHNumber(buyerMeToken),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenInfo.balancePooled),
          reserveWeight1 / MAX_WEIGHT
        );
        const assetsReturned = (rawAssetsReturned * refundRatio) / MAX_WEIGHT;

        await foundry
          .connect(account1)
          .burn(meToken.address, buyerMeToken, account1.address);

        const buyerMeTokenAfter = await meToken.balanceOf(account1.address);
        const buyerDAIAfter = await dai.balanceOf(account1.address);
        const vaultDAIAfter = await dai.balanceOf(singleAssetVault.address);
        const meTokenTotalSupplyAfter = await meToken.totalSupply();

        const burnFee = toETHNumber(
          (await fees.burnBuyerFee())
            .mul(fromETHNumber(assetsReturned))
            .div(PRECISION)
        );

        expect(
          toETHNumber(buyerDAIAfter.sub(buyerDAIBefore))
        ).to.be.approximately(
          new Decimal(assetsReturned).sub(new Decimal(burnFee)).toNumber(),
          1e-15
        );
        expect(buyerMeTokenAfter).to.equal(0);
        expect(toETHNumber(meTokenTotalSupplyAfter)).to.be.approximately(
          toETHNumber(meTokenTotalSupply.div(2)),
          1e-18
        );
        expect(
          toETHNumber(vaultDAIBefore.sub(vaultDAIAfter))
        ).to.be.approximately(
          new Decimal(assetsReturned).sub(new Decimal(burnFee)).toNumber(),
          1e-15
        );
      });
      it("burn() [owner]: assets received based on initial Curve info", async () => {
        const ownerMeToken = await meToken.balanceOf(account0.address);
        const vaultDAIBefore = await dai.balanceOf(singleAssetVault.address);
        const meTokenTotalSupply = await meToken.totalSupply();
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        const ownerDAIBefore = await dai.balanceOf(account0.address);

        const rawAssetsReturned = calculateCollateralReturned(
          toETHNumber(ownerMeToken),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenInfo.balancePooled),
          reserveWeight1 / MAX_WEIGHT
        );
        const assetsReturned =
          rawAssetsReturned +
          (toETHNumber(ownerMeToken) / toETHNumber(meTokenTotalSupply)) *
            toETHNumber(meTokenInfo.balanceLocked);

        await foundry
          .connect(account0)
          .burn(meToken.address, ownerMeToken, account0.address);

        const ownerMeTokenAfter = await meToken.balanceOf(account0.address);
        const ownerDAIAfter = await dai.balanceOf(account0.address);
        const vaultDAIAfter = await dai.balanceOf(singleAssetVault.address);
        const meTokenTotalSupplyAfter = await meToken.totalSupply();

        const burnFee = toETHNumber(
          (await fees.burnOwnerFee())
            .mul(fromETHNumber(assetsReturned))
            .div(PRECISION)
        );

        expect(vaultDAIBefore.sub(vaultDAIAfter)).to.equal(
          ownerDAIAfter.sub(ownerDAIBefore)
        );
        expect(
          toETHNumber(ownerDAIAfter.sub(ownerDAIBefore))
        ).to.be.approximately(
          new Decimal(assetsReturned).sub(new Decimal(burnFee)).toNumber(),
          1e-15
        );
        expect(ownerMeTokenAfter).to.equal(0);
        expect(toETHNumber(meTokenTotalSupplyAfter)).to.equal(0);
      });
    });

    describe("Duration", () => {
      before(async () => {
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        await mineBlock(meTokenInfo.startTime.toNumber() + 2);

        const block = await ethers.provider.getBlock("latest");
        expect(meTokenInfo.startTime).to.be.lt(block.timestamp);
      });
      it("mint() [buyer]: meTokens received based on weighted average curve info", async () => {
        const vaultDAIBefore = await dai.balanceOf(singleAssetVault.address);
        const migrationWETHBefore = await weth.balanceOf(migration.address);
        const meTokenTotalSupplyBefore = await meToken.totalSupply();
        expect(meTokenTotalSupplyBefore).to.be.equal(0);
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );

        await setAutomine(false);
        const block = await ethers.provider.getBlock("latest");

        const calculatedReturn = calculateTokenReturnedFromZero(
          tokenDepositedInETH,
          toETHNumber(baseY1),
          reserveWeight1 / MAX_WEIGHT
        );
        const calculatedTargetReturn = calculateTokenReturnedFromZero(
          tokenDepositedInETH,
          toETHNumber(baseY2),
          reserveWeight2 / MAX_WEIGHT
        );

        const calcWAvgRe = weightedAverageSimulation(
          calculatedReturn,
          calculatedTargetReturn,
          meTokenInfo.startTime.toNumber(),
          meTokenInfo.endTime.toNumber(),
          block.timestamp + 1
        );

        await foundry
          .connect(account1)
          .mint(meToken.address, tokenDeposited, account0.address);

        await mineBlock(block.timestamp + 1);
        await setAutomine(true);

        const ownerMeTokenAfter = await meToken.balanceOf(account0.address);
        const vaultDAIAfter = await dai.balanceOf(singleAssetVault.address);
        const migrationWETHAfter = await weth.balanceOf(migration.address);
        const meTokenTotalSupplyAfter = await meToken.totalSupply();

        expect(toETHNumber(ownerMeTokenAfter)).to.be.approximately(
          calcWAvgRe,
          1e-15
        );
        expect(meTokenTotalSupplyAfter).to.be.equal(ownerMeTokenAfter);
        expect(vaultDAIAfter.sub(vaultDAIBefore)).to.equal(0); // new asset goes to migration
        expect(migrationWETHAfter.sub(migrationWETHBefore)).to.equal(
          tokenDeposited
        ); // new asset is WETH
      });
      it("burn() [buyer]: assets received based on weighted average Curve info", async () => {
        const ownerMeToken = await meToken.balanceOf(account0.address);
        await meToken.transfer(account1.address, ownerMeToken.div(2));
        const buyerMeToken = await meToken.balanceOf(account1.address);
        expect(buyerMeToken).to.be.equal(ownerMeToken.div(2));

        const migrationWETHBefore = await weth.balanceOf(migration.address);
        const meTokenTotalSupply = await meToken.totalSupply();
        const buyerWETHBefore = await weth.balanceOf(account1.address);
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );

        await setAutomine(false);
        const block = await ethers.provider.getBlock("latest");
        const rawAssetsReturned = calculateCollateralReturned(
          toETHNumber(buyerMeToken),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenInfo.balancePooled),
          reserveWeight1 / MAX_WEIGHT
        );
        const targetAssetsReturned = calculateCollateralReturned(
          toETHNumber(buyerMeToken),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenInfo.balancePooled),
          reserveWeight2 / MAX_WEIGHT
        );

        await foundry
          .connect(account1)
          .burn(meToken.address, buyerMeToken, account1.address);

        const calcWAvgRes = weightedAverageSimulation(
          rawAssetsReturned,
          targetAssetsReturned,
          meTokenInfo.startTime.toNumber(),
          meTokenInfo.endTime.toNumber(),
          block.timestamp + 1
        );

        const assetsReturned = (calcWAvgRes * refundRatio) / MAX_WEIGHT;

        await mineBlock(block.timestamp + 1);
        await setAutomine(true);

        const buyerMeTokenAfter = await meToken.balanceOf(account1.address);
        const buyerWETHAfter = await weth.balanceOf(account1.address);
        const migrationWETHAfter = await weth.balanceOf(migration.address);
        const meTokenTotalSupplyAfter = await meToken.totalSupply();

        const burnFee = toETHNumber(
          (await fees.burnBuyerFee())
            .mul(fromETHNumber(assetsReturned))
            .div(PRECISION)
        );

        expect(
          toETHNumber(buyerWETHAfter.sub(buyerWETHBefore))
        ).to.be.approximately(
          new Decimal(assetsReturned).sub(new Decimal(burnFee)).toNumber(),
          1e-15
        );
        expect(buyerMeTokenAfter).to.equal(0);
        expect(toETHNumber(meTokenTotalSupplyAfter)).to.be.approximately(
          toETHNumber(meTokenTotalSupply.div(2)),
          1e-18
        );
        expect(
          toETHNumber(migrationWETHBefore.sub(migrationWETHAfter))
        ).to.approximately(
          new Decimal(assetsReturned).sub(new Decimal(burnFee)).toNumber(),
          1e-15
        );
      });
      it("burn() [owner]: assets received based on weighted average Curve info", async () => {
        const ownerMeToken = await meToken.balanceOf(account0.address);
        const migrationWETHBefore = await weth.balanceOf(migration.address);
        const meTokenTotalSupply = await meToken.totalSupply();
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        const ownerWETHBefore = await weth.balanceOf(account0.address);

        await setAutomine(false);
        const block = await ethers.provider.getBlock("latest");

        const rawAssetsReturned = calculateCollateralReturned(
          toETHNumber(ownerMeToken),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenInfo.balancePooled),
          reserveWeight1 / MAX_WEIGHT
        );
        const targetAssetsReturned = calculateCollateralReturned(
          toETHNumber(ownerMeToken),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenInfo.balancePooled),
          reserveWeight2 / MAX_WEIGHT
        );

        const calcWAvgRes = weightedAverageSimulation(
          rawAssetsReturned,
          targetAssetsReturned,
          meTokenInfo.startTime.toNumber(),
          meTokenInfo.endTime.toNumber(),
          block.timestamp + 1
        );
        const assetsReturned =
          calcWAvgRes +
          (toETHNumber(ownerMeToken) / toETHNumber(meTokenTotalSupply)) *
            toETHNumber(meTokenInfo.balanceLocked);

        await foundry
          .connect(account0)
          .burn(meToken.address, ownerMeToken.sub(1), account0.address);

        await mineBlock(block.timestamp + 1);
        await setAutomine(true);
        const ownerMeTokenAfter = await meToken.balanceOf(account0.address);
        const ownerWETHAfter = await weth.balanceOf(account0.address);
        const migrationWETHAfter = await weth.balanceOf(migration.address);
        const meTokenTotalSupplyAfter = await meToken.totalSupply();

        const burnFee = toETHNumber(
          (await fees.burnOwnerFee())
            .mul(fromETHNumber(assetsReturned))
            .div(PRECISION)
        );

        expect(migrationWETHBefore.sub(migrationWETHAfter)).to.equal(
          ownerWETHAfter.sub(ownerWETHBefore)
        );
        expect(
          toETHNumber(ownerWETHAfter.sub(ownerWETHBefore))
        ).to.be.approximately(
          new Decimal(assetsReturned).sub(new Decimal(burnFee)).toNumber(),
          1e-15
        );
        expect(ownerMeTokenAfter).to.equal(1);
        expect(meTokenTotalSupplyAfter).to.equal(1);
      });
    });

    describe("Cooldown", () => {
      before(async () => {
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        await mineBlock(meTokenInfo.endTime.toNumber() + 2);

        const block = await ethers.provider.getBlock("latest");
        expect(meTokenInfo.endTime).to.be.lt(block.timestamp);
      });
      it("burn() [buyer]: finish migration must be called", async () => {
        const ownerMeToken = await meToken.balanceOf(account0.address);
        const migrationWETHBefore = await weth.balanceOf(migration.address);
        const meTokenTotalSupply = await meToken.totalSupply();
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        const ownerWETHBefore = await weth.balanceOf(account0.address);

        await setAutomine(false);
        const block = await ethers.provider.getBlock("latest");

        const targetAssetsReturned = calculateCollateralReturned(
          toETHNumber(ownerMeToken),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenInfo.balancePooled),
          reserveWeight2 / MAX_WEIGHT
        );

        const assetsReturned =
          targetAssetsReturned +
          (toETHNumber(ownerMeToken) / toETHNumber(meTokenTotalSupply)) *
            toETHNumber(meTokenInfo.balanceLocked);

        await foundry
          .connect(account0)
          .burn(meToken.address, ownerMeToken, account0.address);
        await mineBlock(block.timestamp + 1);
        await setAutomine(true);

        const ownerMeTokenAfter = await meToken.balanceOf(account0.address);
        const ownerWETHAfter = await weth.balanceOf(account0.address);
        const migrationWETHAfter = await weth.balanceOf(migration.address);
        const meTokenTotalSupplyAfter = await meToken.totalSupply();

        expect(migrationWETHBefore.sub(migrationWETHAfter)).to.equal(
          ownerWETHAfter.sub(ownerWETHBefore)
        );
        expect(
          toETHNumber(ownerWETHAfter.sub(ownerWETHBefore))
        ).to.be.approximately(assetsReturned, 0.000000000000001);
        expect(ownerMeTokenAfter).to.equal(0);
        expect(toETHNumber(meTokenTotalSupplyAfter)).to.equal(0);
      });
      it("mint(): assets received based on target Curve info", async () => {
        const vaultWETHBefore = await weth.balanceOf(singleAssetVault.address);
        const migrationWETHBefore = await weth.balanceOf(migration.address);
        const meTokenTotalSupplyBefore = await meToken.totalSupply();
        expect(meTokenTotalSupplyBefore).to.be.equal(0);

        const calculatedTargetReturn = calculateTokenReturnedFromZero(
          tokenDepositedInETH,
          toETHNumber(baseY2),
          reserveWeight2 / MAX_WEIGHT
        );

        await foundry
          .connect(account1)
          .mint(meToken.address, tokenDeposited, account0.address);

        const ownerMeTokenAfter = await meToken.balanceOf(account0.address);
        const vaultWETHAfter = await weth.balanceOf(singleAssetVault.address);
        const migrationWETHAfter = await weth.balanceOf(migration.address);
        const meTokenTotalSupplyAfter = await meToken.totalSupply();

        expect(toETHNumber(ownerMeTokenAfter)).to.be.approximately(
          calculatedTargetReturn,
          1e-15
        );
        expect(meTokenTotalSupplyAfter).to.be.equal(ownerMeTokenAfter);
        expect(vaultWETHAfter.sub(vaultWETHBefore)).to.equal(tokenDeposited);
        expect(migrationWETHAfter.sub(migrationWETHBefore)).to.equal(0);
      });
      it("burn() [buyer]: assets received based on target Curve info", async () => {
        const ownerMeToken = await meToken.balanceOf(account0.address);
        await meToken.transfer(account1.address, ownerMeToken.div(2));
        const buyerMeToken = await meToken.balanceOf(account1.address);
        expect(buyerMeToken).to.be.equal(ownerMeToken.div(2));

        const vaultWETHBefore = await weth.balanceOf(singleAssetVault.address);
        const meTokenTotalSupply = await meToken.totalSupply();
        const buyerWETHBefore = await weth.balanceOf(account1.address);
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );

        const targetAssetsReturned = calculateCollateralReturned(
          toETHNumber(buyerMeToken),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenInfo.balancePooled),
          reserveWeight2 / MAX_WEIGHT
        );

        await foundry
          .connect(account1)
          .burn(meToken.address, buyerMeToken, account1.address);

        const assetsReturned =
          (targetAssetsReturned * refundRatio) / MAX_WEIGHT;

        const buyerMeTokenAfter = await meToken.balanceOf(account1.address);
        const buyerWETHAfter = await weth.balanceOf(account1.address);
        const vaultWETHAfter = await weth.balanceOf(singleAssetVault.address);
        const meTokenTotalSupplyAfter = await meToken.totalSupply();

        const burnFee = toETHNumber(
          (await fees.burnBuyerFee())
            .mul(fromETHNumber(assetsReturned))
            .div(PRECISION)
        );

        expect(
          toETHNumber(buyerWETHAfter.sub(buyerWETHBefore))
        ).to.be.approximately(
          new Decimal(assetsReturned).sub(new Decimal(burnFee)).toNumber(),
          1e-15
        );
        expect(buyerMeTokenAfter).to.equal(0);
        expect(toETHNumber(meTokenTotalSupplyAfter)).to.be.approximately(
          toETHNumber(meTokenTotalSupply.div(2)),
          1e-18
        );
        expect(
          toETHNumber(vaultWETHBefore.sub(vaultWETHAfter))
        ).to.approximately(
          new Decimal(assetsReturned).sub(new Decimal(burnFee)).toNumber(),
          1e-15
        );
      });
      it("burn() [owner]: assets received based on target Curve info", async () => {
        const ownerMeToken = await meToken.balanceOf(account0.address);
        const vaultWETHBefore = await weth.balanceOf(singleAssetVault.address);
        const meTokenTotalSupply = await meToken.totalSupply();
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        const ownerWETHBefore = await weth.balanceOf(account0.address);

        const targetAssetsReturned = calculateCollateralReturned(
          toETHNumber(ownerMeToken),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenInfo.balancePooled),
          reserveWeight2 / MAX_WEIGHT
        );

        await foundry
          .connect(account0)
          .burn(meToken.address, ownerMeToken, account0.address);

        const assetsReturned =
          targetAssetsReturned +
          (toETHNumber(ownerMeToken) / toETHNumber(meTokenTotalSupply)) *
            toETHNumber(meTokenInfo.balanceLocked);

        const ownerMeTokenAfter = await meToken.balanceOf(account0.address);
        const ownerWETHAfter = await weth.balanceOf(account0.address);
        const vaultWETHAfter = await weth.balanceOf(singleAssetVault.address);
        const meTokenTotalSupplyAfter = await meToken.totalSupply();

        const burnFee = toETHNumber(
          (await fees.burnOwnerFee())
            .mul(fromETHNumber(assetsReturned))
            .div(PRECISION)
        );

        expect(vaultWETHBefore.sub(vaultWETHAfter)).to.equal(
          ownerWETHAfter.sub(ownerWETHBefore)
        );
        expect(
          toETHNumber(ownerWETHAfter.sub(ownerWETHBefore))
        ).to.be.approximately(
          new Decimal(assetsReturned).sub(new Decimal(burnFee)).toNumber(),
          1e-15
        );
        expect(ownerMeTokenAfter).to.equal(0);
        expect(toETHNumber(meTokenTotalSupplyAfter)).to.equal(0);
      });
    });
  });
};

setup().then(() => {
  run();
});
