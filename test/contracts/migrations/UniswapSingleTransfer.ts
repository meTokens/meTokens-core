import { ethers, getNamedAccounts } from "hardhat";
import { CurveRegistry } from "../../../artifacts/types/CurveRegistry";
import { Foundry } from "../../../artifacts/types/Foundry";
import { Hub } from "../../../artifacts/types/Hub";
import { WeightedAverage } from "../../../artifacts/types/WeightedAverage";
import { VaultRegistry } from "../../../artifacts/types/VaultRegistry";
import { deploy, getContractAt } from "../../utils/helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Signer, BigNumber } from "ethers";
import { BancorZeroCurve } from "../../../artifacts/types/BancorZeroCurve";
import { ERC20 } from "../../../artifacts/types/ERC20";
import { MeTokenFactory } from "../../../artifacts/types/MeTokenFactory";
import { MeTokenRegistry } from "../../../artifacts/types/MeTokenRegistry";
import { MigrationRegistry } from "../../../artifacts/types/MigrationRegistry";
import { SingleAssetVault } from "../../../artifacts/types/SingleAssetVault";
import { impersonate, mineBlock, passOneHour } from "../../utils/hardhatNode";
import { Fees } from "../../../artifacts/types/Fees";
import { MeToken } from "../../../artifacts/types/MeToken";
import { expect } from "chai";
import { UniswapSingleTransfer } from "../../../artifacts/types/UniswapSingleTransfer";

