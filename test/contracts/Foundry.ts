import { ethers, getNamedAccounts } from "hardhat";
import { CurveRegistry } from "../../artifacts/types/CurveRegistry";
import { Foundry } from "../../artifacts/types/Foundry";
import { Hub } from "../../artifacts/types/Hub";
import { WeightedAverage } from "../../artifacts/types/WeightedAverage";
import { VaultRegistry } from "../../artifacts/types/VaultRegistry";
import {
  calculateCollateralToDepositFromZero,
  deploy,
  getContractAt,
} from "../utils/helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Signer, BigNumber } from "ethers";
import { BancorZeroCurve } from "../../artifacts/types/BancorZeroCurve";
import { ERC20 } from "../../artifacts/types/ERC20";
import { MeTokenFactory } from "../../artifacts/types/MeTokenFactory";
import { MeTokenRegistry } from "../../artifacts/types/MeTokenRegistry";
import { MigrationRegistry } from "../../artifacts/types/MigrationRegistry";
import { SingleAssetVault } from "../../artifacts/types/SingleAssetVault";
import { mineBlock } from "../utils/hardhatNode";
import { Fees } from "../../artifacts/types/Fees";
import { MeToken } from "../../artifacts/types/MeToken";
import { expect } from "chai";
import { UniswapSingleTransfer } from "../../artifacts/types/UniswapSingleTransfer";
import { hubSetup } from "../utils/hubSetup";

