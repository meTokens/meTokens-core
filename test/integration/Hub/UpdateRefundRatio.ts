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
import { Foundry } from "../../../artifacts/types/Foundry";
import { Hub } from "../../../artifacts/types/Hub";
import { MeTokenRegistry } from "../../../artifacts/types/MeTokenRegistry";
import { MigrationRegistry } from "../../../artifacts/types/MigrationRegistry";
import { hubSetup } from "../../utils/hubSetup";
import { MeToken } from "../../../artifacts/types/MeToken";
import { expect } from "chai";
import { SingleAssetVault } from "../../../artifacts/types/SingleAssetVault";
import { passDays, passHours, passSeconds } from "../../utils/hardhatNode";
import { UniswapSingleTransferMigration } from "../../../artifacts/types/UniswapSingleTransferMigration";
const setup = async () => {
  describe("Hub - update RefundRatio", () => {
    let meTokenRegistry: MeTokenRegistry;
    let bancorABDK: BancorABDK;
    let migrationRegistry: MigrationRegistry;
    let singleAssetVault: SingleAssetVault;
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
      encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [DAI]
      );
      bancorABDK = await deploy<BancorABDK>("BancorABDK");

      ({
        token,
        hub,
        tokenHolder,
        migrationRegistry,
        singleAssetVault,
        foundry,
        account0,
        account1,
        account2,
        meTokenRegistry,
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
      const name = "Carl0 meToken";
      const symbol = "CARL";

      const tx = await meTokenRegistry
        .connect(account0)
        .subscribe(name, "CARL", firstHubId, 0);
      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account0.address
      );
      meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);
      // Register Hub2 w/ same args but different refund Ratio

      const tokenDeposited = ethers.utils.parseEther("100");
      await token.connect(account2).approve(foundry.address, tokenDeposited);
      const balBefore = await meToken.balanceOf(account2.address);
      const vaultBalBefore = await token.balanceOf(singleAssetVault.address);
      await foundry
        .connect(account2)
        .mint(meTokenAddr, tokenDeposited, account2.address);
      const balAfter = await meToken.balanceOf(account2.address);
      const vaultBalAfter = await token.balanceOf(singleAssetVault.address);
      expect(vaultBalAfter.sub(vaultBalBefore)).to.equal(tokenDeposited);
      //setWarmup for 2 days
      let warmup = await hub.getWarmup();
      expect(warmup).to.equal(0);
      await hub.setWarmup(172800);

      warmup = await hub.getWarmup();
      expect(warmup).to.equal(172800);
      let cooldown = await hub.getCooldown();
      expect(cooldown).to.equal(0);
      //setCooldown for 1 day
      await hub.setCooldown(86400);
      cooldown = await hub.getCooldown();
      expect(cooldown).to.equal(86400);

      let duration = await hub.getDuration();
      expect(duration).to.equal(0);
      //setDuration for 1 week
      await hub.setDuration(604800);
      duration = await hub.getDuration();
      expect(duration).to.equal(604800);
    });

    describe("During warmup", () => {
      before(async () => {
        await hub.initUpdate(
          firstHubId,
          bancorABDK.address,
          targetedRefundRatio,
          ethers.utils.toUtf8Bytes("")
        );
      });
      it("initUpdate() cannot be called", async () => {
        // TODO: fast fwd a little bit
        let lastBlock = await ethers.provider.getBlock("latest");
        await passDays(1);
        lastBlock = await ethers.provider.getBlock("latest");
        //await hub.setWarmup(172801);
        lastBlock = await ethers.provider.getBlock("latest");
        await expect(
          hub.initUpdate(1, bancorABDK.address, 1000, encodedCurveDetails)
        ).to.be.revertedWith("already updating");
      });

      it("Assets received based on initialRefundRatio", async () => {
        const tokenDepositedInETH = 100;
        const tokenDeposited = ethers.utils.parseEther(
          tokenDepositedInETH.toString()
        );

        await token.connect(account2).approve(foundry.address, tokenDeposited);
        const balBefore = await meToken.balanceOf(account0.address);
        const balDaiBefore = await token.balanceOf(account0.address);
        const vaultBalBefore = await token.balanceOf(singleAssetVault.address);

        await foundry
          .connect(account2)
          .mint(meToken.address, tokenDeposited, account0.address);
        const balAfter = await meToken.balanceOf(account0.address);
        const vaultBalAfter = await token.balanceOf(singleAssetVault.address);

        expect(vaultBalAfter.sub(vaultBalBefore)).to.equal(tokenDeposited);

        const balDaiAcc1Before = await token.balanceOf(account1.address);

        //send half burnt by owner

        await foundry
          .connect(account0)
          .burn(meToken.address, balAfter, account0.address);
        const balDaiAfter = await token.balanceOf(account0.address);
        const vaultBalAfterBurn = await token.balanceOf(
          singleAssetVault.address
        );

        // we have less DAI in the vault cos they have been sent to the burner
        expect(vaultBalAfter.sub(vaultBalAfterBurn)).to.equal(
          balDaiAfter.sub(balDaiBefore)
        );
        // buyer
        const balAcc1Before = await meToken.balanceOf(account1.address);
        await token.connect(account1).approve(foundry.address, tokenDeposited);
        await foundry
          .connect(account1)
          .mint(meToken.address, tokenDeposited, account1.address);
        const vaultBalAfterMint = await token.balanceOf(
          singleAssetVault.address
        );

        expect(vaultBalAfterMint.sub(vaultBalAfterBurn)).to.equal(
          tokenDeposited
        );

        const balDaiAcc1AfterMint = await token.balanceOf(account1.address);

        const balAcc1After = await meToken.balanceOf(account1.address);
        expect(balAcc1After.sub(balAcc1Before)).to.equal(
          balAfter.sub(balBefore).sub(ethers.utils.parseUnits("1", "wei"))
        );
        //send half burnt by buyer
        await foundry
          .connect(account1)
          .burn(meToken.address, balAcc1After, account1.address);
        const balDaiAcc1After = await token.balanceOf(account1.address);

        const vaultBalAfterBuyerBurn = await token.balanceOf(
          singleAssetVault.address
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
        await passHours(1);
      });
      it("initUpdate() cannot be called", async () => {
        // TODO: fast to active duration
        await expect(
          hub.initUpdate(1, bancorABDK.address, 1000, encodedCurveDetails)
        ).to.be.revertedWith("already updating");
      });

      it("Assets received for owner are not based on weighted average refund ratio only applies to buyer", async () => {
        //move forward  2 Days
        await passDays(2);
        const tokenDepositedInETH = 100;
        const tokenDeposited = ethers.utils.parseEther(
          tokenDepositedInETH.toString()
        );

        await token.connect(account2).approve(foundry.address, tokenDeposited);

        const balBefore = await meToken.balanceOf(account0.address);
        const balDaiBefore = await token.balanceOf(account0.address);
        const vaultBalBefore = await token.balanceOf(singleAssetVault.address);

        // send token to owner
        await foundry
          .connect(account2)
          .mint(meToken.address, tokenDeposited, account0.address);
        const balAfter = await meToken.balanceOf(account0.address);
        const vaultBalAfterMint = await token.balanceOf(
          singleAssetVault.address
        );

        expect(vaultBalAfterMint.sub(vaultBalBefore)).to.equal(tokenDeposited);
        //  burnt by owner
        await meToken.connect(account0).approve(foundry.address, balAfter);

        const meTotSupply = await meToken.totalSupply();

        const meDetails = await meTokenRegistry.getDetails(meToken.address);

        const tokensReturned = await foundry.calculateRawAssetsReturned(
          meToken.address,
          balAfter
        );

        const rewardFromLockedPool = one
          .mul(balAfter)
          .mul(meDetails.balanceLocked)
          .div(meTotSupply)
          .div(one);

        await foundry
          .connect(account0)
          .burn(meToken.address, balAfter, account0.address);
        const balAfterBurn = await meToken.balanceOf(account0.address);
        expect(balBefore).to.equal(balAfterBurn);
        const balDaiAfter = await token.balanceOf(account0.address);

        const { active, updating } = await hub.getDetails(1);
        expect(active).to.be.true;
        expect(updating).to.be.true;

        expect(toETHNumber(balDaiAfter.sub(balDaiBefore))).to.equal(
          toETHNumber(tokensReturned.add(rewardFromLockedPool))
        );
      });

      it("Assets received for buyer based on weighted average", async () => {
        //move forward  3 Days
        await passDays(3);
        // TODO: calculate weighted refundRatio based on current time relative to duration
        const tokenDepositedInETH = 100;
        const tokenDeposited = ethers.utils.parseEther(
          tokenDepositedInETH.toString()
        );
        await token.connect(account2).approve(foundry.address, tokenDeposited);
        const vaultBalBefore = await token.balanceOf(singleAssetVault.address);

        // send token to owner
        await foundry
          .connect(account2)
          .mint(meToken.address, tokenDeposited, account2.address);
        const balDaiAfterMint = await token.balanceOf(account2.address);
        const balAfter = await meToken.balanceOf(account2.address);

        const vaultBalAfterMint = await token.balanceOf(
          singleAssetVault.address
        );
        expect(vaultBalAfterMint.sub(vaultBalBefore)).to.equal(tokenDeposited);
        //  burnt by owner
        await meToken.connect(account2).approve(foundry.address, balAfter);

        const tokensReturned = await foundry.calculateRawAssetsReturned(
          meToken.address,
          balAfter
        );
        await foundry
          .connect(account2)
          .burn(meToken.address, balAfter, account2.address);
        const balDaiAfterBurn = await token.balanceOf(account2.address);

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
        expect(active).to.be.true;
        expect(updating).to.be.true;
        const block = await ethers.provider.getBlock("latest");

        const calcWAvrgRes = weightedAverageSimulation(
          refundRatio.toNumber(),
          targetRefundRatio.toNumber(),
          startTime.toNumber(),
          endTime.toNumber(),
          block.timestamp
        );
        const calculatedReturn = tokensReturned
          .mul(BigNumber.from(Math.floor(calcWAvrgRes)))
          .div(BigNumber.from(10 ** 6));

        // we get the calcWAvrgRes percentage of the tokens returned by the Metokens burn
        expect(balDaiAfterBurn.sub(balDaiAfterMint)).to.equal(calculatedReturn);
      });
    });

    describe("During cooldown", () => {
      it("initUpdate() cannot be called", async () => {
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
        expect(active).to.be.true;
        expect(updating).to.be.true;
        const block = await ethers.provider.getBlock("latest");

        //Block.timestamp should be between endtime and endCooldown
        // move forward to cooldown
        await passSeconds(endTime.sub(block.timestamp).toNumber() + 1);
        await expect(
          hub.initUpdate(
            1,
            bancorABDK.address,
            1000,
            ethers.utils.toUtf8Bytes("")
          )
        ).to.be.revertedWith("Still cooling down");
      });

      it("Before refundRatio set, burn() for owner should not use the targetRefundRatio", async () => {
        const tokenDepositedInETH = 100;
        const tokenDeposited = ethers.utils.parseEther(
          tokenDepositedInETH.toString()
        );

        await token.connect(account2).approve(foundry.address, tokenDeposited);

        const balBefore = await meToken.balanceOf(account0.address);
        const balDaiBefore = await token.balanceOf(account0.address);
        const vaultBalBefore = await token.balanceOf(singleAssetVault.address);

        // send token to owner
        await foundry
          .connect(account2)
          .mint(meToken.address, tokenDeposited, account0.address);
        const {
          active,
          updating,
          refundRatio,
          startTime,
          endTime,
          endCooldown,
          reconfigure,
          targetRefundRatio,
        } = await hub.getDetails(1);
        // update has been finished by calling mint function as we passed the end time
        expect(targetRefundRatio).to.equal(0);
        expect(refundRatio).to.equal(targetedRefundRatio);
        const balAfter = await meToken.balanceOf(account0.address);
        const vaultBalAfterMint = await token.balanceOf(
          singleAssetVault.address
        );

        expect(vaultBalAfterMint.sub(vaultBalBefore)).to.equal(tokenDeposited);
        //  burnt by owner
        await meToken.connect(account0).approve(foundry.address, balAfter);

        const meTotSupply = await meToken.totalSupply();

        const meDetails = await meTokenRegistry.getDetails(meToken.address);

        const tokensReturned = await foundry.calculateRawAssetsReturned(
          meToken.address,
          balAfter
        );

        const rewardFromLockedPool = one
          .mul(balAfter)
          .mul(meDetails.balanceLocked)
          .div(meTotSupply)
          .div(one);

        await foundry
          .connect(account0)
          .burn(meToken.address, balAfter, account0.address);
        const balAfterBurn = await meToken.balanceOf(account0.address);
        expect(balBefore).to.equal(balAfterBurn);
        const balDaiAfter = await token.balanceOf(account0.address);
        //Block.timestamp should be between endtime and endCooldown
        const block = await ethers.provider.getBlock("latest");
        expect(block.timestamp).to.be.gt(endTime);
        expect(block.timestamp).to.be.lt(endCooldown);

        expect(active).to.be.true;
        expect(updating).to.be.false;

        expect(toETHNumber(balDaiAfter.sub(balDaiBefore))).to.equal(
          toETHNumber(tokensReturned.add(rewardFromLockedPool))
        );
      });

      it("Before refundRatio set, burn() for buyers should use the targetRefundRatio", async () => {
        await passHours(4);
        // TODO: calculate weighted refundRatio based on current time relative to duration
        const tokenDepositedInETH = 100;
        const tokenDeposited = ethers.utils.parseEther(
          tokenDepositedInETH.toString()
        );

        await token.connect(account2).approve(foundry.address, tokenDeposited);
        const vaultBalBefore = await token.balanceOf(singleAssetVault.address);
        // send token to owner
        await foundry
          .connect(account2)
          .mint(meToken.address, tokenDeposited, account2.address);
        const balDaiAfterMint = await token.balanceOf(account2.address);
        const balAfter = await meToken.balanceOf(account2.address);
        const vaultBalAfterMint = await token.balanceOf(
          singleAssetVault.address
        );

        expect(vaultBalAfterMint.sub(vaultBalBefore)).to.equal(tokenDeposited);
        //  burnt by owner
        await meToken.connect(account2).approve(foundry.address, balAfter);

        const tokensReturned = await foundry.calculateRawAssetsReturned(
          meToken.address,
          balAfter
        );
        await foundry
          .connect(account2)
          .burn(meToken.address, balAfter, account2.address);
        const balDaiAfterBurn = await token.balanceOf(account2.address);

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

        expect(active).to.be.true;
        expect(updating).to.be.false;
        expect(targetRefundRatio).to.equal(0);
        expect(refundRatio).to.equal(targetedRefundRatio);
        //Block.timestamp should be between endtime and endCooldown
        const block = await ethers.provider.getBlock("latest");

        expect(block.timestamp).to.be.gt(endTime);
        expect(block.timestamp).to.be.lt(endCooldown);
        const calculatedReturn = tokensReturned
          .mul(BigNumber.from(targetedRefundRatio))
          .div(BigNumber.from(10 ** 6));

        // we get the calcWAvrgRes percentage of the tokens returned by the Metokens burn
        expect(balDaiAfterBurn.sub(balDaiAfterMint)).to.equal(calculatedReturn);
      });

      it("Call finishUpdate() and update refundRatio to targetRefundRatio", async () => {
        await hub.register(
          account0.address,
          token.address,
          singleAssetVault.address,
          bancorABDK.address,
          targetedRefundRatio / 2, //refund ratio
          encodedCurveDetails,
          encodedVaultArgs
        );
        const hubId = (await hub.count()).toNumber();
        expect(hubId).to.be.equal(firstHubId + 1);
        await hub.setWarmup(0);
        await hub.setCooldown(0);
        await hub.setDuration(0);

        let warmup = await hub.getWarmup();
        expect(warmup).to.equal(0);

        let cooldown = await hub.getCooldown();
        expect(cooldown).to.equal(0);

        let duration = await hub.getDuration();
        expect(duration).to.equal(0);
        const detBefore = await hub.getDetails(hubId);

        expect(detBefore.active).to.be.true;
        expect(detBefore.updating).to.be.false;
        expect(detBefore.targetRefundRatio).to.equal(0);
        await hub.initUpdate(
          hubId,
          bancorABDK.address,
          targetedRefundRatio,
          ethers.utils.toUtf8Bytes("")
        );
        const detAfterInit = await hub.getDetails(hubId);

        expect(detAfterInit.active).to.be.true;
        expect(detAfterInit.updating).to.be.true;
        expect(detAfterInit.refundRatio).to.equal(targetedRefundRatio / 2);
        expect(detAfterInit.targetRefundRatio).to.equal(targetedRefundRatio);

        await hub.finishUpdate(hubId);
        const detAfterUpdate = await hub.getDetails(hubId);

        expect(detAfterUpdate.active).to.be.true;
        expect(detAfterUpdate.updating).to.be.false;
        expect(detAfterUpdate.refundRatio).to.equal(targetedRefundRatio);
        expect(detAfterUpdate.targetRefundRatio).to.equal(0);
      });
    });

    describe("After cooldown", () => {
      it("initUpdate() can be called again", async () => {
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

        expect(active).to.be.true;
        expect(updating).to.be.false;
        expect(targetRefundRatio).to.equal(0);
        expect(refundRatio).to.equal(targetedRefundRatio);
        //Block.timestamp should be between endtime and endCooldown
        const block = await ethers.provider.getBlock("latest");
        expect(block.timestamp).to.be.gt(endTime);
        expect(block.timestamp).to.be.lt(endCooldown);

        await passSeconds(endCooldown.sub(block.timestamp).toNumber() + 1);
        await hub.initUpdate(
          1,
          bancorABDK.address,
          1000,
          ethers.utils.toUtf8Bytes("")
        );

        const detAfterInit = await hub.getDetails(1);
        expect(detAfterInit.active).to.be.true;
        expect(detAfterInit.updating).to.be.true;
        expect(detAfterInit.refundRatio).to.equal(targetedRefundRatio);
        expect(detAfterInit.targetRefundRatio).to.equal(1000);
      });

      it("If no burns during cooldown, initUpdate() first calls finishUpdate()", async () => {
        await hub.register(
          account0.address,
          token.address,
          singleAssetVault.address,
          bancorABDK.address,
          targetedRefundRatio / 2, //refund ratio
          encodedCurveDetails,
          encodedVaultArgs
        );
        const hubId = (await hub.count()).toNumber();
        expect(hubId).to.be.equal(firstHubId + 2);

        let warmup = await hub.getWarmup();
        expect(warmup).to.equal(0);

        let cooldown = await hub.getCooldown();
        expect(cooldown).to.equal(0);

        let duration = await hub.getDuration();
        expect(duration).to.equal(0);
        const detBefore = await hub.getDetails(hubId);
        expect(detBefore.active).to.be.true;
        expect(detBefore.updating).to.be.false;
        expect(detBefore.targetRefundRatio).to.equal(0);
        await hub.initUpdate(
          hubId,
          bancorABDK.address,
          targetedRefundRatio,
          ethers.utils.toUtf8Bytes("")
        );
        const detAfterInit = await hub.getDetails(hubId);

        expect(detAfterInit.active).to.be.true;
        expect(detAfterInit.updating).to.be.true;
        expect(detAfterInit.refundRatio).to.equal(targetedRefundRatio / 2);
        expect(detAfterInit.targetRefundRatio).to.equal(targetedRefundRatio);

        const block = await ethers.provider.getBlock("latest");
        expect(detAfterInit.endCooldown.sub(block.timestamp)).to.equal(0);
        await hub.initUpdate(
          hubId,
          bancorABDK.address,
          1000,
          ethers.utils.toUtf8Bytes("")
        );

        const detAfterUpdate = await hub.getDetails(hubId);
        expect(detAfterUpdate.active).to.be.true;
        expect(detAfterUpdate.updating).to.be.true;
        expect(detAfterUpdate.refundRatio).to.equal(targetedRefundRatio);
        expect(detAfterUpdate.targetRefundRatio).to.equal(1000);
      });

      it("If no burns during cooldown, initUpdate() args are compared to new values set from on finishUpdate()", async () => {});
    });
  });
};
setup().then(() => {
  run();
});
