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
import { impersonate, mineBlock, passOneHour } from "../utils/hardhatNode";
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
  const hubId = 1;
  const name = "Carl0 meToken";
  const symbol = "CARL";
  const PRECISION = BigNumber.from(10).pow(6);
  const MAX_WEIGHT = 1000000;
  const amount = ethers.utils.parseEther("100");
  const initRefundRatio = 500000;
  // for 1 DAI we get 1000 metokens
  const baseY = ethers.utils.parseEther("1").mul(1000).toString();
  // weight at 50% linear curve
  const reserveWeight = BigNumber.from(MAX_WEIGHT).div(2).toString();
  before(async () => {
    ({ DAI, DAIWhale } = await getNamedAccounts());
    [account0, account1, account2] = await ethers.getSigners();
    dai = await getContractAt<ERC20>("ERC20", DAI);
    daiHolder = await impersonate(DAIWhale);
    dai
      .connect(daiHolder)
      .transfer(account0.address, ethers.utils.parseEther("100"));
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
    meTokenFactory = await deploy<MeTokenFactory>("MeTokenFactory");
    meTokenRegistry = await deploy<MeTokenRegistry>(
      "MeTokenRegistry",
      undefined,
      hub.address,
      meTokenFactory.address,
      migrationRegistry.address
    );
    singleAssetVault = await deploy<SingleAssetVault>(
      "SingleAssetVault",
      undefined, //no libs
      account1.address, // DAO
      foundry.address, // foundry
      hub.address, // hub
      meTokenRegistry.address, //IMeTokenRegistry
      migrationRegistry.address //IMigrationRegistry
    );

    await curveRegistry.approve(bancorZeroCurve.address);

    await vaultRegistry.approve(singleAssetVault.address);
    fees = await deploy<Fees>("Fees");

    await fees.initialize(0, 0, 0, 0, 0, 0);
    await hub.initialize(vaultRegistry.address, curveRegistry.address);

    const encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint32"],
      [baseY, reserveWeight]
    );
    const encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
      ["address"],
      [DAI]
    );

    // refund ratio of 50000 = 0.00000000000005 ETH
    // max ratio is 1 ETH = 1000000000000000000
    // refund ratio is therefor 0,000000000005 %
    await hub.register(
      DAI,
      singleAssetVault.address,
      bancorZeroCurve.address,
      initRefundRatio, //refund ratio
      encodedCurveDetails,
      encodedVaultArgs
    );
    await foundry.initialize(
      hub.address,
      fees.address,
      meTokenRegistry.address
    );

    // register a metoken
    const tx = await meTokenRegistry
      .connect(account0)
      .subscribe(name, symbol, hubId, 0);
    const meTokenAddr = await meTokenRegistry.getOwnerMeToken(account0.address);

    // assert token infos
    meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);
    const FOUNDRY = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("FOUNDRY"));
    await meTokenRegistry.grantRole(FOUNDRY, foundry.address);
  });
  it("mint() from owner should work", async () => {});
  it("mint() from owner with a small amount should work", async () => {});
  it("mint() from owner with a huge amount should work", async () => {});
  it("burn() from owner should work", async () => {});
  it("burn() from owner with a small amount should work", async () => {});
  it("burn() from owner with a huge amount should work", async () => {});
  it("mint() from buyer should work", async () => {
    // metoken should be registered
    expect(await meToken.name()).to.equal(name);
    expect(await meToken.symbol()).to.equal(symbol);
    expect(await meToken.decimals()).to.equal(18);
    expect(await meToken.totalSupply()).to.equal(0);
    // mint

    const balBefore = await dai.balanceOf(account0.address);

    // need an approve of metoken registry first
    // await dai.connect(account2).approve(foundry.address, amount);
    await dai.approve(foundry.address, amount);
    const tokenBalBefore = await meToken.balanceOf(account2.address);

    const meTokenDetails = await meTokenRegistry.getDetails(meToken.address);
    // gas savings
    const totalSupply = await meToken.totalSupply();

    const meTokensMinted = await bancorZeroCurve.calculateMintReturn(
      amount,
      hubId,
      totalSupply,
      meTokenDetails.balancePooled
    );
    await foundry.mint(meToken.address, amount, account2.address);
    const tokenBalAfter = await meToken.balanceOf(account2.address);
    const balAfter = await dai.balanceOf(account0.address);
    expect(balBefore.sub(balAfter)).equal(amount);
    expect(tokenBalAfter.sub(tokenBalBefore)).equal(meTokensMinted);
    const hubDetail = await hub.getDetails(hubId);
    const balVault = await dai.balanceOf(hubDetail.vault);
    expect(balVault).equal(amount);
    // assert token infos
    const meTokenAddr = await meTokenRegistry.getOwnerMeToken(account0.address);
    expect(meTokenAddr).to.equal(meToken.address);
    // should be greater than 0
    expect(await meToken.totalSupply()).to.equal(
      totalSupply.add(meTokensMinted)
    );
  });
  it("burn() from buyer should work", async () => {
    const balBefore = await meToken.balanceOf(account2.address);
    const balDaiBefore = await dai.balanceOf(account2.address);
    await foundry
      .connect(account2)
      .burn(meToken.address, balBefore, account2.address);
    const balAfter = await meToken.balanceOf(account2.address);
    const balDaiAfter = await dai.balanceOf(account2.address);
    expect(balAfter).equal(0);
    expect(await meToken.totalSupply()).to.equal(0);

    const calculatedCollateralReturned = amount
      .mul(initRefundRatio)
      .div(PRECISION);
    expect(balDaiAfter.sub(balDaiBefore)).equal(calculatedCollateralReturned);
  });
  describe("during migration", () => {
    before(async () => {
      // migrate hub
      // refund ratio stays the same
      const targetRefundRatio = 200000;
      const newCurve = await deploy<BancorZeroCurve>("BancorZeroCurve");
      const encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [DAI]
      );
      await curveRegistry.approve(newCurve.address);
      // for 1 DAI we get 1 metokens
      const baseY = PRECISION.toString();
      // weight at 10% quadratic curve
      const reserveWeight = BigNumber.from(MAX_WEIGHT).div(4).toString();

      const encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint32"],
        [baseY, reserveWeight]
      );
      const migrationFactory = await deploy<UniswapSingleTransfer>(
        "UniswapSingleTransfer",
        undefined, //no libs
        account1.address, // DAO
        foundry.address, // foundry
        hub.address, // hub
        meTokenRegistry.address, //IMeTokenRegistry
        migrationRegistry.address //IMigrationRegistry
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
      let hubDetail = await hub.getDetails(hubId);
      expect(hubDetail.reconfigure).to.be.false;
      expect(hubDetail.updating).to.be.true;

      const amount = ethers.utils.parseEther("100");
      const balTokenBefore = await meToken.balanceOf(account2.address);
      const balBefore = await dai.balanceOf(account2.address);
      // need an approve of metoken registry first
      await dai.connect(account2).approve(foundry.address, amount);
      const balVaultBefore = await dai.balanceOf(hubDetail.vault);
      const totSupplyBefore = await meToken.totalSupply();
      const tokenBalBefore = await meToken.balanceOf(account2.address);
      await foundry
        .connect(account2)
        .mint(meToken.address, amount, account2.address);
      const balAfter = await dai.balanceOf(account2.address);
      const balTokenAfter = await meToken.balanceOf(account2.address);
      expect(balTokenAfter).to.be.gt(balTokenBefore);
      expect(balBefore.sub(balAfter)).equal(amount);
      hubDetail = await hub.getDetails(hubId);
      const balVaultAfter = await dai.balanceOf(hubDetail.vault);
      expect(balVaultAfter.sub(balVaultBefore)).equal(amount);
      // assert token infos
      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account0.address
      );
      expect(meTokenAddr).to.equal(meToken.address);
      // should be greater than 0
      const totSupplyAfter = await meToken.totalSupply();
      const tokenBalAfter = await meToken.balanceOf(account2.address);
      expect(tokenBalAfter).to.be.gt(tokenBalBefore);
      expect(totSupplyAfter.sub(totSupplyBefore)).to.equal(
        tokenBalAfter.sub(tokenBalBefore)
      );
    });
    it("burn() Should work", async () => {
      const balBefore = await meToken.balanceOf(account2.address);
      const balDaiBefore = await dai.balanceOf(account2.address);

      const hubDetail = await hub.getDetails(hubId);
      const balVaultBefore = await dai.balanceOf(hubDetail.vault);
      await foundry
        .connect(account2)
        .burn(meToken.address, balBefore, account2.address);
      const balAfter = await meToken.balanceOf(account2.address);
      const balDaiAfter = await dai.balanceOf(account2.address);
      expect(balAfter).equal(0);
      expect(await meToken.totalSupply()).to.equal(0);
      expect(balDaiAfter).to.be.gt(balDaiBefore);

      const balVaultAfter = await dai.balanceOf(hubDetail.vault);
      expect(balVaultBefore.sub(balVaultAfter)).equal(
        balDaiAfter.sub(balDaiBefore)
      );
    });
    it("mint() Should work after some time during the migration ", async () => {
      // metoken should be registered
      let block = await ethers.provider.getBlock("latest");
      await mineBlock(block.timestamp + 60 * 60);

      const hubDetail = await hub.getDetails(hubId);
      block = await ethers.provider.getBlock("latest");
      expect(hubDetail.startTime).to.be.lt(block.timestamp);
      const balVaultBefore = await dai.balanceOf(hubDetail.vault);
      const balBefore = await dai.balanceOf(account2.address);
      // need an approve of metoken registry first
      await dai.connect(account2).approve(foundry.address, amount);
      await foundry
        .connect(account2)
        .mint(meToken.address, amount, account2.address);
      const balAfter = await dai.balanceOf(account2.address);
      expect(balBefore.sub(balAfter)).equal(amount);

      const balVaultAfter = await dai.balanceOf(hubDetail.vault);
      expect(balVaultAfter).equal(balVaultBefore.add(amount));
      // assert token infos
      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account0.address
      );
      expect(meTokenAddr).to.equal(meToken.address);
      // should be greater than 0
      expect(await meToken.totalSupply()).to.equal(
        await meToken.balanceOf(account2.address)
      );
    });
  });
});
