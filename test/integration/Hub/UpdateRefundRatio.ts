import { BigNumber, Signer } from "ethers";
import { expect } from "chai";
import { ethers, getNamedAccounts } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  calculateCollateralReturned,
  getContractAt,
  toETHNumber,
  weightedAverageSimulation,
} from "../../utils/helpers";
import { hubSetup } from "../../utils/hubSetup";
import {
  mineBlock,
  passDays,
  passHours,
  passSeconds,
  setAutomine,
} from "../../utils/hardhatNode";

import {
  FoundryFacet,
  HubFacet,
  MeTokenRegistryFacet,
  MeToken,
  ERC20,
  SingleAssetVault,
} from "../../../artifacts/types";

const setup = async () => {
  describe("HubFacet - update RefundRatio", () => {
    let meTokenRegistry: MeTokenRegistryFacet;
    let singleAssetVault: SingleAssetVault;
    let foundry: FoundryFacet;
    let hub: HubFacet;
    let token: ERC20;
    let meToken: MeToken;
    let whale: Signer;
    let account0: SignerWithAddress;
    let account1: SignerWithAddress;
    let account2: SignerWithAddress;
    const one = ethers.utils.parseEther("1");
    let baseY: BigNumber;
    const MAX_WEIGHT = 1000000;
    const reserveWeight = MAX_WEIGHT / 2;
    let encodedVaultArgs: string;
    const firstHubId = 1;
    const firstRefundRatio = 5000;
    const targetedRefundRatio = 500000; // 50%
    before(async () => {
      baseY = one.mul(1000);
      let DAI;
      ({ DAI } = await getNamedAccounts());

      encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [DAI]
      );
      ({
        token,
        whale,
        hub,
        foundry,
        singleAssetVault,
        meTokenRegistry,
        account0,
        account1,
        account2,
      } = await hubSetup(
        baseY,
        reserveWeight,
        encodedVaultArgs,
        firstRefundRatio
      ));

      // Pre-load owner and buyer w/ DAI
      await token
        .connect(whale)
        .transfer(account2.address, ethers.utils.parseEther("1000"));
      let max = ethers.constants.MaxUint256;
      await token.connect(account1).approve(singleAssetVault.address, max);
      await token.connect(account2).approve(singleAssetVault.address, max);

      // Create meToken and subscribe to Hub1
      const name = "Carl0 meToken";
      await meTokenRegistry
        .connect(account0)
        .subscribe(name, "CARL", firstHubId, 0);
      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account0.address
      );
      meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);

      const tokenDeposited = ethers.utils.parseEther("100");
      const vaultBalBefore = await token.balanceOf(singleAssetVault.address);
      await foundry
        .connect(account2)
        .mint(meTokenAddr, tokenDeposited, account2.address);
      const vaultBalAfter = await token.balanceOf(singleAssetVault.address);
      expect(vaultBalAfter.sub(vaultBalBefore)).to.equal(tokenDeposited);
      //setWarmup for 2 days (3 days after buffer)
      let warmup = await hub.hubWarmup();
      expect(warmup).to.equal(0);
      await hub.setHubWarmup(172800);

      warmup = await hub.hubWarmup();
      expect(warmup).to.equal(172800 + 24 * 60 * 60);
      let cooldown = await hub.hubCooldown();
      expect(cooldown).to.equal(0);
      //setCooldown for 1 day
      await hub.setHubCooldown(86400);
      cooldown = await hub.hubCooldown();
      expect(cooldown).to.equal(86400);

      let duration = await hub.hubDuration();
      expect(duration).to.equal(0);
      //setDuration for 1 week
      await hub.setHubDuration(604800);
      duration = await hub.hubDuration();
      expect(duration).to.equal(604800);
    });

    describe("Warmup", () => {
      before(async () => {
        await hub.initUpdate(firstHubId, targetedRefundRatio, 0);
      });
      it("should revert initUpdate() if already updating", async () => {
        // fast fwd a little bit
        await passDays(1);
        await expect(hub.initUpdate(1, 1000, reserveWeight)).to.be.revertedWith(
          "already updating"
        );
      });

      it("Assets received based on initialRefundRatio", async () => {
        const tokenDepositedInETH = 100;
        const tokenDeposited = ethers.utils.parseEther(
          tokenDepositedInETH.toString()
        );

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

        await foundry
          .connect(account1)
          .mint(meToken.address, tokenDeposited, account1.address);
        const vaultBalAfterMint = await token.balanceOf(
          singleAssetVault.address
        );

        expect(vaultBalAfterMint.sub(vaultBalAfterBurn)).to.equal(
          tokenDeposited
        );

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
      it("should revert initUpdate() if already updating", async () => {
        await expect(hub.initUpdate(1, 1000, reserveWeight)).to.be.revertedWith(
          "already updating"
        );
      });

      it("Assets received for owner should not apply refund ratio", async () => {
        //move forward 3 Days
        await passDays(3);
        const tokenDepositedInETH = 100;
        const tokenDeposited = ethers.utils.parseEther(
          tokenDepositedInETH.toString()
        );

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

        const meTokenTotalSupply = await meToken.totalSupply();
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );

        const rawAssetsReturned = calculateCollateralReturned(
          toETHNumber(balAfter),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenInfo.balancePooled),
          reserveWeight / MAX_WEIGHT
        );
        const assetsReturned =
          rawAssetsReturned +
          (toETHNumber(balAfter) / toETHNumber(meTokenTotalSupply)) *
            toETHNumber(meTokenInfo.balanceLocked);

        await foundry
          .connect(account0)
          .burn(meToken.address, balAfter, account0.address);
        const balAfterBurn = await meToken.balanceOf(account0.address);
        expect(balBefore).to.equal(balAfterBurn);
        const balDaiAfter = await token.balanceOf(account0.address);

        const { active, updating } = await hub.getHubInfo(1);
        expect(active).to.be.true;
        expect(updating).to.be.true;

        expect(toETHNumber(balDaiAfter.sub(balDaiBefore))).to.be.approximately(
          assetsReturned,
          1e-15
        );
      });

      it("Assets received for buyer based on weighted average refundRatio", async () => {
        //move forward  3 Days
        await passDays(3);
        const tokenDepositedInETH = 100;
        const tokenDeposited = ethers.utils.parseEther(
          tokenDepositedInETH.toString()
        );
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
        const meTokenTotalSupply = await meToken.totalSupply();
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );

        expect(vaultBalAfterMint.sub(vaultBalBefore)).to.equal(tokenDeposited);

        await setAutomine(false);
        const block = await ethers.provider.getBlock("latest");
        const rawAssetsReturned = calculateCollateralReturned(
          toETHNumber(balAfter),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenInfo.balancePooled),
          reserveWeight / MAX_WEIGHT
        );

        const {
          active,
          refundRatio,
          updating,
          startTime,
          endTime,
          targetRefundRatio,
        } = await hub.getHubInfo(1);
        expect(active).to.be.true;
        expect(updating).to.be.true;

        const calcWAvgRes = weightedAverageSimulation(
          refundRatio.toNumber(),
          targetRefundRatio.toNumber(),
          startTime.toNumber(),
          endTime.toNumber(),
          block.timestamp + 1
        );
        const calculatedReturn =
          (rawAssetsReturned * Math.floor(calcWAvgRes)) / MAX_WEIGHT;

        await foundry
          .connect(account2)
          .burn(meToken.address, balAfter, account2.address);

        await mineBlock(block.timestamp + 1);
        await setAutomine(true);

        const balDaiAfterBurn = await token.balanceOf(account2.address);

        // we get the calcWAvgRes percentage of the tokens returned by the Metokens burn
        expect(
          toETHNumber(balDaiAfterBurn.sub(balDaiAfterMint))
        ).to.approximately(calculatedReturn, 1e-15);
      });
    });

    describe("During cooldown", () => {
      it("initUpdate() cannot be called", async () => {
        const { active, updating, endTime } = await hub.getHubInfo(1);
        expect(active).to.be.true;
        expect(updating).to.be.true;
        const block = await ethers.provider.getBlock("latest");

        //Block.timestamp should be between endtime and endCooldown
        // move forward to cooldown
        await passSeconds(endTime.sub(block.timestamp).toNumber() + 1);
        await expect(hub.initUpdate(1, 1000, 0)).to.be.revertedWith(
          "Still cooling down"
        );
      });

      it("Before refundRatio set, burn() for owner should not apply refund ratio", async () => {
        const tokenDepositedInETH = 100;
        const tokenDeposited = ethers.utils.parseEther(
          tokenDepositedInETH.toString()
        );

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
          endTime,
          endCooldown,
          targetRefundRatio,
        } = await hub.getHubInfo(1);
        // update has been finished by calling mint function as we passed the end time
        expect(targetRefundRatio).to.equal(0);
        expect(refundRatio).to.equal(targetedRefundRatio);
        const balAfter = await meToken.balanceOf(account0.address);
        const vaultBalAfterMint = await token.balanceOf(
          singleAssetVault.address
        );

        expect(vaultBalAfterMint.sub(vaultBalBefore)).to.equal(tokenDeposited);

        const meTokenTotalSupply = await meToken.totalSupply();
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );

        const rawAssetsReturned = calculateCollateralReturned(
          toETHNumber(balAfter),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenInfo.balancePooled),
          reserveWeight / MAX_WEIGHT
        );
        const assetsReturned =
          rawAssetsReturned +
          (toETHNumber(balAfter) / toETHNumber(meTokenTotalSupply)) *
            toETHNumber(meTokenInfo.balanceLocked);

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

        expect(toETHNumber(balDaiAfter.sub(balDaiBefore))).to.be.approximately(
          assetsReturned,
          1e-13
        );
      });

      it("Before refundRatio set, burn() for buyers should use the targetRefundRatio", async () => {
        await passHours(4);
        const tokenDepositedInETH = 100;
        const tokenDeposited = ethers.utils.parseEther(
          tokenDepositedInETH.toString()
        );

        const vaultBalBefore = await token.balanceOf(singleAssetVault.address);
        // send token to owner
        await foundry
          .connect(account2)
          .mint(meToken.address, tokenDeposited, account2.address);
        const balDaiBefore = await token.balanceOf(account2.address);
        const balAfter = await meToken.balanceOf(account2.address);
        const vaultBalAfterMint = await token.balanceOf(
          singleAssetVault.address
        );
        const meTokenTotalSupply = await meToken.totalSupply();
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );

        expect(vaultBalAfterMint.sub(vaultBalBefore)).to.equal(tokenDeposited);

        const rawAssetsReturned = calculateCollateralReturned(
          toETHNumber(balAfter),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenInfo.balancePooled),
          reserveWeight / MAX_WEIGHT
        );

        const assetsReturned =
          (rawAssetsReturned * targetedRefundRatio) / MAX_WEIGHT;

        await foundry
          .connect(account2)
          .burn(meToken.address, balAfter, account2.address);
        const balDaiAfter = await token.balanceOf(account2.address);

        const {
          active,
          refundRatio,
          updating,
          endTime,
          endCooldown,
          targetRefundRatio,
        } = await hub.getHubInfo(1);

        expect(active).to.be.true;
        expect(updating).to.be.false;
        expect(targetRefundRatio).to.equal(0);
        expect(refundRatio).to.equal(targetedRefundRatio);
        //Block.timestamp should be between endtime and endCooldown
        const block = await ethers.provider.getBlock("latest");

        expect(block.timestamp).to.be.gt(endTime);
        expect(block.timestamp).to.be.lt(endCooldown);

        // we get the calcWAvgRes percentage of the tokens returned by the Metokens burn
        expect(toETHNumber(balDaiAfter.sub(balDaiBefore))).to.be.approximately(
          assetsReturned,
          1e-15
        );
      });

      it("Call finishUpdate() and update refundRatio to targetRefundRatio", async () => {
        await hub.register(
          account0.address,
          token.address,
          singleAssetVault.address,
          targetedRefundRatio / 2, //refund ratio
          baseY,
          reserveWeight,
          encodedVaultArgs
        );
        const hubId = (await hub.count()).toNumber();
        expect(hubId).to.be.equal(firstHubId + 1);
        await hub.setHubWarmup(0);
        await hub.setHubCooldown(5);
        await hub.setHubDuration(0);

        let warmup = await hub.hubWarmup();
        expect(warmup).to.equal(24 * 60 * 60);

        let cooldown = await hub.hubCooldown();
        expect(cooldown).to.equal(5);

        let duration = await hub.hubDuration();
        expect(duration).to.equal(0);
        const detBefore = await hub.getHubInfo(hubId);

        expect(detBefore.active).to.be.true;
        expect(detBefore.updating).to.be.false;
        expect(detBefore.targetRefundRatio).to.equal(0);
        await hub.initUpdate(hubId, targetedRefundRatio, 0);
        const detAfterInit = await hub.getHubInfo(hubId);

        expect(detAfterInit.active).to.be.true;
        expect(detAfterInit.updating).to.be.true;
        expect(detAfterInit.refundRatio).to.equal(targetedRefundRatio / 2);
        expect(detAfterInit.targetRefundRatio).to.equal(targetedRefundRatio);

        const block = await ethers.provider.getBlock("latest");
        const { endTime } = await hub.getHubInfo(1);
        await mineBlock(endTime.toNumber() + 1);
        await hub.finishUpdate(hubId);
        const detAfterUpdate = await hub.getHubInfo(hubId);

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
          endTime,
          endCooldown,
          targetRefundRatio,
        } = await hub.getHubInfo(1);

        expect(active).to.be.true;
        expect(updating).to.be.false;
        expect(targetRefundRatio).to.equal(0);
        expect(refundRatio).to.equal(targetedRefundRatio);
        //Block.timestamp should be between endtime and endCooldown
        const block = await ethers.provider.getBlock("latest");
        expect(block.timestamp).to.be.gt(endTime);
        expect(block.timestamp).to.be.lt(endCooldown);

        // await passSeconds(endCooldown.sub(block.timestamp).toNumber() + 1);
        await mineBlock(endCooldown.toNumber() + 1);
        await hub.initUpdate(1, 1000, 0);

        const detAfterInit = await hub.getHubInfo(1);
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
          targetedRefundRatio / 2, //refund ratio
          baseY,
          reserveWeight,
          encodedVaultArgs
        );
        const hubId = (await hub.count()).toNumber();
        expect(hubId).to.be.equal(firstHubId + 2);

        let warmup = await hub.hubWarmup();
        expect(warmup).to.equal(24 * 60 * 60);

        let cooldown = await hub.hubCooldown();
        expect(cooldown).to.equal(5);

        let duration = await hub.hubDuration();
        expect(duration).to.equal(0);
        const detBefore = await hub.getHubInfo(hubId);
        expect(detBefore.active).to.be.true;
        expect(detBefore.updating).to.be.false;
        expect(detBefore.targetRefundRatio).to.equal(0);
        await hub.initUpdate(hubId, targetedRefundRatio, 0);
        const detAfterInit = await hub.getHubInfo(hubId);

        expect(detAfterInit.active).to.be.true;
        expect(detAfterInit.updating).to.be.true;
        expect(detAfterInit.refundRatio).to.equal(targetedRefundRatio / 2);
        expect(detAfterInit.targetRefundRatio).to.equal(targetedRefundRatio);

        const block = await ethers.provider.getBlock("latest");
        expect(detAfterInit.endCooldown.sub(block.timestamp)).to.equal(
          24 * 60 * 60 + 5
        );

        // fast fwd to update again
        await mineBlock(detAfterInit.endCooldown.toNumber() + 1);
        await hub.initUpdate(hubId, 1000, 0);

        const detAfterUpdate = await hub.getHubInfo(hubId);
        expect(detAfterUpdate.active).to.be.true;
        expect(detAfterUpdate.updating).to.be.true;
        expect(detAfterUpdate.refundRatio).to.equal(targetedRefundRatio);
        expect(detAfterUpdate.targetRefundRatio).to.equal(1000);
      });
    });
  });
};
setup().then(() => {
  run();
});
