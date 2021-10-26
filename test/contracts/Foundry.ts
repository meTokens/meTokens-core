import { ethers, getNamedAccounts } from "hardhat";
import { CurveRegistry } from "../../artifacts/types/CurveRegistry";
import { Foundry } from "../../artifacts/types/Foundry";
import { Hub } from "../../artifacts/types/Hub";
import { WeightedAverage } from "../../artifacts/types/WeightedAverage";
import { VaultRegistry } from "../../artifacts/types/VaultRegistry";
import { deploy, getContractAt } from "../utils/helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Signer, BigNumber } from "ethers";
import { BancorZeroCurve } from "../../artifacts/types/BancorZeroCurve";
import { ERC20 } from "../../artifacts/types/ERC20";
import { MeTokenFactory } from "../../artifacts/types/MeTokenFactory";
import { MeTokenRegistry } from "../../artifacts/types/MeTokenRegistry";
import { MigrationRegistry } from "../../artifacts/types/MigrationRegistry";
import { SingleAssetVault } from "../../artifacts/types/SingleAssetVault";
import { impersonate, passOneHour } from "../utils/hardhatNode";
import { Fees } from "../../artifacts/types/Fees";
import { MeToken } from "../../artifacts/types/MeToken";
import { expect } from "chai";
import { UniswapSingleTransfer } from "../../artifacts/types/UniswapSingleTransfer";

