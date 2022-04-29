import { expect } from "chai";
import Decimal from "decimal.js";
import { BigNumber, Contract, Signer, providers } from "ethers";
import { ethers, getNamedAccounts } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
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
import { impersonate, mineBlock, setAutomine } from "../../utils/hardhatNode";
import {
  FoundryFacet,
  HubFacet,
  MeTokenRegistryFacet,
  FeesFacet,
  MeToken,
  ERC20,
  MigrationRegistry,
  SingleAssetVault,
  UniswapSingleTransferMigration,
  VaultRegistry,
  Diamond,
} from "../../../artifacts/types";
import { getQuote } from "../../utils/uniswap";

const setup = async () => {
  describe("MeToken Resubscribe - new vault", () => {
    let meTokenRegistry: MeTokenRegistryFacet;
    let migrationRegistry: MigrationRegistry;
    let migration: UniswapSingleTransferMigration;
    let initialVault: SingleAssetVault; // DAI
    let targetVault: SingleAssetVault; // WETH
    let foundry: FoundryFacet;
    let hub: HubFacet;
    let whale: Signer;
    let dai: ERC20;
    let weth: ERC20;
    let daiWhale: Signer;
    let meToken: MeToken;
    let account0: SignerWithAddress;
    let account1: SignerWithAddress; // meToken's owner
    let account2: SignerWithAddress;
    let encodedVaultDAIArgs: string;
    let encodedVaultWETHArgs: string;
    let fees: FeesFacet;
    //let curve: ICurve;
    let vaultRegistry: VaultRegistry;
    let diamond: Diamond;
    let UNIV3Factory: string;
    const hubId1 = 1;
    const hubId2 = 2;
    const hubWarmup = 7 * 60 * 24 * 24; // 1 week
    const warmup = 2 * 60 * 24 * 24; // 2 days
    const duration = 4 * 60 * 24 * 24; // 4 days
    const coolDown = 5 * 60 * 24 * 24; // 5 days
    const MAX_WEIGHT = 1000000;
    const PRECISION = BigNumber.from(10).pow(18);
    const baseY = PRECISION.div(1000);
    const reserveWeight = MAX_WEIGHT / 2;
    const refundRatio = 5000;
    const fee = 3000;
    let tokenDepositedInETH = 302;
    let tokenDeposited = ethers.utils.parseEther(
      tokenDepositedInETH.toString()
    );
    const burnOwnerFee = 1e8;
    const burnBuyerFee = 1e9;

    before(async () => {
      let token: ERC20;
      let DAI, WETH, DAIWhale;
      ({ DAI, WETH, DAIWhale, UNIV3Factory } = await getNamedAccounts());
      dai = await getContractAt<ERC20>("ERC20", DAI);
      weth = await getContractAt<ERC20>("ERC20", WETH);
      daiWhale = await impersonate(DAIWhale);

      encodedVaultDAIArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [DAI]
      );
      encodedVaultWETHArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [WETH]
      );

      const encodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
        ["uint24"],
        [fee]
      );

      // Register first and second hub
      ({
        token,
        whale,
        migrationRegistry,
        singleAssetVault: initialVault,
        account0,
        account1,
        account2,
        meTokenRegistry,
        vaultRegistry,
        fee: fees,
        foundry,
        hub,
        diamond,
      } = await hubSetup(
        baseY,
        reserveWeight,
        encodedVaultDAIArgs,
        refundRatio
      ));

      targetVault = await deploy<SingleAssetVault>(
        "SingleAssetVault",
        undefined, //no libs
        account0.address, // DAO
        hub.address // diamond
      );
      await vaultRegistry.approve(targetVault.address);

      // Register 2nd hub to which we'll migrate to
      await hub.register(
        account0.address,
        WETH,
        targetVault.address,
        refundRatio,
        baseY,
        reserveWeight,
        encodedVaultWETHArgs
      );
      // Deploy uniswap migration and approve it to the registry
      migration = await deploy<UniswapSingleTransferMigration>(
        "UniswapSingleTransferMigration",
        undefined,
        account0.address,
        hub.address // diamond
      );
      await migrationRegistry.approve(
        initialVault.address,
        targetVault.address,
        migration.address
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
        account0.address, // DAO
        diamond.address // diamond
      );
      await migrationRegistry.approve(
        initialVault.address,
        targetVault.address,
        migration.address
      );

      // Pre-load owner account1 and buyer account2 w/ DAI & WETH
      await dai
        .connect(daiWhale)
        .transfer(account1.address, ethers.utils.parseEther("4000"));

      await weth
        .connect(whale)
        .transfer(account1.address, ethers.utils.parseEther("20"));
      dai
        .connect(daiWhale)
        .transfer(account0.address, ethers.utils.parseEther("4000"));
      dai
        .connect(daiWhale)
        .transfer(account2.address, ethers.utils.parseEther("4000"));
      weth
        .connect(whale)
        .transfer(account0.address, ethers.utils.parseEther("20"));
      weth
        .connect(whale)
        .transfer(account2.address, ethers.utils.parseEther("1000"));
      // Create meToken and subscribe to Hub1
      const name = "Carl meToken";
      const symbol = "CARL";
      // const amount = ethers.utils.parseEther("100");

      const max = ethers.constants.MaxUint256;
      await dai.connect(account1).approve(meTokenRegistry.address, max);
      await dai.connect(account1).approve(initialVault.address, max);
      await weth.connect(account1).approve(migration.address, max);
      await dai.connect(account2).approve(initialVault.address, max);

      // await weth.connect(account2).approve(migration.address, max);
      await weth.connect(account1).approve(targetVault.address, max);
      // Create meToken
      await meTokenRegistry
        .connect(account1)
        .subscribe(name, symbol, hubId1, 0);
      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account1.address
      );
      meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);

      await meTokenRegistry
        .connect(account1)
        .initResubscribe(
          meToken.address,
          hubId2,
          migration.address,
          encodedMigrationArgs
        );
      const migrationDetails = await migration.getDetails(meToken.address);
      expect(migrationDetails.fee).to.equal(fee);
      expect(migrationDetails.started).to.equal(false);
    });

    describe("Warmup", () => {
      before(async () => {
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        const block = await ethers.provider.getBlock("latest");
        expect(meTokenInfo.startTime).to.be.gt(block.timestamp);
      });
      it("mint() [buyer]: meTokens received based on initial vault", async () => {
        const vaultDAIBefore = await dai.balanceOf(initialVault.address);
        const meTokenTotalSupplyBefore = await meToken.totalSupply();
        expect(meTokenTotalSupplyBefore).to.be.equal(0);

        const calculatedReturn = calculateTokenReturnedFromZero(
          tokenDepositedInETH,
          toETHNumber(baseY),
          reserveWeight / MAX_WEIGHT
        );
        // buyer mint some meToken
        await foundry
          .connect(account2)
          .mint(meToken.address, tokenDeposited, account2.address);

        const ownerMeTokenAfter = await meToken.balanceOf(account1.address);
        const buyerMeTokenAfter = await meToken.balanceOf(account2.address);

        const vaultDAIAfter = await dai.balanceOf(initialVault.address);
        const meTokenTotalSupplyAfter = await meToken.totalSupply();
        expect(ownerMeTokenAfter).to.equal(0);
        expect(toETHNumber(buyerMeTokenAfter)).to.be.approximately(
          calculatedReturn,
          1e-15
        );
        expect(meTokenTotalSupplyAfter).to.be.equal(buyerMeTokenAfter);
        expect(vaultDAIAfter.sub(vaultDAIBefore)).to.equal(tokenDeposited);
      });
      it("burn() [buyer]: assets received based on initial vault", async () => {
        const buyerMeToken = await meToken.balanceOf(account2.address);
        // transfer some MeTokens to owner
        await meToken
          .connect(account2)
          .transfer(account1.address, buyerMeToken.div(2));
        const ownerMeToken = await meToken.balanceOf(account2.address);
        expect(ownerMeToken).to.be.equal(buyerMeToken.div(2));

        const vaultDAIBefore = await dai.balanceOf(initialVault.address);
        const meTokenTotalSupply = await meToken.totalSupply();
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        const buyerDAIBefore = await dai.balanceOf(account2.address);

        const rawAssetsReturned = calculateCollateralReturned(
          toETHNumber(buyerMeToken.div(2)),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenInfo.balancePooled),
          reserveWeight / MAX_WEIGHT
        );
        const assetsReturned = (rawAssetsReturned * refundRatio) / MAX_WEIGHT;

        // buyer burns meTokens and keep the collateral returned
        await foundry
          .connect(account2)
          .burn(meToken.address, buyerMeToken.div(2), account2.address);

        const buyerMeTokenAfter = await meToken.balanceOf(account2.address);
        const buyerDAIAfter = await dai.balanceOf(account2.address);
        const vaultDAIAfter = await dai.balanceOf(initialVault.address);
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
      it("burn() [owner]: assets received based on initial vault", async () => {
        const ownerMeToken = (await meToken.balanceOf(account1.address)).div(2);
        const vaultDAIBefore = await dai.balanceOf(initialVault.address);
        const meTokenTotalSupply = await meToken.totalSupply();
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        const ownerDAIBefore = await dai.balanceOf(account1.address);

        const rawAssetsReturned = calculateCollateralReturned(
          toETHNumber(ownerMeToken),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenInfo.balancePooled),
          reserveWeight / MAX_WEIGHT
        );
        const assetsReturned =
          rawAssetsReturned +
          (toETHNumber(ownerMeToken) / toETHNumber(meTokenTotalSupply)) *
            toETHNumber(meTokenInfo.balanceLocked);
        await foundry
          .connect(account1)
          .burn(meToken.address, ownerMeToken, account1.address);
        const ownerMeTokenAfter = await meToken.balanceOf(account1.address);
        const ownerDAIAfter = await dai.balanceOf(account1.address);
        const vaultDAIAfter = await dai.balanceOf(initialVault.address);
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
        // only half of the metoken has been burnt (add 1 wei for precision)
        expect(ownerMeTokenAfter).to.equal(ownerMeToken.add(1));
        // only half of the metoken has been burnt
        expect(toETHNumber(meTokenTotalSupplyAfter)).to.equal(
          toETHNumber(meTokenTotalSupply.div(2))
        );
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
      it("mint() [owner]: meTokens bought with DAI and migration vault swap it all to WETH", async () => {
        // this first mint during migration period will trigger
        // the deposit of dai to the migration contract
        // and will swap dai to weth
        // It will then update the balance pooled / locked to reflect the new amount in weth
        const vaultInitDAIBefore = await dai.balanceOf(initialVault.address);
        const vaultTargetWETHBefore = await weth.balanceOf(targetVault.address);
        const vaultTargetDaiBefore = await dai.balanceOf(targetVault.address);
        expect(vaultTargetDaiBefore).to.equal(0);
        expect(vaultTargetWETHBefore).to.equal(0);
        const migrationWETHBefore = await weth.balanceOf(migration.address);
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        const balanceLockedBefore = meTokenInfo.balanceLocked;
        const balancePooledBefore = meTokenInfo.balancePooled;
        await setAutomine(false);
        const block = await ethers.provider.getBlock("latest");

        const migrationDetails = await migration.getDetails(meToken.address);
        const price = await getQuote(
          UNIV3Factory,
          dai,
          weth,
          migrationDetails.fee,
          tokenDeposited.add(vaultInitDAIBefore)
        );
        const account1DaiBefore = await dai.balanceOf(account1.address);
        await foundry
          .connect(account1)
          .mint(meToken.address, tokenDeposited, account1.address);

        await mineBlock(block.timestamp + 1);
        await setAutomine(true);

        const vaultDAIAfter = await dai.balanceOf(initialVault.address);
        const meTokenInfoAfter = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        const balanceLockedAfter = meTokenInfoAfter.balanceLocked;
        const balancePooledAfter = meTokenInfoAfter.balancePooled;

        // all dai should have been swapped to ETH
        const migrationWETHAfter = await weth.balanceOf(migration.address);
        expect(migrationWETHBefore).to.equal(0);
        expect(toETHNumber(migrationWETHAfter)).to.be.approximately(
          Number(price.token0Price),
          0.01
        );
        // balance should have been updated accordingly
        // balance locked has not been changed during mint
        expect(toETHNumber(balanceLockedAfter)).to.be.approximately(
          toETHNumber(balanceLockedBefore) /
            Number(price.oneToken1inToken0Price),
          0.001
        );
        // balance pooled increased by the deposited amount in dai
        expect(toETHNumber(balancePooledAfter)).to.be.approximately(
          (toETHNumber(balancePooledBefore) + toETHNumber(tokenDeposited)) /
            Number(price.oneToken1inToken0Price),
          0.001
        );
        const ownerMeTokenAfter = await meToken.balanceOf(account1.address);
        const meTokenTotalSupplyAfter = await meToken.totalSupply();
        const vaultTargetDaiAfter = await dai.balanceOf(targetVault.address);
        expect(vaultTargetDaiAfter).to.equal(0);
        expect(meTokenTotalSupplyAfter).to.be.equal(ownerMeTokenAfter);

        // there is some dai left on the vault that belongs to the DAO that has not been swapped
        // we should not have anymore dai on vault neither on migration
        const daoDaiBalance = await dai.balanceOf(account0.address);
        await initialVault.claim(dai.address, true, 0);
        const daoDaiAfter = await dai.balanceOf(account0.address);
        expect(daoDaiAfter.sub(daoDaiBalance)).equal(vaultDAIAfter);
        const vaultDAIAfterClaim = await dai.balanceOf(initialVault.address);
        expect(vaultDAIAfterClaim).to.equal(0); // old asset goes to migration and dao claimed fees
      });
      it("burn() [buyer]: assets returned is WETH", async () => {
        const ownerMeToken = await meToken.balanceOf(account1.address);
        await meToken
          .connect(account1)
          .transfer(account2.address, ownerMeToken.div(2));
        const buyerMeToken = await meToken.balanceOf(account2.address);
        expect(buyerMeToken).to.be.equal(ownerMeToken.div(2));

        const migrationWETHBefore = await weth.balanceOf(migration.address);
        const meTokenTotalSupply = await meToken.totalSupply();
        const buyerWETHBefore = await weth.balanceOf(account2.address);
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );

        await setAutomine(false);
        const block = await ethers.provider.getBlock("latest");
        const rawAssetsReturned = calculateCollateralReturned(
          toETHNumber(buyerMeToken),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenInfo.balancePooled),
          reserveWeight / MAX_WEIGHT
        );
        // burn meToken  returns WETH from migration contract
        await foundry
          .connect(account2)
          .burn(meToken.address, buyerMeToken, account2.address);
        const det = await migration.getDetails(meToken.address);
        expect(det.started).to.be.true;
        // expect(det.swapped).to.be.true;

        const assetsReturned = (rawAssetsReturned * refundRatio) / MAX_WEIGHT;

        await mineBlock(block.timestamp + 1);
        await setAutomine(true);

        const buyerMeTokenAfter = await meToken.balanceOf(account2.address);
        const buyerWETHAfter = await weth.balanceOf(account2.address);
        const migrationWETHAfter = await weth.balanceOf(migration.address);
        const meTokenTotalSupplyAfter = await meToken.totalSupply();

        const burnFee = toETHNumber(
          (await fees.burnBuyerFee())
            .mul(fromETHNumber(assetsReturned))
            .div(PRECISION)
        );
        // buyer gets WETH
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
        // less WETH in migration due to the burn
        expect(
          toETHNumber(migrationWETHBefore.sub(migrationWETHAfter))
        ).to.approximately(
          new Decimal(assetsReturned).sub(new Decimal(burnFee)).toNumber(),
          1e-15
        );
        const meTokenInfoAfter = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        const balanceLockedBefore = meTokenInfo.balanceLocked;
        const balancePooledBefore = meTokenInfo.balancePooled;
        const balanceLockedAfter = meTokenInfoAfter.balanceLocked;
        const balancePooledAfter = meTokenInfoAfter.balancePooled;

        // the extracted balance pooled will be transferred to balance locked and to the burner
        expect(
          toETHNumber(
            migrationWETHBefore
              .sub(migrationWETHAfter)
              .add(balanceLockedAfter.sub(balanceLockedBefore))
          )
        ).to.approximately(
          toETHNumber(balancePooledBefore.sub(balancePooledAfter)),
          1e-11
        );
      });
      it("burn() [owner]: assets received based on weighted average of vault", async () => {
        const ownerMeToken = await meToken.balanceOf(account1.address);
        const migrationWETHBefore = await weth.balanceOf(migration.address);
        const meTokenTotalSupply = await meToken.totalSupply();
        let meTokenInfo = await meTokenRegistry.getMeTokenInfo(meToken.address);
        const ownerWETHBefore = await weth.balanceOf(account1.address);

        await setAutomine(false);
        const block = await ethers.provider.getBlock("latest");
        const rawAssetsReturned = calculateCollateralReturned(
          toETHNumber(ownerMeToken),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenInfo.balancePooled),
          reserveWeight / MAX_WEIGHT
        );
        const assetsReturned =
          rawAssetsReturned +
          (toETHNumber(ownerMeToken) / toETHNumber(meTokenTotalSupply)) *
            toETHNumber(meTokenInfo.balanceLocked);

        await foundry
          .connect(account1)
          .burn(meToken.address, ownerMeToken, account1.address);

        await mineBlock(block.timestamp + 1);
        await setAutomine(true);
        const ownerMeTokenAfter = await meToken.balanceOf(account1.address);
        const ownerWETHAfter = await weth.balanceOf(account1.address);
        const migrationWETHAfter = await weth.balanceOf(migration.address);
        const meTokenTotalSupplyAfter = await meToken.totalSupply();

        const burnFee = toETHNumber(
          (await fees.burnOwnerFee())
            .mul(fromETHNumber(assetsReturned))
            .div(PRECISION)
        );
        const det = await migration.getDetails(meToken.address);
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
        meTokenInfo = await meTokenRegistry.getMeTokenInfo(meToken.address);
        const meTokenInfoAfter = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        const balanceLockedAfter = meTokenInfoAfter.balanceLocked;
        const balancePooledAfter = meTokenInfoAfter.balancePooled;
        expect(balanceLockedAfter).to.equal(0);
        expect(balancePooledAfter).to.equal(0);
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
        tokenDepositedInETH = 4.2;
        tokenDeposited = ethers.utils.parseEther(
          tokenDepositedInETH.toString()
        );
      });
      it("mint() [owner]: assets received based on target vault", async () => {
        const vaultWETHBefore = await weth.balanceOf(targetVault.address);
        const migrationWETHBefore = await weth.balanceOf(migration.address);
        const meTokenTotalSupplyBefore = await meToken.totalSupply();
        expect(meTokenTotalSupplyBefore).to.be.equal(0);
        let meTokenInfo = await meTokenRegistry.getMeTokenInfo(meToken.address);
        const rawAssetsReturned = calculateTokenReturnedFromZero(
          tokenDepositedInETH,
          toETHNumber(baseY),
          reserveWeight / MAX_WEIGHT
        );
        // target vault is empty before end of migration
        const targetVaultWETHBefore = await weth.balanceOf(targetVault.address);
        expect(targetVaultWETHBefore).to.be.equal(0);
        await foundry
          .connect(account1)
          .mint(meToken.address, tokenDeposited, account1.address);
        meTokenInfo = await meTokenRegistry.getMeTokenInfo(meToken.address);
        const ownerMeTokenAfter = await meToken.balanceOf(account1.address);
        const vaultWETHAfter = await weth.balanceOf(initialVault.address);
        const targetVaultWETHAfter = await weth.balanceOf(targetVault.address);
        const migrationWETHAfter = await weth.balanceOf(migration.address);
        const meTokenTotalSupplyAfter = await meToken.totalSupply();
        expect(toETHNumber(ownerMeTokenAfter)).to.be.approximately(
          rawAssetsReturned,
          1e-15
        );
        expect(meTokenTotalSupplyAfter).to.be.equal(ownerMeTokenAfter);
        expect(vaultWETHAfter.sub(vaultWETHBefore)).to.equal(0);
        expect(targetVaultWETHAfter.sub(targetVaultWETHBefore)).to.equal(
          tokenDeposited
        );
        expect(migrationWETHAfter.sub(migrationWETHBefore)).to.equal(0);

        const meTokenInfoAfter = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        const balanceLockedAfter = meTokenInfoAfter.balanceLocked;
        const balancePooledAfter = meTokenInfoAfter.balancePooled;
        expect(balanceLockedAfter).to.equal(0);
        expect(balancePooledAfter).to.equal(tokenDeposited);
      });
      it("burn() [buyer]: assets received based on target vault", async () => {
        const ownerMeToken = await meToken.balanceOf(account1.address);
        await meToken
          .connect(account1)
          .transfer(account2.address, ownerMeToken.div(2));
        const buyerMeToken = await meToken.balanceOf(account2.address);
        const vaultWETHBefore = await weth.balanceOf(targetVault.address);
        const meTokenTotalSupply = await meToken.totalSupply();
        const buyerWETHBefore = await weth.balanceOf(account2.address);
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        const targetAssetsReturned = calculateCollateralReturned(
          toETHNumber(buyerMeToken),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenInfo.balancePooled),
          reserveWeight / MAX_WEIGHT
        );

        await foundry
          .connect(account2)
          .burn(meToken.address, buyerMeToken, account2.address);

        const assetsReturned =
          (targetAssetsReturned * refundRatio) / MAX_WEIGHT;

        const buyerMeTokenAfter = await meToken.balanceOf(account2.address);
        const buyerWETHAfter = await weth.balanceOf(account2.address);
        const vaultWETHAfter = await weth.balanceOf(targetVault.address);
        const meTokenTotalSupplyAfter = await meToken.totalSupply();

        const burnFee = toETHNumber(
          (await fees.burnBuyerFee())
            .mul(fromETHNumber(assetsReturned))
            .div(PRECISION)
        );
        const meTokenInfoAfter = await meTokenRegistry.getMeTokenInfo(
          meToken.address
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
      it("burn() [owner]: assets received based on target vault", async () => {
        const ownerMeToken = await meToken.balanceOf(account1.address);
        const vaultWETHBefore = await weth.balanceOf(targetVault.address);
        const meTokenTotalSupply = await meToken.totalSupply();
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        const ownerWETHBefore = await weth.balanceOf(account1.address);

        const targetAssetsReturned = calculateCollateralReturned(
          toETHNumber(ownerMeToken),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenInfo.balancePooled),
          reserveWeight / MAX_WEIGHT
        );

        await foundry
          .connect(account1)
          .burn(meToken.address, ownerMeToken, account1.address);

        const assetsReturned =
          targetAssetsReturned +
          (toETHNumber(ownerMeToken) / toETHNumber(meTokenTotalSupply)) *
            toETHNumber(meTokenInfo.balanceLocked);

        const ownerMeTokenAfter = await meToken.balanceOf(account1.address);
        const ownerWETHAfter = await weth.balanceOf(account1.address);
        const vaultWETHAfter = await weth.balanceOf(targetVault.address);
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
