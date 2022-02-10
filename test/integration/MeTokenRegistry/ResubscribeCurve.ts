import { ethers, getNamedAccounts } from "hardhat";
import { hubSetup } from "../../utils/hubSetup";
import {
  calculateCollateralReturned,
  deploy,
  getContractAt,
  toETHNumber,
  weightedAverageSimulation,
  calculateTokenReturnedFromZero,
  calculateStepwiseTokenReturned,
  calculateStepwiseCollateralReturned,
  fromETHNumber,
} from "../../utils/helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, Signer } from "ethers";
import { CurveRegistry } from "../../../artifacts/types/CurveRegistry";
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
import { StepwiseCurveABDK } from "../../../artifacts/types";

const setup = async () => {
  describe("MeToken Resubscribe - new curve", () => {
    let meTokenRegistry: MeTokenRegistryFacet;
    let stepwiseCurveABDK: StepwiseCurveABDK;
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
    let encodedBancorDetails: string;
    let encodedStepwiseDetails: string;
    let fees: FeesFacet;
    let curveRegistry: CurveRegistry;

    const hubId1 = 1;
    const hubId2 = 2;
    const hubWarmup = 7 * 60 * 24 * 24; // 1 week
    const warmup = 2 * 60 * 24 * 24; // 2 days
    const duration = 4 * 60 * 24 * 24; // 4 days
    const coolDown = 5 * 60 * 24 * 24; // 5 days
    const MAX_WEIGHT = 1000000;
    const PRECISION = BigNumber.from(10).pow(18);
    const baseY = PRECISION.div(1000);
    const reserveWeight = MAX_WEIGHT / 10;
    const refundRatio = 5000;
    const fee = 3000;
    const tokenDepositedInETH = 5;
    const tokenDeposited = ethers.utils.parseEther(
      tokenDepositedInETH.toString()
    );
    const burnOwnerFee = 1e8;
    const burnBuyerFee = 1e9;
    const stepX = ethers.utils.parseEther("2");
    const stepY = ethers.utils.parseEther("1.5");

    before(async () => {
      let token: ERC20;
      let DAI, WETH;
      ({ DAI, WETH } = await getNamedAccounts());

      const encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [DAI]
      );
      encodedBancorDetails = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint32"],
        [baseY, reserveWeight]
      );
      encodedStepwiseDetails = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint256"],
        [stepX, stepY]
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
        migrationRegistry,
        singleAssetVault,
        account0,
        account1,
        meTokenRegistry,
        fee: fees,
        curveRegistry,
        foundry,
        hub,
      } = await hubSetup(
        encodedBancorDetails,
        encodedVaultArgs,
        refundRatio,
        "bancorABDK"
      ));

      stepwiseCurveABDK = await deploy<StepwiseCurveABDK>(
        "StepwiseCurveABDK",
        undefined,
        hub.address
      );

      await curveRegistry.approve(stepwiseCurveABDK.address);
      dai = token;
      weth = await getContractAt<ERC20>("ERC20", WETH);
      daiWhale = tokenHolder;

      await hub.register(
        account0.address,
        WETH,
        singleAssetVault.address,
        stepwiseCurveABDK.address,
        refundRatio,
        encodedStepwiseDetails,
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
        foundry.address,
        hub.address,
        meTokenRegistry.address,
        migrationRegistry.address
      );
      await migrationRegistry.approve(
        singleAssetVault.address,
        singleAssetVault.address,
        migration.address
      );

      // Pre-load owner and buyer w/ DAI & WETH
      await dai
        .connect(daiWhale)
        .transfer(account1.address, ethers.utils.parseEther("10"));

      await weth
        .connect(tokenHolder)
        .transfer(account1.address, ethers.utils.parseEther("10"));

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
        const metokenDetails = await meTokenRegistry.getMeTokenDetails(
          meToken.address
        );
        const block = await ethers.provider.getBlock("latest");
        expect(metokenDetails.startTime).to.be.gt(block.timestamp);
      });
      it("mint(): meTokens received based on initial Curve", async () => {
        const vaultDAIBefore = await dai.balanceOf(singleAssetVault.address);
        const meTokenTotalSupplyBefore = await meToken.totalSupply();
        expect(meTokenTotalSupplyBefore).to.be.equal(0);

        const calculatedReturn = calculateTokenReturnedFromZero(
          tokenDepositedInETH,
          toETHNumber(baseY),
          reserveWeight / MAX_WEIGHT
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
      it("burn() [buyer]: assets received based on initial Curve", async () => {
        const ownerMeToken = await meToken.balanceOf(account0.address);
        await meToken.transfer(account1.address, ownerMeToken.div(2));
        const buyerMeToken = await meToken.balanceOf(account1.address);
        expect(buyerMeToken).to.be.equal(ownerMeToken.div(2));

        const vaultDAIBefore = await dai.balanceOf(singleAssetVault.address);
        const meTokenTotalSupply = await meToken.totalSupply();
        const meTokenDetails = await meTokenRegistry.getMeTokenDetails(
          meToken.address
        );
        const buyerDAIBefore = await dai.balanceOf(account1.address);

        const rawAssetsReturned = calculateCollateralReturned(
          toETHNumber(buyerMeToken),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenDetails.balancePooled),
          reserveWeight / MAX_WEIGHT
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
      it("burn() [owner]: assets received based on initial Curve", async () => {
        const ownerMeToken = await meToken.balanceOf(account0.address);
        const vaultDAIBefore = await dai.balanceOf(singleAssetVault.address);
        const meTokenTotalSupply = await meToken.totalSupply();
        const meTokenDetails = await meTokenRegistry.getMeTokenDetails(
          meToken.address
        );
        const ownerDAIBefore = await dai.balanceOf(account0.address);

        const rawAssetsReturned = calculateCollateralReturned(
          toETHNumber(ownerMeToken),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenDetails.balancePooled),
          reserveWeight / MAX_WEIGHT
        );
        const assetsReturned =
          rawAssetsReturned +
          (toETHNumber(ownerMeToken) / toETHNumber(meTokenTotalSupply)) *
            toETHNumber(meTokenDetails.balanceLocked);

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
        const metokenDetails = await meTokenRegistry.getMeTokenDetails(
          meToken.address
        );
        await mineBlock(metokenDetails.startTime.toNumber() + 2);

        const block = await ethers.provider.getBlock("latest");
        expect(metokenDetails.startTime).to.be.lt(block.timestamp);
      });
      it("mint(): meTokens received based on weighted average of Curves", async () => {
        const vaultDAIBefore = await dai.balanceOf(singleAssetVault.address);
        const migrationWETHBefore = await weth.balanceOf(migration.address);
        const meTokenTotalSupplyBefore = await meToken.totalSupply();
        expect(meTokenTotalSupplyBefore).to.be.equal(0);
        const meTokenDetails = await meTokenRegistry.getMeTokenDetails(
          meToken.address
        );

        await setAutomine(false);
        const block = await ethers.provider.getBlock("latest");

        const calculatedReturn = calculateTokenReturnedFromZero(
          tokenDepositedInETH,
          toETHNumber(baseY),
          reserveWeight / MAX_WEIGHT
        );
        const calculatedTargetReturn = calculateStepwiseTokenReturned(
          tokenDepositedInETH,
          toETHNumber(meTokenDetails.balancePooled),
          0,
          toETHNumber(stepX),
          toETHNumber(stepY)
        );

        const calcWAvgRe = weightedAverageSimulation(
          calculatedReturn,
          calculatedTargetReturn,
          meTokenDetails.startTime.toNumber(),
          meTokenDetails.endTime.toNumber(),
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
      it("burn() [buyer]: assets received based on weighted average of Curves", async () => {
        const ownerMeToken = await meToken.balanceOf(account0.address);
        await meToken.transfer(account1.address, ownerMeToken.div(2));
        const buyerMeToken = await meToken.balanceOf(account1.address);
        expect(buyerMeToken).to.be.equal(ownerMeToken.div(2));

        const migrationWETHBefore = await weth.balanceOf(migration.address);
        const meTokenTotalSupply = await meToken.totalSupply();
        const buyerWETHBefore = await weth.balanceOf(account1.address);
        const meTokenDetails = await meTokenRegistry.getMeTokenDetails(
          meToken.address
        );

        await setAutomine(false);
        const block = await ethers.provider.getBlock("latest");
        const rawAssetsReturned = calculateCollateralReturned(
          toETHNumber(buyerMeToken),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenDetails.balancePooled),
          reserveWeight / MAX_WEIGHT
        );
        const targetAssetsReturned = calculateStepwiseCollateralReturned(
          toETHNumber(stepX),
          toETHNumber(stepY),
          toETHNumber(buyerMeToken),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenDetails.balancePooled)
        );

        await foundry
          .connect(account1)
          .burn(meToken.address, buyerMeToken, account1.address);

        const calcWAvgRes = weightedAverageSimulation(
          rawAssetsReturned,
          targetAssetsReturned,
          meTokenDetails.startTime.toNumber(),
          meTokenDetails.endTime.toNumber(),
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
      it("burn() [owner]: assets received based on weighted average of Curves", async () => {
        const ownerMeToken = await meToken.balanceOf(account0.address);
        const migrationWETHBefore = await weth.balanceOf(migration.address);
        const meTokenTotalSupply = await meToken.totalSupply();
        const meTokenDetails = await meTokenRegistry.getMeTokenDetails(
          meToken.address
        );
        const ownerWETHBefore = await weth.balanceOf(account0.address);

        await setAutomine(false);
        const block = await ethers.provider.getBlock("latest");

        const rawAssetsReturned = calculateCollateralReturned(
          toETHNumber(ownerMeToken),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenDetails.balancePooled),
          reserveWeight / MAX_WEIGHT
        );
        const targetAssetsReturned = calculateStepwiseCollateralReturned(
          toETHNumber(stepX),
          toETHNumber(stepY),
          toETHNumber(ownerMeToken),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenDetails.balancePooled)
        );

        const calcWAvgRes = weightedAverageSimulation(
          rawAssetsReturned,
          targetAssetsReturned,
          meTokenDetails.startTime.toNumber(),
          meTokenDetails.endTime.toNumber(),
          block.timestamp + 1
        );
        const assetsReturned =
          calcWAvgRes +
          (toETHNumber(ownerMeToken) / toETHNumber(meTokenTotalSupply)) *
            toETHNumber(meTokenDetails.balanceLocked);

        await foundry
          .connect(account0)
          .burn(meToken.address, ownerMeToken, account0.address);

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
        expect(ownerMeTokenAfter).to.equal(0);
        expect(meTokenTotalSupplyAfter).to.equal(0);
      });
    });

    describe("Cooldown", () => {
      before(async () => {
        const metokenDetails = await meTokenRegistry.getMeTokenDetails(
          meToken.address
        );
        await mineBlock(metokenDetails.endTime.toNumber() + 2);

        const block = await ethers.provider.getBlock("latest");
        expect(metokenDetails.endTime).to.be.lt(block.timestamp);
      });
      it("mint(): assets received based on target Curve", async () => {
        const vaultWETHBefore = await weth.balanceOf(singleAssetVault.address);
        const migrationWETHBefore = await weth.balanceOf(migration.address);
        const meTokenTotalSupplyBefore = await meToken.totalSupply();
        expect(meTokenTotalSupplyBefore).to.be.equal(0);

        const meTokenDetails = await meTokenRegistry.getMeTokenDetails(
          meToken.address
        );
        const calculatedTargetReturn = calculateStepwiseTokenReturned(
          tokenDepositedInETH,
          toETHNumber(meTokenDetails.balancePooled),
          toETHNumber(meTokenTotalSupplyBefore),
          toETHNumber(stepX),
          toETHNumber(stepY)
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
      it("burn() [buyer]: assets received based on target Curve", async () => {
        const ownerMeToken = await meToken.balanceOf(account0.address);
        await meToken.transfer(account1.address, ownerMeToken.div(2));
        const buyerMeToken = await meToken.balanceOf(account1.address);
        expect(buyerMeToken).to.be.equal(ownerMeToken.div(2));

        const vaultWETHBefore = await weth.balanceOf(singleAssetVault.address);
        const meTokenTotalSupply = await meToken.totalSupply();
        const buyerWETHBefore = await weth.balanceOf(account1.address);
        const meTokenDetails = await meTokenRegistry.getMeTokenDetails(
          meToken.address
        );

        const targetAssetsReturned = calculateStepwiseCollateralReturned(
          toETHNumber(stepX),
          toETHNumber(stepY),
          toETHNumber(buyerMeToken),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenDetails.balancePooled)
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
      it("burn() [owner]: assets received based on target Curve", async () => {
        const ownerMeToken = await meToken.balanceOf(account0.address);
        const vaultWETHBefore = await weth.balanceOf(singleAssetVault.address);
        const meTokenTotalSupply = await meToken.totalSupply();
        const meTokenDetails = await meTokenRegistry.getMeTokenDetails(
          meToken.address
        );
        const ownerWETHBefore = await weth.balanceOf(account0.address);

        const targetAssetsReturned = calculateStepwiseCollateralReturned(
          toETHNumber(stepX),
          toETHNumber(stepY),
          toETHNumber(ownerMeToken),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenDetails.balancePooled)
        );

        await foundry
          .connect(account0)
          .burn(meToken.address, ownerMeToken, account0.address);

        const assetsReturned =
          targetAssetsReturned +
          (toETHNumber(ownerMeToken) / toETHNumber(meTokenTotalSupply)) *
            toETHNumber(meTokenDetails.balanceLocked);

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
          1e-14
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