describe("UniswapSingleTransfer.sol", () => {
  let earliestSwapTime: number;
  let DAI: string;
  let WETH: string;
  let DAIWhale: string;
  let WETHWhale: string;
  let daiHolder: Signer;
  let wethHolder: Signer;
  let dai: ERC20;
  let weth: ERC20;
  let account0: SignerWithAddress; // meToken creator
  let account1: SignerWithAddress; // DAO
  let account2: SignerWithAddress; // buyer
  let weightedAverage: WeightedAverage;
  let meTokenRegistry: MeTokenRegistry;
  let meTokenFactory: MeTokenFactory;
  let curve: BancorZeroCurve;
  let curveRegistry: CurveRegistry;
  let vaultRegistry: VaultRegistry;
  let migrationRegistry: MigrationRegistry;
  let vault: SingleAssetVault;
  let migration: UniswapSingleTransfer;
  let fees: Fees;
  let foundry: Foundry;
  let meToken: MeToken;
  let hub: Hub;
  const hubId1 = 1;
  const hubId2 = 2;
  const name = "Carl meToken";
  const symbol = "CARL";
  const PRECISION = BigNumber.from(10).pow(6);
  const MAX_WEIGHT = 1000000;
  const amount = ethers.utils.parseEther("100");
  const initRefundRatio = 500000;
  // for 1 DAI we get 1000 metokens
  const baseY = ethers.utils.parseEther("1").div(1000).toString();
  // weight at 50% linear curve
  const reserveWeight = BigNumber.from(MAX_WEIGHT).div(2).toString();
  const fee = 3000; // 0.3% - default fee on uniswap
  let encodedCurveDetails: string;
  let encodedVaultDAIArgs: string;
  let encodedVaultWETHArgs: string;
  let encodedMigrationArgs: string;
  let badEncodedMigrationArgs: string;
  before(async () => {
    ({ DAI, DAIWhale, WETH, WETHWhale } = await getNamedAccounts());
    encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint32"],
      [baseY, reserveWeight]
    );
    encodedVaultDAIArgs = ethers.utils.defaultAbiCoder.encode(
      ["address"],
      [DAI]
    );
    encodedVaultWETHArgs = ethers.utils.defaultAbiCoder.encode(
      ["address"],
      [WETH]
    );
    const block = await ethers.provider.getBlock("latest");
    earliestSwapTime = block.timestamp + 600 * 60; // 10h in future
    encodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint24"],
      [earliestSwapTime, fee]
    );

    [account0, account1, account2] = await ethers.getSigners();
    dai = await getContractAt<ERC20>("ERC20", DAI);
    weth = await getContractAt<ERC20>("ERC20", WETH);
    // Prefund owner & buyer w/ DAI & WETH
    daiHolder = await impersonate(DAIWhale);
    wethHolder = await impersonate(WETHWhale);
    dai
      .connect(daiHolder)
      .transfer(account0.address, ethers.utils.parseEther("100"));
    dai
      .connect(daiHolder)
      .transfer(account2.address, ethers.utils.parseEther("1000"));
    weth
      .connect(wethHolder)
      .transfer(account0.address, ethers.utils.parseEther("10"));
    weth
      .connect(wethHolder)
      .transfer(account2.address, ethers.utils.parseEther("100"));

    weightedAverage = await deploy<WeightedAverage>("WeightedAverage");
    curve = await deploy<BancorZeroCurve>("BancorZeroCurve");
    curveRegistry = await deploy<CurveRegistry>("CurveRegistry");
    vaultRegistry = await deploy<VaultRegistry>("VaultRegistry");
    migrationRegistry = await deploy<MigrationRegistry>("MigrationRegistry");
    foundry = await deploy<Foundry>("Foundry", {
      WeightedAverage: weightedAverage.address,
    });

    hub = await deploy<Hub>("Hub");
    meTokenFactory = await deploy<MeTokenFactory>("MeTokenFactory");
    meTokenRegistry = await deploy<MeTokenRegistry>(
      "MeTokenRegistry",
      undefined,
      hub.address,
      meTokenFactory.address,
      migrationRegistry.address
    );
    vault = await deploy<SingleAssetVault>(
      "SingleAssetVault",
      undefined,
      account1.address,
      foundry.address,
      hub.address,
      meTokenRegistry.address,
      migrationRegistry.address
    );
    migration = await deploy<UniswapSingleTransfer>(
      "UniswapSingleTransfer",
      undefined,
      account1.address,
      foundry.address,
      hub.address,
      meTokenRegistry.address,
      migrationRegistry.address
    );

    await curveRegistry.approve(curve.address);
    await vaultRegistry.approve(vault.address);
    await migrationRegistry.approve(
      vault.address,
      vault.address,
      migration.address
    );

    fees = await deploy<Fees>("Fees");
    await fees.initialize(0, 0, 0, 0, 0, 0);
    await hub.initialize(vaultRegistry.address, curveRegistry.address);

    await hub.register(
      DAI,
      vault.address,
      curve.address,
      initRefundRatio,
      encodedCurveDetails,
      encodedVaultDAIArgs
    );
    await hub.register(
      WETH,
      vault.address,
      curve.address,
      initRefundRatio,
      encodedCurveDetails,
      encodedVaultWETHArgs
    );

    await foundry.initialize(
      hub.address,
      fees.address,
      meTokenRegistry.address
    );
    const FOUNDRY = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("FOUNDRY"));
    await meTokenRegistry.grantRole(FOUNDRY, foundry.address);

    // register a metoken w/o collateral
    await meTokenRegistry.connect(account0).subscribe(name, symbol, hubId1, 0);
    const meTokenAddr = await meTokenRegistry.getOwnerMeToken(account0.address);
    meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);
  });
  describe("isValid()", () => {
    it("Returns true for valid encoding", async () => {
      const isValid = await migration.isValid(
        meToken.address,
        encodedMigrationArgs
      );
      expect(isValid).to.be.true;
    });
    it("Returns false for start time before current time", async () => {
      badEncodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint24"],
        [earliestSwapTime - 720 * 60, fee] // 2 hours beforehand
      );
      const isValid = await migration.isValid(
        meToken.address,
        badEncodedMigrationArgs
      );
      expect(isValid).to.be.false;
    });
    it("Returns false for nonexistent meToken", async () => {
      const isValid = await migration.isValid(
        account0.address,
        encodedMigrationArgs
      );
      expect(isValid).to.be.false;
    });
    it("Returns false for invalid fee", async () => {
      badEncodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint24"],
        [earliestSwapTime, 2999]
      );
      const isValid = await migration.isValid(
        meToken.address,
        badEncodedMigrationArgs
      );
      expect(isValid).to.be.false;
    });
  });

  describe("initMigration()", () => {
    it("Set correct _ust values", async () => {
      await meTokenRegistry.initResubscribe(
        meToken.address,
        hubId2,
        migration.address,
        encodedMigrationArgs
      );
      const migrationDetails = await migration.getDetails(meToken.address);
      expect(migrationDetails.fee).to.equal(fee);
      expect(migrationDetails.soonest).to.equal(earliestSwapTime);
    });
    it("Fails from bad encodings", async () => {
      await expect(
        meTokenRegistry.initResubscribe(
          meToken.address,
          hubId2,
          migration.address,
          badEncodedMigrationArgs
        )
      ).to.be.revertedWith("Invalid _encodedMigrationArgs");
    });
  });

  describe("poke()", () => {
    it("Trigger startMigration()", async () => {});
  });
  // it("", async () => {

  //     const balBefore = await dai.balanceOf(account0.address);

  //     // need an approve of metoken registry first
  //     await dai.approve(foundry.address, amount);
  //     await foundry.mint(meToken.address, amount, account2.address);

  //     const meTokenDetails = await meTokenRegistry.getDetails(meToken.address);

  // });
  // it("burn() from buyer should work", async () => {
  //     await foundry
  //         .connect(account2)
  //         .burn(meToken.address, balBefore, account2.address);
  // });
  // describe("during migration", () => {
  //     before(async () => {
  //         // migrate meToken
  //         // refund ratio stays the same
  //         const targetRefundRatio = 200000;

  //         // 10 hour
  //         await hub.setDuration(600 * 60);
  //         await hub.setWarmup(60 * 60);
  //         await hub.setCooldown(60 * 60);
  //         // vault stays the same
  //     });
  //     it("After migration, mint() takes WETH deposited", async () => {

  //     });
  //     it("burn() Should work", async () => {
  //         const balBefore = await meToken.balanceOf(account2.address);
  //         const balDaiBefore = await dai.balanceOf(account2.address);

  //         const hubDetail = await hub.getDetails(hubId1);
  //         const balVaultBefore = await dai.balanceOf(hubDetail.vault);
  //         await foundry
  //             .connect(account2)
  //             .burn(meToken.address, balBefore, account2.address);
  //         const balAfter = await meToken.balanceOf(account2.address);
  //         const balDaiAfter = await dai.balanceOf(account2.address);
  //         expect(balAfter).equal(0);
  //         expect(await meToken.totalSupply()).to.equal(0);
  //         expect(balDaiAfter).to.be.gt(balDaiBefore);

  //         const balVaultAfter = await dai.balanceOf(hubDetail.vault);
  //         expect(balVaultBefore.sub(balVaultAfter)).equal(
  //             balDaiAfter.sub(balDaiBefore)
  //         );
  //     });
  //     it("mint() Should work after some time during the migration ", async () => {
  //         // metoken should be registered
  //         let block = await ethers.provider.getBlock("latest");
  //         await mineBlock(block.timestamp + 60 * 60);

  //         const hubDetail = await hub.getDetails(hubId1);
  //         block = await ethers.provider.getBlock("latest");
  //         expect(hubDetail.startTime).to.be.lt(block.timestamp);
  //         const balVaultBefore = await dai.balanceOf(hubDetail.vault);
  //         const balBefore = await dai.balanceOf(account2.address);
  //         // need an approve of metoken registry first
  //         await dai.connect(account2).approve(foundry.address, amount);
  //         await foundry
  //             .connect(account2)
  //             .mint(meToken.address, amount, account2.address);
  //         const balAfter = await dai.balanceOf(account2.address);
  //         expect(balBefore.sub(balAfter)).equal(amount);

  //         const balVaultAfter = await dai.balanceOf(hubDetail.vault);
  //         expect(balVaultAfter).equal(balVaultBefore.add(amount));
  //         // assert token infos
  //         const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
  //             account0.address
  //         );
  //         expect(meTokenAddr).to.equal(meToken.address);
  //         // should be greater than 0
  //         expect(await meToken.totalSupply()).to.equal(
  //             await meToken.balanceOf(account2.address)
  //         );
  //     });
  // });
});