describe("Foundry.sol", () => {
  let DAI: string;
  let DAIWhale: string;
  let daiHolder: Signer;
  let dai: ERC20;
  let account0: SignerWithAddress;
  let account1: SignerWithAddress;
  let account2: SignerWithAddress;
  let _curve: BancorZeroCurve;
  let meTokenRegistry: MeTokenRegistry;
  let foundry: Foundry;
  let token: ERC20;
  let meToken: MeToken;
  let tokenHolder: Signer;
  let hub: Hub;
  let singleAssetVault: SingleAssetVault;

  const hubId = 1;
  const name = "Carl meToken";
  const symbol = "CARL";
  const refundRatio = 240000;
  const PRECISION = ethers.utils.parseEther("1");
  // const amount1 = ethers.utils.parseEther("10");
  const amount1 = ethers.utils.parseEther("100");
  const amount2 = ethers.utils.parseEther("6.9");

  // TODO: pass in curve arguments to function
  // TODO: then loop over array of set of curve arguments
  const MAX_WEIGHT = 1000000;
  const reserveWeight = MAX_WEIGHT / 2;
  const baseY = PRECISION.div(1000).toString();

  // for 1 DAI we get 1000 metokens
  // const baseY = ethers.utils.parseEther("1").mul(1000).toString();
  // weight at 50% linear curve
  // const reserveWeight = BigNumber.from(MAX_WEIGHT).div(2).toString();
  before(async () => {
    ({ DAI, DAIWhale } = await getNamedAccounts());
    const encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
      ["address"],
      [DAI]
    );
    // TODO: pass in name of curve to deploy, encodedCurveDetails to general func
    const encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint32"],
      [baseY, reserveWeight]
    );
    _curve = await deploy<BancorZeroCurve>("BancorZeroCurve");

    ({
      token,
      tokenHolder,
      hub,
      foundry,
      account0,
      account1,
      account2,
      meTokenRegistry,
      singleAssetVault,
    } = await hubSetup(encodedCurveDetails, encodedVaultArgs, 5000, _curve));

    // Prefund owner/buyer w/ DAI
    dai = token;
    await dai
      .connect(tokenHolder)
      .transfer(account1.address, ethers.utils.parseEther("100"));
    await dai
      .connect(tokenHolder)
      .transfer(account2.address, ethers.utils.parseEther("100"));
    await dai
      .connect(account1)
      .approve(foundry.address, ethers.utils.parseEther("100"));
    await dai
      .connect(account2)
      .approve(foundry.address, ethers.utils.parseEther("100"));
    await dai
      .connect(account1)
      .approve(meTokenRegistry.address, ethers.utils.parseEther("100"));
  });

  describe("mint()", () => {
    it.only("balanceLocked = 0, balancePooled = 0, mint on meToken creation", async () => {
      let expectedMeTokensMinted = await _curve.viewMeTokensMinted(
        amount1,
        hubId,
        0,
        0
      );
      console.log(
        `expectedMeTokensMinted:${ethers.utils.formatEther(
          expectedMeTokensMinted
        )}`
      );

      // Get balances before mint
      let minterDaiBalanceBefore = await dai.balanceOf(account1.address);
      console.log(
        `minterDaiBalanceBefore:${ethers.utils.formatEther(
          minterDaiBalanceBefore
        )}`
      );
      let vaultDaiBalanceBefore = await dai.balanceOf(singleAssetVault.address);
      console.log(
        `vaultDaiBalanceBefore:${ethers.utils.formatEther(
          vaultDaiBalanceBefore
        )}`
      );
      let expectedAssetsDeposited = await _curve.viewAssetsDeposited(
        expectedMeTokensMinted,
        hubId,
        0,
        0
      );

      const calculated = calculateCollateralToDepositFromZero(
        447.213595499,
        0.001,
        reserveWeight / MAX_WEIGHT
      );

      console.log(`*-*-*--**-*-calculated:${calculated}`);
      // Mint first meTokens to owner
      let tx = await meTokenRegistry
        .connect(account1)
        .subscribe(name, symbol, hubId, amount1);
      let meTokenAddr = await meTokenRegistry.getOwnerMeToken(account1.address);
      meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);

      // Compare expected meTokens minted to actual held
      let meTokensMinted = await meToken.balanceOf(account1.address);
      expect(meTokensMinted).to.equal(expectedMeTokensMinted);
      let totalSupply = await meToken.totalSupply();
      expect(totalSupply).to.equal(meTokensMinted);
      console.log(
        `expectedAssetsDeposited ,  we expected to spend :${ethers.utils.formatEther(
          expectedAssetsDeposited
        )} collateral to get :${ethers.utils.formatEther(
          expectedMeTokensMinted
        )} metokens
        but we spent :${ethers.utils.formatEther(
          amount1
        )} collateral to get :${ethers.utils.formatEther(meTokensMinted)}
        
        `
      );
      // Compare owner dai balance before/after
      let minterDaiBalanceAfter = await dai.balanceOf(account1.address);
      console.log(
        `minterDaiBalanceAfter:${ethers.utils.formatEther(
          minterDaiBalanceAfter
        )}`
      );
      expect(
        // TODO: how to verify difference of numbers to type of amount1?
        minterDaiBalanceBefore.sub(minterDaiBalanceAfter)
      ).to.equal(amount1);

      // Expect balance of vault to have increased by assets deposited
      let vaultDaiBalanceAfter = await dai.balanceOf(singleAssetVault.address);
      console.log(
        `vaultDaiBalanceAfter:${ethers.utils.formatEther(vaultDaiBalanceAfter)}`
      );
      expect(vaultDaiBalanceAfter.sub(vaultDaiBalanceBefore)).to.equal(amount1);
      console.log(
        `amopunt1:${Number.parseFloat(ethers.utils.formatEther(amount1))}`
      );
      console.log(
        `expectedAssetsDeposited:${ethers.utils.formatEther(
          expectedAssetsDeposited
        )}`
      );

      expect(Number(ethers.utils.formatEther(amount1))).to.approximately(
        Number(ethers.utils.formatEther(expectedAssetsDeposited)),
        0.000000000000000000000001
      );
    });

    it("balanceLocked = 0, balancePooled = 0, mint after meToken creation", async () => {
      let expectedMeTokensMinted = await _curve.viewMeTokensMinted(
        amount1,
        hubId,
        0,
        0
      );
      let expectedAssetsDeposited = await _curve.viewAssetsDeposited(
        expectedMeTokensMinted,
        hubId,
        0,
        0
      );

      // Get balances before mint
      let minterDaiBalanceBefore = await dai.balanceOf(account2.address);
      let vaultDaiBalanceBefore = await dai.balanceOf(singleAssetVault.address);

      // Create meToken w/o issuing supply
      const tx = await meTokenRegistry
        .connect(account2)
        .subscribe(name, symbol, hubId, 0);
      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account2.address
      );
      meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);

      // Mint meToken
      await foundry
        .connect(account2)
        .mint(meToken.address, amount1, account2.address);

      // Compare expected meTokens minted to actual held
      const meTokensMinted = await meToken.balanceOf(account2.address);
      expect(meTokensMinted).to.equal(expectedMeTokensMinted);
      const totalSupply = await meToken.totalSupply();
      expect(totalSupply).to.equal(meTokensMinted);

      // Compare buyer dai balance before/after
      let minterDaiBalanceAfter = await dai.balanceOf(account2.address);
      expect(
        Number(minterDaiBalanceBefore) - Number(minterDaiBalanceAfter)
      ).to.equal(amount1);

      // Expect balance of vault to have increased by assets deposited
      let vaultDaiBalanceAfter = await dai.balanceOf(singleAssetVault.address);
      expect(
        Number(vaultDaiBalanceAfter) - Number(vaultDaiBalanceBefore)
      ).to.equal(amount1);
      expect(amount1).to.equal(expectedAssetsDeposited);
    });

    it("balanceLocked = 0, balancePooled > 0", async () => {
      // TODO
    });

    it("balanceLocked > 0, balancePooled = 0", async () => {
      // TODO
    });

    it("balanceLocked > 0, balancePooled > 0", async () => {
      // TODO
    });
  });

  describe("burn()", () => {
    it("balanceLocked = 0, ending supply = 0, buyer", async () => {
      // TODO
    });
    it("balanceLocked = 0, ending supply = 0, owner", async () => {
      // TODO
    });
    it("balanceLocked = 0, ending supply > 0, buyer", async () => {
      // TODO
    });
    it("balanceLocked = 0, ending supply > 0, owner", async () => {
      // TODO
    });
    it("balanceLocked > 0, ending supply = 0, buyer", async () => {
      // TODO
    });
    it("balanceLocked > 0, ending supply = 0, owner", async () => {
      // TODO
    });
    it("balanceLocked > 0, ending supply > 0, buyer", async () => {
      // TODO
    });
    it("balanceLocked > 0, ending supply > 0, owner", async () => {
      // TODO
    });
  });

  /*

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

    const meTokensMinted = await bancorZeroCurve.viewMeTokensMinted(
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
  */
});
