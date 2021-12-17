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
  let token: ERC20;
  let weth: ERC20;
  let meToken: MeToken;
  let tokenHolder: Signer;
  let account0: SignerWithAddress;
  let account1: SignerWithAddress;
  let account2: SignerWithAddress;
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
      token,
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
    const migration = await deploy<UniswapSingleTransferMigration>(
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
    await token
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

    await token
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
      const ownerDAIBefore = await token.balanceOf(account0.address);
      const vaultDAIBefore = await token.balanceOf(singleAssetVault.address);

      await foundry
        .connect(account0)
        .burn(meToken.address, ownerMeTokenBefore, account0.address);

      const ownerMeTokenAfter = await meToken.balanceOf(account0.address);
      const ownerDAIAfter = await token.balanceOf(account0.address);
      const vaultDAIAfter = await token.balanceOf(singleAssetVault.address);

      expect(ownerMeTokenAfter).to.equal(0);
      expect(ownerDAIAfter.sub(ownerDAIBefore)).to.equal(tokenDeposited);
      expect(vaultDAIAfter).to.equal(0);
    });
    it("burn() [buyer]: assets received based on initial refundRatio", async () => {
      await foundry
        .connect(account2)
        .mint(meToken.address, tokenDeposited, account1.address);

      const buyerMeTokenBefore = await meToken.balanceOf(account1.address);
      const buyerDAIBefore = await token.balanceOf(account1.address);
      const ownerDAIBefore = await token.balanceOf(account0.address);
      const vaultDAIBefore = await token.balanceOf(singleAssetVault.address);

      await foundry
        .connect(account1) // non owner
        .burn(meToken.address, buyerMeTokenBefore, account1.address);

      const buyerMeTokenAfter = await meToken.balanceOf(account1.address);
      const buyerDAIAfter = await token.balanceOf(account1.address);
      const ownerDAIAfter = await token.balanceOf(account0.address);
      const vaultDAIAfter = await token.balanceOf(singleAssetVault.address);

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
      await foundry
        .connect(account2)
        .mint(meToken.address, tokenDeposited, account0.address);

      const ownerMeTokenBefore = await meToken.balanceOf(account0.address);
      const ownerDAIBefore = await token.balanceOf(account0.address);
      const vaultDAIBefore = await token.balanceOf(singleAssetVault.address);

      await foundry
        .connect(account0)
        .burn(meToken.address, ownerMeTokenBefore, account0.address);

      const ownerMeTokenAfter = await meToken.balanceOf(account0.address);
      const ownerDAIAfter = await token.balanceOf(account0.address);
      const vaultDAIAfter = await token.balanceOf(singleAssetVault.address);

      // received from last burn
      const balanceLocked = tokenDeposited.sub(
        tokenDeposited.mul(firstRefundRatio).div(1e6)
      );

      expect(ownerMeTokenAfter).to.equal(0);
      expect(ownerDAIAfter.sub(ownerDAIBefore)).to.equal(
        tokenDeposited.add(balanceLocked)
      );
      expect(vaultDAIBefore.sub(vaultDAIAfter)).to.equal(
        tokenDeposited.add(balanceLocked)
      );
    });
    it("burn() [buyer]: assets received based on weighted average refundRatio", async () => {
      await foundry
        .connect(account2)
        .mint(meToken.address, tokenDeposited, account1.address);

      const buyerMeTokenBefore = await meToken.balanceOf(account1.address);
      const buyerDAIBefore = await token.balanceOf(account1.address);
      const ownerDAIBefore = await token.balanceOf(account0.address);
      const vaultDAIBefore = await token.balanceOf(singleAssetVault.address);

      await foundry
        .connect(account1) // non owner
        .burn(meToken.address, buyerMeTokenBefore, account1.address);

      const buyerMeTokenAfter = await meToken.balanceOf(account1.address);
      const buyerDAIAfter = await token.balanceOf(account1.address);
      const ownerDAIAfter = await token.balanceOf(account0.address);
      const vaultDAIAfter = await token.balanceOf(singleAssetVault.address);

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
