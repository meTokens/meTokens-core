import { ethers, getNamedAccounts } from "hardhat";
import {
  deploy,
  getContractAt,
  toETHNumber,
  weightedAverageSimulation,
} from "../../utils/helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, Signer } from "ethers";
import { ERC20 } from "../../../artifacts/types/ERC20";
import { BancorABDK } from "../../../artifacts/types/BancorABDK";
import { CurveRegistry } from "../../../artifacts/types/CurveRegistry";
import { Foundry } from "../../../artifacts/types/Foundry";
import { Hub } from "../../../artifacts/types/Hub";
import { MeTokenRegistry } from "../../../artifacts/types/MeTokenRegistry";
import { MigrationRegistry } from "../../../artifacts/types/MigrationRegistry";
import { hubSetup, addHubSetup } from "../../utils/hubSetup";
import { MeToken } from "../../../artifacts/types/MeToken";
import { VaultRegistry } from "../../../artifacts/types/VaultRegistry";
import { expect } from "chai";
import { SingleAssetVault } from "../../../artifacts/types/SingleAssetVault";
import { mineBlock } from "../../utils/hardhatNode";
import { UniswapSingleTransferMigration } from "../../../artifacts/types/UniswapSingleTransferMigration";

describe("MeToken Resubscribe - new RefundRatio", () => {
  let meTokenRegistry: MeTokenRegistry;
  let bancorABDK: BancorABDK;
  let curveRegistry: CurveRegistry;
  let migrationRegistry: MigrationRegistry;
  let singleAssetVault: SingleAssetVault;
  let vaultRegistry: VaultRegistry;
  let foundry: Foundry;
  let hub: Hub;
  let dai: ERC20;
  let weth: ERC20;
  let meToken: MeToken;
  let tokenHolder: Signer;
  let account0: SignerWithAddress;
  let account1: SignerWithAddress;
  let account2: SignerWithAddress;
  let migration: UniswapSingleTransferMigration;

  const one = ethers.utils.parseEther("1");
  let baseY: BigNumber;
  const MAX_WEIGHT = 1000000;
  let encodedCurveDetails: string;
  let encodedVaultArgs: string;
  const firstHubId = 1;
  const firstRefundRatio = ethers.utils.parseUnits("5000", 0); // 0.005%
  const targetedRefundRatio = ethers.utils.parseUnits("500000", 0); // 50%
  const fees = 3000;

  let tokenDepositedInETH;
  let tokenDeposited: BigNumber;

  before(async () => {
    // TODO: pre-load contracts
    // NOTE: hub.register() should have already been called
    baseY = one.mul(1000);
    const reserveWeight = MAX_WEIGHT / 2;
    let DAI;
    let WETH;
    ({ DAI, WETH } = await getNamedAccounts());

    encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint32"],
      [baseY, reserveWeight]
    );
    encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(["address"], [DAI]);
    bancorABDK = await deploy<BancorABDK>("BancorABDK");

    ({
      token: dai,
      hub,
      tokenHolder,
      curveRegistry,
      migrationRegistry,
      singleAssetVault,
      foundry,
      account0,
      account1,
      account2,
      meTokenRegistry,
      vaultRegistry,
    } = await hubSetup(
      encodedCurveDetails,
      encodedVaultArgs,
      firstRefundRatio.toNumber(),
      bancorABDK
    ));

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

    weth = await getContractAt<ERC20>("ERC20", WETH);

    // Pre-load owner and buyer w/ DAI
    await dai
      .connect(tokenHolder)
      .transfer(account2.address, ethers.utils.parseEther("1000"));

    await weth
      .connect(tokenHolder)
      .transfer(account2.address, ethers.utils.parseEther("1000"));

    // Create meToken and subscribe to Hub1
    await meTokenRegistry
      .connect(account0)
      .subscribe("Carl meToken", "CARL", firstHubId, 0);
    const meTokenAddr = await meTokenRegistry.getOwnerMeToken(account0.address);
    meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);

    // Create Hub2 w/ same args but different refund Ratio
    await hub.register(
      account0.address,
      WETH,
      singleAssetVault.address,
      bancorABDK.address,
      targetedRefundRatio,
      encodedCurveDetails,
      encodedVaultArgs
    );

    await hub.setWarmup(7 * 60 * 24 * 24); // 1 week
    await meTokenRegistry.setWarmup(2 * 60 * 24 * 24); // 2 days
    await meTokenRegistry.setDuration(4 * 60 * 24 * 24); // 4 days
    await meTokenRegistry.setCooldown(5 * 60 * 24 * 24); // 5 days

    const block = await ethers.provider.getBlock("latest");
    const earliestSwapTime = block.timestamp + 600 * 60; // 10h in future
    const encodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint24"],
      [earliestSwapTime, fees]
    );

    await meTokenRegistry.initResubscribe(
      meToken.address,
      2,
      migration.address,
      encodedMigrationArgs
    );
    tokenDepositedInETH = 100;
    tokenDeposited = ethers.utils.parseEther(tokenDepositedInETH.toString());

    await dai
      .connect(account2)
      .approve(foundry.address, ethers.constants.MaxUint256);
    await weth
      .connect(account2)
      .approve(foundry.address, ethers.constants.MaxUint256);
  });

  describe("Warmup", () => {
    before(async () => {
      const metokenDetails = await meTokenRegistry.getDetails(meToken.address);
      const block = await ethers.provider.getBlock("latest");
      expect(metokenDetails.startTime).to.be.gt(block.timestamp);
    });
    it("burn() [owner]: assets received do not apply refundRatio", async () => {
      await foundry
        .connect(account2)
        .mint(meToken.address, tokenDeposited, account0.address);

      const ownerMeTokenBefore = await meToken.balanceOf(account0.address);
      const ownerDAIBefore = await dai.balanceOf(account0.address);
      const vaultDAIBefore = await dai.balanceOf(singleAssetVault.address);

      await foundry
        .connect(account0)
        .burn(meToken.address, ownerMeTokenBefore, account0.address);

      const ownerMeTokenAfter = await meToken.balanceOf(account0.address);
      const ownerDAIAfter = await dai.balanceOf(account0.address);
      const vaultDAIAfter = await dai.balanceOf(singleAssetVault.address);

      expect(ownerMeTokenAfter).to.equal(0);
      expect(ownerDAIAfter.sub(ownerDAIBefore)).to.equal(tokenDeposited);
      expect(vaultDAIAfter).to.equal(0);
    });
    it("burn() [buyer]: assets received based on initial refundRatio", async () => {
      await foundry
        .connect(account2)
        .mint(meToken.address, tokenDeposited, account1.address);

      const buyerMeTokenBefore = await meToken.balanceOf(account1.address);
      const buyerDAIBefore = await dai.balanceOf(account1.address);
      const ownerDAIBefore = await dai.balanceOf(account0.address);
      const vaultDAIBefore = await dai.balanceOf(singleAssetVault.address);

      await foundry
        .connect(account1) // non owner
        .burn(meToken.address, buyerMeTokenBefore, account1.address);

      const buyerMeTokenAfter = await meToken.balanceOf(account1.address);
      const buyerDAIAfter = await dai.balanceOf(account1.address);
      const ownerDAIAfter = await dai.balanceOf(account0.address);
      const vaultDAIAfter = await dai.balanceOf(singleAssetVault.address);

      const refundAmount = tokenDeposited.mul(firstRefundRatio).div(1e6);

      expect(buyerMeTokenAfter).to.equal(0);
      expect(buyerDAIAfter.sub(buyerDAIBefore)).to.equal(refundAmount);
      expect(vaultDAIBefore.sub(vaultDAIAfter)).to.equal(refundAmount);
    });
  });

  describe("Duration", () => {
    before(async () => {
      const metokenDetails = await meTokenRegistry.getDetails(meToken.address);
      await mineBlock(metokenDetails.startTime.toNumber() + 2);

      const block = await ethers.provider.getBlock("latest");
      expect(metokenDetails.startTime).to.be.lt(block.timestamp);
    });
    it("burn() [owner]: assets received do not apply refundRatio", async () => {
      const vaultDAIBeforeMint = await dai.balanceOf(singleAssetVault.address);
      console.log("totalSupply", (await meToken.totalSupply()).toString());
      const tx = await foundry
        .connect(account2)
        .mint(meToken.address, tokenDeposited, account0.address);

      await tx.wait();

      await expect(tx).to.emit(meTokenRegistry, "UpdateBalances");

      const ownerMeTokenBefore = await meToken.balanceOf(account0.address);
      const ownerDAIBefore = await dai.balanceOf(account0.address);
      const vaultDAIBefore = await dai.balanceOf(singleAssetVault.address);
      const ownerWETHBefore = await weth.balanceOf(account0.address);
      const vaultWETHBefore = await weth.balanceOf(singleAssetVault.address);
      const migrationDAIBefore = await dai.balanceOf(migration.address);
      const migrationWETHBefore = await weth.balanceOf(migration.address);
      console.log("totalSupply", (await meToken.totalSupply()).toString());

      expect(vaultDAIBeforeMint).to.be.gt(0);
      expect(vaultDAIBefore).to.be.equal(0); // as all is swapped for weth and goes to migration
      // TODO check extra balance due to swap
      expect(migrationWETHBefore).to.gt(tokenDeposited); // migration vault receives minted funds plus dai swap

      await foundry
        .connect(account0)
        .burn(meToken.address, ownerMeTokenBefore, account0.address);

      const ownerMeTokenAfter = await meToken.balanceOf(account0.address);
      const ownerDAIAfter = await dai.balanceOf(account0.address);
      const vaultDAIAfter = await dai.balanceOf(singleAssetVault.address);
      const ownerWETHAfter = await weth.balanceOf(account0.address);
      const vaultWETHAfter = await weth.balanceOf(singleAssetVault.address);
      const migrationDAIAfter = await dai.balanceOf(migration.address);
      const migrationWETHAfter = await weth.balanceOf(migration.address);

      console.log("totalSupply", (await meToken.totalSupply()).toString());
      console.log("ownerMeTokenBefore", ownerMeTokenBefore.toString());
      console.log("ownerDAIBefore", ownerDAIBefore.toString());
      console.log("vaultDAIBefore", vaultDAIBefore.toString());
      console.log("ownerWETHBefore", ownerWETHBefore.toString());
      console.log("vaultWETHBefore", vaultWETHBefore.toString());
      console.log("migrationDAIBefore", migrationDAIBefore.toString());
      console.log("migrationWETHBefore", migrationWETHBefore.toString());

      console.log("ownerMeTokenAfter", ownerMeTokenAfter.toString());
      console.log("ownerDAIAfter", ownerDAIAfter.toString());
      console.log("vaultDAIAfter", vaultDAIAfter.toString());
      console.log("ownerWETHAfter", ownerWETHAfter.toString());
      console.log("vaultWETHAfter", vaultWETHAfter.toString());
      console.log("migrationDAIAfter", migrationDAIAfter.toString());
      console.log("migrationWETHAfter", migrationWETHAfter.toString());

      expect(ownerMeTokenAfter).to.equal(0); // as all tokens are burned
      expect(ownerDAIAfter).to.equal(ownerDAIBefore); // as owner receives new fund in weth
      expect(vaultDAIBefore).to.equal(vaultDAIAfter); // as vault do not receive any funds
      expect(vaultWETHBefore).to.equal(vaultWETHAfter); // as vault do not receive any funds
      expect(migrationDAIBefore).to.equal(migrationDAIAfter); // as migration receives new fund in weth
      // FIXME failing
      expect(migrationWETHBefore.sub(migrationWETHAfter)).to.equal(0); // as all funds are transferred to owner
      expect(ownerWETHAfter.sub(ownerWETHBefore)).to.gt(tokenDeposited); // as all token deposited goes to owner plus swap tokens
    });
    it("burn() [buyer]: assets received based on weighted average refundRatio", async () => {
      await foundry
        .connect(account2)
        .mint(meToken.address, tokenDeposited, account1.address);

      const buyerMeTokenBefore = await meToken.balanceOf(account1.address);
      const buyerDAIBefore = await dai.balanceOf(account1.address);
      const ownerDAIBefore = await dai.balanceOf(account0.address);
      const vaultDAIBefore = await dai.balanceOf(singleAssetVault.address);

      await foundry
        .connect(account1) // non owner
        .burn(meToken.address, buyerMeTokenBefore, account1.address);

      const buyerMeTokenAfter = await meToken.balanceOf(account1.address);
      const buyerDAIAfter = await dai.balanceOf(account1.address);
      const ownerDAIAfter = await dai.balanceOf(account0.address);
      const vaultDAIAfter = await dai.balanceOf(singleAssetVault.address);

      const refundAmount = tokenDeposited.mul(firstRefundRatio).div(1e6);

      expect(buyerMeTokenAfter).to.equal(0);
      expect(buyerDAIAfter.sub(buyerDAIBefore)).to.equal(refundAmount);
      expect(vaultDAIBefore.sub(vaultDAIAfter)).to.equal(refundAmount);
    });
  });

  describe("Cooldown", () => {
    before(async () => {
      const metokenDetails = await meTokenRegistry.getDetails(meToken.address);
      await mineBlock(metokenDetails.endTime.toNumber() + 2);

      const block = await ethers.provider.getBlock("latest");
      expect(metokenDetails.endTime).to.be.lt(block.timestamp);
    });
    xit("burn() [owner]: assets received do not apply refundRatio", async () => {});
    xit("burn() [buyer]: assets received based on targetRefundRatio", async () => {});
  });
});
