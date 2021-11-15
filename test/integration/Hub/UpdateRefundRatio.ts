import { ethers, getNamedAccounts } from "hardhat";
import { deploy, getContractAt } from "../../utils/helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, Signer } from "ethers";
import { ERC20 } from "../../../artifacts/types/ERC20";
import { BancorZeroCurve } from "../../../artifacts/types/BancorZeroCurve";
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
import { UniswapSingleTransfer } from "../../../artifacts/types/UniswapSingleTransfer";

describe("Hub - update RefundRatio", () => {
  let meTokenRegistry: MeTokenRegistry;
  let bancorZeroCurve: BancorZeroCurve;
  let curveRegistry: CurveRegistry;
  let migrationRegistry: MigrationRegistry;
  let singleAssetVault: SingleAssetVault;
  let vaultRegistry: VaultRegistry;
  let foundry: Foundry;
  let hub: Hub;
  let dai: ERC20;
  let tokenHolder: Signer;
  let account0: SignerWithAddress;
  let account1: SignerWithAddress;
  let account2: SignerWithAddress;
  const one = ethers.utils.parseEther("1");
  let baseY: BigNumber;
  const MAX_WEIGHT = 1000000;
  let encodedCurveDetails: string;

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
    const encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
      ["address"],
      [DAI]
    );
    bancorZeroCurve = await deploy<BancorZeroCurve>("BancorZeroCurve");
    let token;
    const firstRefundRatio = 5000;
    console.log(`before hubsetup`);
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
      bancorZeroCurve
    ));
    console.log(`after hubsetup`);
    dai = token;

    // Deploy uniswap migration and approve it to the registry
    const migration = await deploy<UniswapSingleTransfer>(
      "UniswapSingleTransfer",
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
    token
      .connect(tokenHolder)
      .transfer(account2.address, ethers.utils.parseEther("1000"));
    // Create meToken and subscribe to Hub1
    const name = "Carl0 meToken";
    const symbol = "CARL";
    const firstHubId = 1;
    console.log(`before subscribe`);
    const tx = await meTokenRegistry
      .connect(account1)
      .subscribe(name, "CARL", firstHubId, 0);
    console.log(`after subscribe`);
    const meTokenAddr = await meTokenRegistry.getOwnerMeToken(account0.address);
    const meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);
    // Register Hub2 w/ same args but different refund Ratio
    const targetRefundRatio = 1000;

    // Initialize Hub1 update to Hub2 param
    await hub.initUpdate(
      firstHubId,
      bancorZeroCurve.address,
      targetRefundRatio,
      encodedCurveDetails
    );
  });

  describe("During warmup", () => {
    it("initUpdate() cannot be called", async () => {
      // TODO: fast fwd a little bit
    });

    it("Assets received based on initialRefundRatio", async () => {});
  });

  describe("During duration", () => {
    it("initUpdate() cannot be called", async () => {
      // TODO: fast to active duration
    });

    it("Assets received for owner based on weighted average", async () => {
      // TODO: calculate weighted refundRatio based on current time relative to duration
    });

    it("Assets received for buyer based on weighted average", async () => {});
  });

  describe("During cooldown", () => {
    it("initUpdate() cannot be called", async () => {
      // TODO: fast fwd to active cooldown
    });

    it("Before refundRatio set, burn() should use the targetRefundRatio", async () => {});

    it("Call finishUpdate() and update refundRatio to targetRefundRatio", async () => {});
  });

  describe("After cooldown", () => {
    it("initUpdate() can be called again", async () => {
      // TODO: fast fwd to after cooldown
    });

    it("If no burns during cooldown, initUpdate() first calls finishUpdate()", async () => {});

    it("If no burns during cooldown, initUpdate() args are compared to new vals set from on finishUpdate()", async () => {});
  });
});