describe("Foundry.sol", () => {
  let DAI: string;
  let weightedAverage: WeightedAverage;
  let meTokenRegistry: MeTokenRegistry;
  let meTokenFactory: MeTokenFactory;
  let bancorZeroCurve: BancorZeroCurve;
  let curveRegistry: CurveRegistry;
  let vaultRegistry: VaultRegistry;
  let migrationRegistry: MigrationRegistry;
  let singleAssetVault: SingleAssetVault;
  let fees: Fees;
  let foundry: Foundry;
  let meToken: MeToken;
  let hub: Hub;
  let dai: ERC20;
  let account0: SignerWithAddress;
  let account1: SignerWithAddress;
  let account2: SignerWithAddress;
  let daiHolder: Signer;
  let DAIWhale: string;
  let hubId: number;
  const name = "Carl0 meToken";
  const symbol = "CARL";
  const PRECISION = BigNumber.from(10).pow(18);
  const MAX_WEIGHT = 1000000;

  before(async () => {
    ({ DAI, DAIWhale } = await getNamedAccounts());
    [account0, account1, account2] = await ethers.getSigners();
    dai = await getContractAt<ERC20>("ERC20", DAI);
    daiHolder = await impersonate(DAIWhale);
    dai
      .connect(daiHolder)
      .transfer(account1.address, ethers.utils.parseEther("1000"));
    dai
      .connect(daiHolder)
      .transfer(account2.address, ethers.utils.parseEther("1000"));
    weightedAverage = await deploy<WeightedAverage>("WeightedAverage");
    bancorZeroCurve = await deploy<BancorZeroCurve>("BancorZeroCurve");
    curveRegistry = await deploy<CurveRegistry>("CurveRegistry");
    vaultRegistry = await deploy<VaultRegistry>("VaultRegistry");
    migrationRegistry = await deploy<MigrationRegistry>("MigrationRegistry");

    foundry = await deploy<Foundry>("Foundry", {
      WeightedAverage: weightedAverage.address,
    });

    hub = await deploy<Hub>("Hub");
    singleAssetVault = await deploy<SingleAssetVault>(
      "SingleAssetVault",
      undefined, //no libs
      account0.address, // DAO
      foundry.address // foundry
    );

    meTokenFactory = await deploy<MeTokenFactory>("MeTokenFactory");
    meTokenRegistry = await deploy<MeTokenRegistry>(
      "MeTokenRegistry",
      undefined,
      hub.address,
      meTokenFactory.address,
      migrationRegistry.address
    );
    await curveRegistry.register(bancorZeroCurve.address);

    await vaultRegistry.approve(singleAssetVault.address);
    fees = await deploy<Fees>("Fees");

    await fees.initialize(0, 0, 0, 0, 0, 0);

    await hub.initialize(vaultRegistry.address, curveRegistry.address);
    // for 1 DAI we get 1000 metokens
    const baseY = PRECISION.div(1000).toString();
    // weight at 50% linear curve
    const reserveWeight = BigNumber.from(MAX_WEIGHT).div(2).toString();

    const encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint32"],
      [baseY, reserveWeight]
    );
    const encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
      ["address"],
      [DAI]
    );

    await hub.register(
      singleAssetVault.address,
      bancorZeroCurve.address,
      50000, //refund ratio
      encodedCurveDetails,
      encodedVaultArgs
    );
    hubId = 0;
    await foundry.initialize(
      hub.address,
      fees.address,
      meTokenRegistry.address
    );

    // register a metoken
    const tx = await meTokenRegistry
      .connect(account0)
      .register(name, symbol, hubId, 0);
    const meTokenAddr = await meTokenRegistry.getOwnerMeToken(account0.address);

    // assert token infos
    meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);
  });

  it("mint() Should work", async () => {
    // metoken should be registered
    expect(await meToken.name()).to.equal(name);
    expect(await meToken.symbol()).to.equal(symbol);
    expect(await meToken.decimals()).to.equal(18);
    expect(await meToken.totalSupply()).to.equal(0);
    // mint

    const amount = 100;
    const balBefore = await dai.balanceOf(account2.address);
    // need an approve of metoken registry first
    await dai.connect(account2).approve(meTokenRegistry.address, amount);
    await foundry.mint(meToken.address, amount, account2.address);
    const balAfter = await dai.balanceOf(account2.address);
    expect(balBefore.sub(balAfter)).equal(amount);
    const hubDetail = await hub.getDetails(hubId);
    const balVault = await dai.balanceOf(hubDetail.vault);
    expect(balVault).equal(amount);
    // assert token infos
    const meTokenAddr = await meTokenRegistry.getOwnerMeToken(account0.address);
    expect(meTokenAddr).to.equal(meToken.address);
    // should be greater than 0
    expect(await meToken.totalSupply()).to.equal(100000);
  });

  it("burn() Should work", async () => {
    const balBefore = await meToken.balanceOf(account2.address);
    const balDaiBefore = await dai.balanceOf(account2.address);
    await foundry.burn(meToken.address, balBefore, account2.address);
    const balAfter = await meToken.balanceOf(account2.address);
    const balDaiAfter = await dai.balanceOf(account2.address);
    expect(balAfter).equal(0);
    expect(await meToken.totalSupply()).to.equal(0);
    expect(balDaiAfter).equal(ethers.utils.parseEther("1000"));

    const hubDetail = await hub.getDetails(hubId);
    const balVault = await dai.balanceOf(hubDetail.vault);
  });
  describe("during migration", () => {
    before(async () => {
      // migrate hub
      // refund ratio stays the same
      const targetRefundRatio = 50000;
      const newCurve = await deploy<BancorZeroCurve>("BancorZeroCurve");
      const encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [DAI]
      );

      // for 1 DAI we get 1 metokens
      const baseY = PRECISION.toString();
      // weight at 10% quadratic curve
      const reserveWeight = BigNumber.from(MAX_WEIGHT).div(4).toString();

      const encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint32"],
        [baseY, reserveWeight]
      );
      const migrationFactory = await deploy<UniswapSingleTransfer>(
        "UniswapSingleTransfer"
      );
      const block = await ethers.provider.getBlock("latest");
      // earliestSwapTime 10 hour
      const earliestSwapTime = block.timestamp + 600 * 60;
      const encodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
        ["uint256"],
        [earliestSwapTime]
      );
      // 10 hour
      await hub.setDuration(600 * 60);
      await hub.setWarmup(60 * 60);
      await hub.setCooldown(60 * 60);
      // vault stays the same
      await hub.initUpdate(
        hubId,
        newCurve.address,
        targetRefundRatio,
        encodedCurveDetails
      );
    });

    it("mint() Should work the same right after the migration ", async () => {
      // metoken should be registered
      const block = await ethers.provider.getBlock("latest");
      let hubDetail = await hub.getDetails(hubId);
      expect(hubDetail.reconfigure).to.be.true;
      expect(hubDetail.updating).to.be.true;
      expect(hubDetail.startTime).to.equal(block.timestamp);

      const amount = 100;
      const balBefore = await dai.balanceOf(account2.address);
      // need an approve of metoken registry first
      await dai.connect(account2).approve(meTokenRegistry.address, amount);
      await foundry.mint(meToken.address, amount, account2.address);
      const balAfter = await dai.balanceOf(account2.address);
      expect(balBefore.sub(balAfter)).equal(amount);
      hubDetail = await hub.getDetails(hubId);
      const balVault = await dai.balanceOf(hubDetail.vault);
      expect(balVault).equal(amount);
      // assert token infos
      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account0.address
      );
      expect(meTokenAddr).to.equal(meToken.address);
      // should be greater than 0
      expect(await meToken.totalSupply()).to.equal(100000);
    });
    it("burn() Should work", async () => {
      const balBefore = await meToken.balanceOf(account2.address);
      const balDaiBefore = await dai.balanceOf(account2.address);
      await foundry.burn(meToken.address, balBefore, account2.address);
      const balAfter = await meToken.balanceOf(account2.address);
      const balDaiAfter = await dai.balanceOf(account2.address);
      expect(balAfter).equal(0);
      expect(await meToken.totalSupply()).to.equal(0);
      expect(balDaiAfter).equal(ethers.utils.parseEther("1000"));

      const hubDetail = await hub.getDetails(hubId);
      const balVault = await dai.balanceOf(hubDetail.vault);
    });
    it("mint() Should work after some time during the migration ", async () => {
      // metoken should be registered
      await passOneHour();

      const amount = 100;
      const balBefore = await dai.balanceOf(account2.address);
      // need an approve of metoken registry first
      await dai.connect(account2).approve(meTokenRegistry.address, amount);
      await foundry.mint(meToken.address, amount, account2.address);
      const balAfter = await dai.balanceOf(account2.address);
      expect(balBefore.sub(balAfter)).equal(amount);
      const hubDetail = await hub.getDetails(hubId);
      const balVault = await dai.balanceOf(hubDetail.vault);
      expect(balVault).equal(amount);
      // assert token infos
      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account0.address
      );
      expect(meTokenAddr).to.equal(meToken.address);
      // should be greater than 0
      expect(await meToken.totalSupply()).to.equal(100000);
    });
  });
});
