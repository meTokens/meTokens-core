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
import { passDays, passHours, passSeconds } from "../../utils/hardhatNode";
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
  const firstRefundRatio = 5000;
  const targetedRefundRatio = 500000; // 50%
  before(async () => {
    // TODO: pre-load contracts
    // NOTE: hub.register() should have already been called
    baseY = one.mul(1000);
    const reserveWeight = MAX_WEIGHT / 2;
    let DAI;
    ({ DAI } = await getNamedAccounts());

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
      firstRefundRatio,
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

    // Pre-load owner and buyer w/ DAI
    await token
      .connect(tokenHolder)
      .transfer(account2.address, ethers.utils.parseEther("1000"));

    // Create meToken and subscribe to Hub1
    const tx = await meTokenRegistry
      .connect(account0)
      .subscribe("Carl meToken", "CARL", firstHubId, 0);
    const meTokenAddr = await meTokenRegistry.getOwnerMeToken(account0.address);
    meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);

    // Create Hub2 w/ same args but different refund Ratio
    // TODO

    await hub.setWarmup(7 * 60 * 24 * 24); // 1 week
    await meTokenRegistry.setWarmup(2 * 60 * 24 * 24); // 2 days
    await meTokenRegistry.setDuration(4 * 60 * 24 * 24); // 4 days
    await meTokenRegistry.setCooldown(5 * 60 * 24 * 24); // 5 days
  });

  describe("Warmup", () => {
    xit("burn() [owner]: assets received do not apply refundRatio", async () => {});
    xit("burn() [buyer]: assets received based on initial refundRatio", async () => {});
  });

  describe("Duration", () => {
    xit("burn() [owner]: assets received do not apply refundRatio", async () => {});
    xit("burn() [buyer]: assets received based on weighted average refundRatio", async () => {});
  });

  describe("Cooldown", () => {
    xit("burn() [owner]: assets received do not apply refundRatio", async () => {});
    xit("burn() [buyer]: assets received based on targetRefundRatio", async () => {});
  });
});
