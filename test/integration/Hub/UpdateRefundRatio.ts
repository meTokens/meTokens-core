import { ethers, getNamedAccounts } from "hardhat";
import {
  deploy,
  getContractAt,
  toETHNum,
  weightedAverageSimulation,
} from "../../utils/helpers";
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
import { passOneDay, passOneHour } from "../../utils/hardhatNode";
import { beforeEach } from "mocha";

describe("Hub - update RefundRatio", () => {
  let meTokenRegistry: MeTokenRegistry;
  let bancorZeroCurve: BancorZeroCurve;
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
  const firstHubId = 1;
  const firstRefundRatio = 5000;
  const targetRefundRatio = 500000; // 50%
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
    await token
      .connect(tokenHolder)
      .transfer(account2.address, ethers.utils.parseEther("1000"));
    // Create meToken and subscribe to Hub1
    const name = "Carl0 meToken";
    const symbol = "CARL";

    console.log(`before subscribe`);
    const tx = await meTokenRegistry
      .connect(account0)
      .subscribe(name, "CARL", firstHubId, 0);
    console.log(`after subscribe`);
    const meTokenAddr = await meTokenRegistry.getOwnerMeToken(account0.address);
    console.log(`meTokenAddr :${meTokenAddr}`);
    meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);
    // Register Hub2 w/ same args but different refund Ratio

    const tokenDeposited = ethers.utils.parseEther("100");
    await token.connect(account2).approve(foundry.address, tokenDeposited);
    console.log(`account2 :${account2.address}`);
    const balBefore = await meToken.balanceOf(account2.address);
    console.log(`meTokssss`);
    console.log(`balBefore :${ethers.utils.formatEther(balBefore)}`);
    const vaultBalBefore = await token.balanceOf(singleAssetVault.address);
    console.log(`vaultBalBefore :${ethers.utils.formatEther(vaultBalBefore)}`);
    await foundry
      .connect(account2)
      .mint(meTokenAddr, tokenDeposited, account2.address);
    const balAfter = await meToken.balanceOf(account2.address);
    const vaultBalAfter = await token.balanceOf(singleAssetVault.address);
    console.log(`vaultBalAfter :${ethers.utils.formatEther(vaultBalAfter)}`);
    expect(vaultBalAfter.sub(vaultBalBefore)).to.equal(tokenDeposited);
    console.log(`balAfter :${ethers.utils.formatEther(balAfter)}`);
    // Initialize Hub1 update to Hub2 param
  });

  describe("During warmup", () => {
    before(async () => {
      //setWarmup for 2 days
      let warmup = await hub.getWarmup();
      expect(warmup).to.equal(0);
      await hub.setWarmup(172800);

      warmup = await hub.getWarmup();
      expect(warmup).to.equal(172800);
      await hub.initUpdate(
        firstHubId,
        bancorZeroCurve.address,
        targetRefundRatio,
        encodedCurveDetails
      );
    });
    it("initUpdate() cannot be called", async () => {
      // TODO: fast fwd a little bit
      let lastBlock = await ethers.provider.getBlock("latest");
      console.log(`lastBlock.timestamp:${lastBlock.timestamp}`);

      await passOneDay();
      lastBlock = await ethers.provider.getBlock("latest");
      console.log(`lastBlock.timestamp:${lastBlock.timestamp}`);
      //await hub.setWarmup(172801);
      lastBlock = await ethers.provider.getBlock("latest");
      console.log(`lastBlock.timestamp:${lastBlock.timestamp}`);
      await expect(
        hub.initUpdate(1, bancorZeroCurve.address, 1000, encodedCurveDetails)
      ).to.be.revertedWith("already updating");
    });

    it("Assets received based on initialRefundRatio", async () => {
      const tokenDepositedInETH = 100;
      const tokenDeposited = ethers.utils.parseEther(
        tokenDepositedInETH.toString()
      );

      await token.connect(account2).approve(foundry.address, tokenDeposited);

      console.log(`account2 :${account2.address}`);
      const balBefore = await meToken.balanceOf(account0.address);
      const balDaiBefore = await token.balanceOf(account0.address);
      console.log(`meTokssss`);
      console.log(`balBefore :${ethers.utils.formatEther(balBefore)}`);
      console.log(`balDaiBefore :${ethers.utils.formatEther(balDaiBefore)}`);
      const vaultBalBefore = await token.balanceOf(singleAssetVault.address);
      console.log(
        `**vault**BalBefore :${ethers.utils.formatEther(vaultBalBefore)}`
      );
      await foundry
        .connect(account2)
        .mint(meToken.address, tokenDeposited, account0.address);
      const balAfter = await meToken.balanceOf(account0.address);
      console.log(`balAfter :${ethers.utils.formatEther(balAfter)}`);
      const vaultBalAfter = await token.balanceOf(singleAssetVault.address);
      console.log(
        `**vault**BalAfter :${ethers.utils.formatEther(vaultBalAfter)}`
      );
      expect(vaultBalAfter.sub(vaultBalBefore)).to.equal(tokenDeposited);

      const balDaiAcc1Before = await token.balanceOf(account1.address);
      console.log(
        `balDaiAcc1Before :${ethers.utils.formatEther(balDaiAcc1Before)}`
      );

      //send half burnt by owner

      await foundry
        .connect(account0)
        .burn(meToken.address, balAfter, account0.address);
      const balDaiAfter = await token.balanceOf(account0.address);
      console.log(`balDaiAfter :${ethers.utils.formatEther(balDaiAfter)}`);
      const vaultBalAfterBurn = await token.balanceOf(singleAssetVault.address);
      console.log(
        `**vault**BalAfterBurn :${ethers.utils.formatEther(vaultBalAfterBurn)}`
      );
      // we have less DAI in the vault cos they have been sent to the burner
      expect(vaultBalAfter.sub(vaultBalAfterBurn)).to.equal(
        balDaiAfter.sub(balDaiBefore)
      );
      // buyer
      const balAcc1Before = await meToken.balanceOf(account1.address);
      console.log(`balAcc1Before :${ethers.utils.formatEther(balAcc1Before)}`);
      await token.connect(account1).approve(foundry.address, tokenDeposited);
      await foundry
        .connect(account1)
        .mint(meToken.address, tokenDeposited, account1.address);
      const vaultBalAfterMint = await token.balanceOf(singleAssetVault.address);
      console.log(
        `**vault**BalAfterMint :${ethers.utils.formatEther(vaultBalAfterMint)}`
      );
      expect(vaultBalAfterMint.sub(vaultBalAfterBurn)).to.equal(tokenDeposited);

      const balDaiAcc1AfterMint = await token.balanceOf(account1.address);
      console.log(
        `balDaiAcc1AfterMint :${ethers.utils.formatEther(balDaiAcc1AfterMint)}`
      );
      const balAcc1After = await meToken.balanceOf(account1.address);
      console.log(`balAcc1After :${ethers.utils.formatEther(balAcc1After)}`);
      expect(balAcc1After.sub(balAcc1Before)).to.equal(
        balAfter.sub(balBefore).sub(ethers.utils.parseUnits("1", "wei"))
      );
      //send half burnt by buyer
      await foundry
        .connect(account1)
        .burn(meToken.address, balAcc1After, account1.address);
      const balDaiAcc1After = await token.balanceOf(account1.address);
      console.log(
        `balDaiAcc1After :${ethers.utils.formatEther(balDaiAcc1After)}`
      );
      const vaultBalAfterBuyerBurn = await token.balanceOf(
        singleAssetVault.address
      );
      console.log(
        `**vault**BalAfterBuyerBurn :${ethers.utils.formatEther(
          vaultBalAfterBuyerBurn
        )}`
      );
      // we have less DAI in the vault cos they have been sent to the burner
      expect(vaultBalAfterMint.sub(vaultBalAfterBuyerBurn)).to.equal(
        balDaiAcc1After.sub(balDaiAcc1Before.sub(tokenDeposited))
      );
      expect(
        Number(
          ethers.utils.formatEther(
            tokenDeposited.sub(balDaiAcc1Before.sub(balDaiAcc1After))
          )
        )
      ).to.equal((tokenDepositedInETH * firstRefundRatio) / MAX_WEIGHT);
    });
  });

  describe("During duration", () => {
    before(async () => {
      await passOneHour();
    });
    it("initUpdate() cannot be called", async () => {
      // TODO: fast to active duration
      await expect(
        hub.initUpdate(1, bancorZeroCurve.address, 1000, encodedCurveDetails)
      ).to.be.revertedWith("already updating");
      const {
        active,
        refundRatio,
        updating,
        startTime,
        endTime,
        endCooldown,
        reconfigure,
        targetRefundRatio,
      } = await hub.getDetails(1);
      console.log(`reconfigure :${reconfigure}`);
      console.log(`endCooldown :${endCooldown.toNumber()}`);
      console.log(`active :${active}`);
      console.log(`updating :${updating}`);
      console.log(`refundRatio :${refundRatio.toNumber()}`);
      console.log(`startTime :${startTime.toNumber()}`);
      console.log(`endTime :${endTime.toNumber()}`);
      console.log(`targetRefundRatio :${targetRefundRatio.toNumber()}`);
      const block = await ethers.provider.getBlock("latest");
      console.log(`block.timestamp :${block.timestamp}`);
    });

    it("Assets received for owner  are not based on weighted average refund ratio only applies to buyer", async () => {
      // TODO: calculate weighted refundRatio based on current time relative to duration
      const tokenDepositedInETH = 100;
      const tokenDeposited = ethers.utils.parseEther(
        tokenDepositedInETH.toString()
      );

      await token.connect(account2).approve(foundry.address, tokenDeposited);

      console.log(`account2 :${account2.address}`);
      const balBefore = await meToken.balanceOf(account0.address);
      const balDaiBefore = await token.balanceOf(account0.address);
      console.log(`meTokssss`);
      console.log(`balBefore :${ethers.utils.formatEther(balBefore)}`);
      console.log(`balDaiBefore :${ethers.utils.formatEther(balDaiBefore)}`);
      const vaultBalBefore = await token.balanceOf(singleAssetVault.address);
      console.log(
        `**vault**BalBefore :${ethers.utils.formatEther(vaultBalBefore)}`
      );
      // send token to owner
      await foundry
        .connect(account2)
        .mint(meToken.address, tokenDeposited, account0.address);
      const balAfter = await meToken.balanceOf(account0.address);
      console.log(`balAfter :${ethers.utils.formatEther(balAfter)}`);
      const vaultBalAfterMint = await token.balanceOf(singleAssetVault.address);
      console.log(
        `**vault**BalAfterMint :${ethers.utils.formatEther(vaultBalAfterMint)}`
      );
      expect(vaultBalAfterMint.sub(vaultBalBefore)).to.equal(tokenDeposited);
      //  burnt by owner
      await meToken.connect(account0).approve(foundry.address, balAfter);
      const allowance = await token.allowance(
        singleAssetVault.address,
        foundry.address
      );
      console.log(`//allowance :${ethers.utils.formatEther(allowance)}`);
      const meTotSupply = await meToken.totalSupply();
      console.log(`
      metokens totalSupply:${ethers.utils.formatEther(meTotSupply)}`);
      const meDetails = await meTokenRegistry.getDetails(meToken.address);
      console.log(` 
      meDetails.endCooldown :${meDetails.endCooldown} 
      meDetails.balanceLocked :${ethers.utils.formatEther(
        meDetails.balanceLocked
      )} 
      meDetails.balancePooled :${ethers.utils.formatEther(
        meDetails.balancePooled
      )}
      meDetails.migration :${meDetails.migration} 
      meDetails.startTime :${meDetails.startTime.toNumber()} 
      meDetails.endTime :${meDetails.endTime.toNumber()} `);
      const tokensReturned = await foundry.calculateBurnReturn(
        meToken.address,
        balAfter
      );
      console.log(
        `tokensReturned :${ethers.utils.formatEther(tokensReturned)}`
      );
      const rewardFromLockedPool = one
        .mul(balAfter)
        .mul(meDetails.balanceLocked)
        .div(meTotSupply)
        .div(one);
      console.log(
        `rewardFromLockedPool :${ethers.utils.formatEther(
          rewardFromLockedPool
        )}`
      );
      await foundry
        .connect(account0)
        .burn(meToken.address, balAfter, account0.address);
      const balDaiAfter = await token.balanceOf(account0.address);
      console.log(`balDaiAfter :${ethers.utils.formatEther(balDaiAfter)}`);

      const {
        active,
        refundRatio,
        updating,
        startTime,
        endTime,
        endCooldown,
        reconfigure,
        targetRefundRatio,
      } = await hub.getDetails(1);
      console.log(`
      reconfigure :${reconfigure} 
      endCooldown :${endCooldown.toNumber()} 
      active :${active}
      updating :${updating} 
      refundRatio :${refundRatio.toNumber()} 
      startTime :${startTime.toNumber()} 
      endTime :${endTime.toNumber()} 
      targetRefundRatio :${targetRefundRatio.toNumber()}`);
      const block = await ethers.provider.getBlock("latest");
      console.log(`block.timestamp :${block.timestamp}`);
      const calcWAvrgRes = weightedAverageSimulation(
        refundRatio.toNumber(),
        targetRefundRatio.toNumber(),
        startTime.toNumber(),
        endTime.toNumber(),
        block.timestamp
      );
      console.log(`calcWAvrgRes :${calcWAvrgRes}`);

      const calculatedReturn = tokensReturned
        .mul(BigNumber.from(calcWAvrgRes))
        .div(BigNumber.from(10 ** 6));

      expect(toETHNum(balDaiAfter.sub(balDaiBefore))).to.equal(
        toETHNum(tokensReturned.add(rewardFromLockedPool))
      );
    });

    it("Assets received for buyer based on weighted average", async () => {
      // TODO: calculate weighted refundRatio based on current time relative to duration
      const tokenDepositedInETH = 100;
      const tokenDeposited = ethers.utils.parseEther(
        tokenDepositedInETH.toString()
      );

      await token.connect(account2).approve(foundry.address, tokenDeposited);

      console.log(`account2 :${account2.address}`);
      const balBefore = await meToken.balanceOf(account0.address);
      const balDaiBefore = await token.balanceOf(account0.address);
      console.log(`meTokssss`);
      console.log(`balBefore :${ethers.utils.formatEther(balBefore)}`);
      console.log(`balDaiBefore :${ethers.utils.formatEther(balDaiBefore)}`);
      const vaultBalBefore = await token.balanceOf(singleAssetVault.address);
      console.log(
        `**vault**BalBefore :${ethers.utils.formatEther(vaultBalBefore)}`
      );
      // send token to owner
      await foundry
        .connect(account2)
        .mint(meToken.address, tokenDeposited, account0.address);
      const balAfter = await meToken.balanceOf(account0.address);
      console.log(`balAfter :${ethers.utils.formatEther(balAfter)}`);
      const vaultBalAfterMint = await token.balanceOf(singleAssetVault.address);
      console.log(
        `**vault**BalAfterMint :${ethers.utils.formatEther(vaultBalAfterMint)}`
      );
      expect(vaultBalAfterMint.sub(vaultBalBefore)).to.equal(tokenDeposited);
      //  burnt by owner
      await meToken.connect(account0).approve(foundry.address, balAfter);
      const allowance = await token.allowance(
        singleAssetVault.address,
        foundry.address
      );
      console.log(`//allowance :${ethers.utils.formatEther(allowance)}`);
      console.log(`
        metokens totalSupply:${ethers.utils.formatEther(
          await meToken.totalSupply()
        )}`);
      const meDetails = await meTokenRegistry.getDetails(meToken.address);
      console.log(`
        metokens totalSupply:${ethers.utils.formatEther(
          await meToken.totalSupply()
        )}
        meDetails.endCooldown :${meDetails.endCooldown} 
        meDetails.balanceLocked :${ethers.utils.formatEther(
          meDetails.balanceLocked
        )} 
        meDetails.balancePooled :${ethers.utils.formatEther(
          meDetails.balancePooled
        )}
        meDetails.migration :${meDetails.migration} 
        meDetails.startTime :${meDetails.startTime.toNumber()} 
        meDetails.endTime :${meDetails.endTime.toNumber()} `);
      const tokensReturned = await foundry.calculateBurnReturn(
        meToken.address,
        balAfter
      );
      console.log(
        `tokensReturned :${ethers.utils.formatEther(tokensReturned)}`
      );
      await foundry
        .connect(account0)
        .burn(meToken.address, balAfter, account0.address);
      const balDaiAfter = await token.balanceOf(account0.address);
      console.log(`balDaiAfter :${ethers.utils.formatEther(balDaiAfter)}`);

      const {
        active,
        refundRatio,
        updating,
        startTime,
        endTime,
        endCooldown,
        reconfigure,
        targetRefundRatio,
      } = await hub.getDetails(1);
      console.log(`
        reconfigure :${reconfigure} 
        endCooldown :${endCooldown.toNumber()} 
        active :${active}
        updating :${updating} 
        refundRatio :${refundRatio.toNumber()} 
        startTime :${startTime.toNumber()} 
        endTime :${endTime.toNumber()} 
        targetRefundRatio :${targetRefundRatio.toNumber()}`);
      const block = await ethers.provider.getBlock("latest");
      console.log(`block.timestamp :${block.timestamp}`);
      const calcWAvrgRes = weightedAverageSimulation(
        refundRatio.toNumber(),
        targetRefundRatio.toNumber(),
        startTime.toNumber(),
        endTime.toNumber(),
        block.timestamp
      );
      console.log(`calcWAvrgRes :${calcWAvrgRes}`);
      const calculatedReturn = tokensReturned
        .mul(BigNumber.from(calcWAvrgRes))
        .div(BigNumber.from(10 ** 6));

      console.log(
        `calculatedReturn :${ethers.utils.formatEther(calculatedReturn)}`
      );

      expect(
        Number(ethers.utils.formatEther(balDaiAfter.sub(balDaiBefore)))
      ).to.equal((tokenDepositedInETH * firstRefundRatio) / MAX_WEIGHT);
    });
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
