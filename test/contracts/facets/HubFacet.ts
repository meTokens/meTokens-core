import { ethers, getNamedAccounts, network } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Signer } from "ethers";
import {
  hubSetupWithoutRegister,
  transferFromWhale,
} from "../../utils/hubSetup";
import { mineBlock } from "../../utils/hardhatNode";
import { deploy, getContractAt } from "../../utils/helpers";
import {
  HubFacet,
  FoundryFacet,
  MeTokenRegistryFacet,
  MeToken,
  ERC20,
  SingleAssetVault,
} from "../../../artifacts/types";

const setup = async () => {
  describe("HubFacet.sol", () => {
    let DAI: string;
    let account0: SignerWithAddress;
    let account1: SignerWithAddress;
    let account2: SignerWithAddress;
    let foundry: FoundryFacet;
    let hub: HubFacet;

    let singleAssetVault: SingleAssetVault;
    let encodedVaultDAIArgs: string;
    let encodedCurveInfo: string;
    let token: ERC20;
    let dai: ERC20;
    let whale: Signer;
    let meTokenRegistry: MeTokenRegistryFacet;
    let meToken: MeToken;

    const hubId = 1;
    const refundRatio1 = 250000;
    const refundRatio2 = 240000;
    const PRECISION = ethers.utils.parseEther("1");
    const duration = 60 * 60;

    const MAX_WEIGHT = 1000000;
    const reserveWeight = MAX_WEIGHT / 2;

    const baseY = PRECISION.div(1000);
    const amount = ethers.utils.parseEther("100");
    const name = "Carl meToken";
    const symbol = "CARL";

    let snapshotId: any;
    before(async () => {
      snapshotId = await network.provider.send("evm_snapshot");
      ({ DAI } = await getNamedAccounts());
      encodedVaultDAIArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [DAI]
      );
      encodedCurveInfo = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint32"],
        [baseY, reserveWeight]
      );

      ({
        hub,
        foundry,
        singleAssetVault,
        meTokenRegistry,
        account0,
        account1,
        account2,
      } = await hubSetupWithoutRegister());
      ({ token, whale } = await transferFromWhale(account1.address));
    });

    describe("Initial state", () => {
      it("Check initial values", async () => {
        // expect(await hub.owner()).to.be.equal(account0.address);
        expect(await hub.count()).to.be.equal(0);
        expect(await hub.hubWarmup()).to.be.equal(0);
        expect(await hub.hubDuration()).to.be.equal(0);
        expect(await hub.hubCooldown()).to.be.equal(0);
        // expect(await hub.registerer()).to.be.equal(account0.address);
        const info = await hub.getHubInfo(0);
        expect(info.active).to.be.equal(false);
        expect(info.owner).to.be.equal(ethers.constants.AddressZero);
        expect(info.vault).to.be.equal(ethers.constants.AddressZero);
        expect(info.asset).to.be.equal(ethers.constants.AddressZero);
        expect(info.refundRatio).to.be.equal(0);
        expect(info.updating).to.be.equal(false);
        expect(info.startTime).to.be.equal(0);
        expect(info.endTime).to.be.equal(0);
        expect(info.endCooldown).to.be.equal(0);
        expect(info.reconfigure).to.be.equal(false);
        expect(info.targetRefundRatio).to.be.equal(0);
      });
    });

    describe("register()", () => {
      it("should revert from invalid sender (onlyRegisterer)", async () => {
        // account1 is not Registerer, hence should revert
        await expect(
          hub
            .connect(account1)
            .register(
              account0.address,
              DAI,
              singleAssetVault.address,
              refundRatio1,
              baseY,
              reserveWeight,
              encodedVaultDAIArgs
            )
        ).to.be.revertedWith("!registerController");
      });
      it("should revert from invalid address arguments", async () => {
        // Un-approved vault
        const tx = hub.register(
          account0.address,
          DAI,
          account0.address, // random unapproved address
          refundRatio1,
          baseY,
          reserveWeight,
          encodedVaultDAIArgs
        );
        await expect(tx).to.be.revertedWith("vault !approved");
      });
      it("should revert from invalid encodedCurveInfo", async () => {
        // Invalid _encodedCurveInfo for particular curve
        await expect(
          hub.register(
            account0.address,
            DAI,
            singleAssetVault.address,
            refundRatio1,
            0,
            0,
            encodedVaultDAIArgs
          )
        ).to.be.revertedWith("!baseY");
        await expect(
          hub.register(
            account0.address,
            DAI,
            singleAssetVault.address,
            refundRatio1,
            1,
            0,
            encodedVaultDAIArgs
          )
        ).to.be.revertedWith("!reserveWeight");
      });
      it("should revert from invalid encodedVaultArgs", async () => {
        // Invalid _encodedVaultArgs
        const tx = hub.register(
          account0.address,
          ethers.constants.AddressZero,
          singleAssetVault.address,
          refundRatio1,
          baseY,
          reserveWeight,
          encodedVaultDAIArgs // invalid _encodedVaultArgs
        );
        await expect(tx).to.be.revertedWith("asset !valid");
      });
      it("should revert from invalid _refundRatio", async () => {
        // _refundRatio > MAX_REFUND_RATIO
        let tx = hub.register(
          account0.address,
          DAI,
          singleAssetVault.address,
          10 ** 7,
          baseY,
          reserveWeight,
          encodedVaultDAIArgs
        );
        await expect(tx).to.be.revertedWith("refundRatio > MAX");

        // _refundRatio = 0
        tx = hub.register(
          account0.address,
          DAI,
          singleAssetVault.address,
          0,
          baseY,
          reserveWeight,
          encodedVaultDAIArgs
        );
        await expect(tx).to.be.revertedWith("refundRatio == 0");
      });
      it("should be able to register", async () => {
        const tx = await hub.register(
          account0.address,
          DAI,
          singleAssetVault.address,
          refundRatio1,
          baseY,
          reserveWeight,
          encodedVaultDAIArgs
        );
        await tx.wait();

        await expect(tx)
          .to.emit(hub, "Register")
          .withArgs(
            hubId,
            account0.address,
            DAI,
            singleAssetVault.address,
            refundRatio1,
            baseY,
            reserveWeight,
            encodedVaultDAIArgs
          );
        expect(await hub.count()).to.be.equal(hubId);
        const info = await hub.getHubInfo(hubId);
        expect(info.active).to.be.equal(true);
        expect(info.owner).to.be.equal(account0.address);
        expect(info.vault).to.be.equal(singleAssetVault.address);
        expect(info.asset).to.be.equal(DAI);
        expect(info.refundRatio).to.be.equal(refundRatio1);
        expect(info.updating).to.be.equal(false);
        expect(info.startTime).to.be.equal(0);
        expect(info.endTime).to.be.equal(0);
        expect(info.endCooldown).to.be.equal(0);
        expect(info.reconfigure).to.be.equal(false);
        expect(info.targetRefundRatio).to.be.equal(0);
      });
    });

    describe("setHubWarmup()", () => {
      before(async () => {
        // required in later testing

        dai = token;
        let enough = amount.mul(10);
        await dai.connect(whale).transfer(account0.address, enough);
        await dai.connect(whale).transfer(account1.address, enough);
        await dai.connect(whale).transfer(account2.address, enough);
        let max = ethers.constants.MaxUint256;
        await dai.connect(account1).approve(singleAssetVault.address, max);
        await dai.connect(account2).approve(singleAssetVault.address, max);
        await dai.connect(account1).approve(meTokenRegistry.address, max);
        // account0 is registering a metoken
        await meTokenRegistry
          .connect(account0)
          .subscribe(name, symbol, hubId, 0);
        const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
          account0.address
        );

        meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);
      });
      it("should revert if not durationsController", async () => {
        const tx = hub.connect(account1).setHubWarmup(duration);
        await expect(tx).to.be.revertedWith("!durationsController");
      });
      it("should revert if same as before", async () => {
        const oldWarmup = await hub.hubWarmup();
        const tx = hub.setHubWarmup(oldWarmup);
        await expect(tx).to.be.revertedWith("same warmup");
      });
      it("should be able to call setHubWarmup", async () => {
        const tx = await hub.setHubWarmup(duration);
        await tx.wait();
        expect(await hub.hubWarmup()).to.be.equal(duration);
      });
      it("should revert if period < meTokenWarmup + meTokenDuration", async () => {
        await meTokenRegistry.setMeTokenWarmup(duration - 1);
        const tx = hub.setHubWarmup(duration - 2);
        await expect(tx).to.be.revertedWith(
          "warmup < meTokenWarmup + meTokenDuration"
        );
      });
    });

    describe("setHubDuration()", () => {
      it("should revert if not durationsController", async () => {
        const tx = hub.connect(account1).setHubDuration(duration);
        await expect(tx).to.be.revertedWith("!durationsController");
      });
      it("should revert if same as before", async () => {
        const oldDuration = await hub.hubDuration();
        const tx = hub.setHubDuration(oldDuration);
        await expect(tx).to.be.revertedWith("same duration");
      });
      it("should be able to call setHubDuration", async () => {
        const tx = await hub.setHubDuration(duration);
        await tx.wait();
        expect(await hub.hubDuration()).to.be.equal(duration);
      });
    });

    describe("setHubCooldown()", () => {
      it("should revert if not durationsController", async () => {
        const tx = hub.connect(account1).setHubCooldown(duration);
        await expect(tx).to.be.revertedWith("!durationsController");
      });
      it("should revert if same as before", async () => {
        const oldCooldown = await hub.hubCooldown();
        const tx = hub.setHubCooldown(oldCooldown);
        await expect(tx).to.be.revertedWith("same cooldown");
      });
      it("should be able to call setHubCooldown", async () => {
        const tx = await hub.setHubCooldown(duration);
        await tx.wait();
        expect(await hub.hubCooldown()).to.be.equal(duration);
      });
    });

    describe("initUpdate()", () => {
      it("should revert when sender is not owner", async () => {
        const tx = hub
          .connect(account1)
          .initUpdate(hubId, refundRatio2, reserveWeight);
        await expect(tx).to.be.revertedWith("!owner");
      });

      it("should revert when same reserveWeight", async () => {
        const tx = hub.connect(account0).initUpdate(hubId, 0, reserveWeight);
        await expect(tx).to.be.revertedWith("targetWeight!=Weight");
      });
      it("should revert when nothing to update", async () => {
        const tx = hub.connect(account0).initUpdate(hubId, 0, 0);
        await expect(tx).to.be.revertedWith("Nothing to update");
      });
      it("should revert from invalid _refundRatio", async () => {
        const tx1 = hub.initUpdate(hubId, 10 ** 7, reserveWeight);
        const tx2 = hub.initUpdate(hubId, refundRatio1, reserveWeight);
        await expect(tx1).to.be.revertedWith("targetRefundRatio >= MAX");
        await expect(tx2).to.be.revertedWith(
          "targetRefundRatio == refundRatio"
        );
      });

      it("should revert on ICurve.register() from invalid encodedCurveInfo", async () => {
        const tx = hub.initUpdate(hubId, refundRatio2, 10000000000000000000000);
        await expect(tx).to.be.reverted;
      });

      it("should be able to initUpdate with new refundRatio", async () => {
        const tx = await hub.initUpdate(hubId, refundRatio2, 0);
        const receipt = await tx.wait();
        const block = await ethers.provider.getBlock(receipt.blockNumber);
        const expectedStartTime = block.timestamp + duration;
        const expectedEndTime = block.timestamp + duration + duration;
        const expectedEndCooldownTime =
          block.timestamp + duration + duration + duration;

        await expect(tx)
          .to.emit(hub, "InitUpdate")
          .withArgs(
            hubId,
            refundRatio2,
            0,
            false,
            expectedStartTime,
            expectedEndTime,
            expectedEndCooldownTime
          );
        const info = await hub.getHubInfo(hubId);
        expect(info.active).to.be.equal(true);
        expect(info.owner).to.be.equal(account0.address);
        expect(info.vault).to.be.equal(singleAssetVault.address);
        expect(info.asset).to.be.equal(DAI);
        expect(info.refundRatio).to.be.equal(refundRatio1);
        expect(info.updating).to.be.equal(true);
        expect(info.startTime).to.be.equal(expectedStartTime);
        expect(info.endTime).to.be.equal(expectedEndTime);
        expect(info.endCooldown).to.be.equal(expectedEndCooldownTime);
        expect(info.reconfigure).to.be.equal(false);
        expect(info.targetRefundRatio).to.be.equal(refundRatio2);
      });

      it("should revert to called during warmup, duration, and cooldown", async () => {
        // calling initUpdate() to revert
        const txBeforeStartTime = hub.initUpdate(
          hubId,
          refundRatio2,
          reserveWeight
        );
        const info = await hub.getHubInfo(hubId);

        await expect(txBeforeStartTime).to.be.revertedWith("already updating");
        let block = await ethers.provider.getBlock("latest");

        // fast fwd to startTime | warmup
        await mineBlock(info.startTime.toNumber() + 1);
        const txAfterStartTime = hub.initUpdate(
          hubId,
          refundRatio2,
          reserveWeight
        );
        await expect(txAfterStartTime).to.be.revertedWith("already updating");
        block = await ethers.provider.getBlock("latest");
        expect(info.startTime).to.be.lt(block.timestamp);

        // fast fwd to endTime - 1
        await mineBlock(info.endTime.toNumber() - 1);
        const txBeforeEndTime = hub.initUpdate(
          hubId,
          refundRatio2,
          reserveWeight
        );
        await expect(txBeforeEndTime).to.be.revertedWith("already updating");
        block = await ethers.provider.getBlock("latest");
        expect(info.endTime).to.be.gte(block.timestamp);

        // fast fwd to endTime | duration
        await mineBlock(info.endTime.toNumber() + 1);
        const txAfterEndTime = hub.initUpdate(
          hubId,
          refundRatio2,
          reserveWeight
        );
        await expect(txAfterEndTime).to.be.revertedWith("Still cooling down");
        block = await ethers.provider.getBlock("latest");
        expect(info.endTime).to.be.lt(block.timestamp);

        // fast fwd to endCooldown - 2
        await mineBlock(info.endCooldown.toNumber() - 2);
        const txBeforeEndCooldown = hub.initUpdate(
          hubId,
          refundRatio2,
          reserveWeight
        );
        await expect(txBeforeEndCooldown).to.be.revertedWith(
          "Still cooling down"
        );
        block = await ethers.provider.getBlock("latest");
        expect(info.endTime).to.be.lt(block.timestamp);
      });

      it("should first finishUpdate (if not) before next initUpdate and set correct Hub info", async () => {
        let info = await hub.getHubInfo(hubId);

        // fast fwd to endCooldown - 2
        await mineBlock(info.endCooldown.toNumber());
        const txAfterEndCooldown = await hub.initUpdate(hubId, refundRatio1, 0);

        const receipt = await txAfterEndCooldown.wait();
        let block = await ethers.provider.getBlock("latest");
        expect(info.endCooldown).to.be.lte(block.timestamp);

        block = await ethers.provider.getBlock(receipt.blockNumber);
        const expectedStartTime = block.timestamp + duration;
        const expectedEndTime = block.timestamp + duration + duration;
        const expectedEndCooldownTime =
          block.timestamp + duration + duration + duration;

        await expect(txAfterEndCooldown)
          .to.emit(hub, "FinishUpdate")
          .withArgs(1);
        await expect(txAfterEndCooldown)
          .to.emit(hub, "InitUpdate")
          .withArgs(
            hubId,
            refundRatio1,
            0,
            false,
            expectedStartTime,
            expectedEndTime,
            expectedEndCooldownTime
          );

        info = await hub.getHubInfo(hubId);
        expect(info.active).to.be.equal(true);
        expect(info.owner).to.be.equal(account0.address);
        expect(info.vault).to.be.equal(singleAssetVault.address);
        expect(info.asset).to.be.equal(DAI);
        expect(info.refundRatio).to.be.equal(refundRatio2);
        expect(info.updating).to.be.equal(true);
        expect(info.startTime).to.be.equal(expectedStartTime);
        expect(info.endTime).to.be.equal(expectedEndTime);
        expect(info.endCooldown).to.be.equal(expectedEndCooldownTime);
        expect(info.reconfigure).to.be.equal(false);
        expect(info.targetRefundRatio).to.be.equal(refundRatio1);
      });
    });

    describe("cancelUpdate()", () => {
      it("should revert when called by non-owner", async () => {
        const tx = hub.connect(account1).cancelUpdate(hubId);
        await expect(tx).to.be.revertedWith("!owner");
      });
      it("should correctly cancels hub update and resets hub struct update values", async () => {
        const tx = await hub.cancelUpdate(hubId);
        await tx.wait();

        await expect(tx).to.emit(hub, "CancelUpdate").withArgs(hubId);

        const info = await hub.getHubInfo(hubId);
        expect(info.active).to.be.equal(true);
        expect(info.owner).to.be.equal(account0.address);
        expect(info.vault).to.be.equal(singleAssetVault.address);
        expect(info.asset).to.be.equal(DAI);
        expect(info.refundRatio).to.be.equal(refundRatio2);
        expect(info.updating).to.be.equal(false);
        expect(info.startTime).to.be.equal(0);
        expect(info.endTime).to.be.equal(0);
        expect(info.endCooldown).to.be.equal(0);
        expect(info.reconfigure).to.be.equal(false);
        expect(info.targetRefundRatio).to.be.equal(0);
      });
      it("should revert when not updating", async () => {
        await expect(hub.cancelUpdate(hubId)).to.be.revertedWith("!updating");
      });
      it("should revert after warmup period", async () => {
        // create a update
        const newReserveWeight = reserveWeight / 2;
        const tx = await hub.initUpdate(hubId, 0, newReserveWeight);
        const receipt = await tx.wait();

        let block = await ethers.provider.getBlock(receipt.blockNumber);
        const expectedStartTime = block.timestamp + duration;
        const expectedEndTime = block.timestamp + duration + duration;
        const expectedEndCooldownTime =
          block.timestamp + duration + duration + duration;

        await expect(tx)
          .to.emit(hub, "InitUpdate")
          .withArgs(
            hubId,
            0,
            newReserveWeight,
            true,
            expectedStartTime,
            expectedEndTime,
            expectedEndCooldownTime
          );

        const info = await hub.getHubInfo(hubId);
        expect(info.active).to.be.equal(true);
        expect(info.owner).to.be.equal(account0.address);
        expect(info.vault).to.be.equal(singleAssetVault.address);
        expect(info.asset).to.be.equal(DAI);
        expect(info.refundRatio).to.be.equal(refundRatio2);
        expect(info.updating).to.be.equal(true);
        expect(info.startTime).to.be.equal(expectedStartTime);
        expect(info.endTime).to.be.equal(expectedEndTime);
        expect(info.endCooldown).to.be.equal(expectedEndCooldownTime);
        expect(info.reconfigure).to.be.equal(true);
        expect(info.targetRefundRatio).to.be.equal(0);

        // increase time beyond warmup period
        await mineBlock(info.startTime.toNumber() + 1);
        block = await ethers.provider.getBlock("latest");
        expect(info.startTime).to.be.lt(block.timestamp);

        // revert on cancelUpdate
        const cancelUpdateTx = hub.cancelUpdate(hubId);
        await expect(cancelUpdateTx).to.be.revertedWith("Update has started");
      });
    });

    describe("finishUpdate()", () => {
      it("should revert before endTime, during warmup and duration", async () => {
        // increase time before endTime
        const info = await hub.getHubInfo(hubId);

        await mineBlock(info.endTime.toNumber() - 2);
        const block = await ethers.provider.getBlock("latest");
        expect(info.endTime).to.be.gt(block.timestamp);

        // revert on finishUpdate
        await expect(hub.finishUpdate(hubId)).to.be.revertedWith(
          "Still updating"
        );
      });

      it("should correctly set HubInfo when called during cooldown", async () => {
        // increase time after endTime
        const oldDetails = await hub.getHubInfo(hubId);
        await mineBlock(oldDetails.endTime.toNumber() + 2);
        const block = await ethers.provider.getBlock("latest");
        expect(oldDetails.endTime).to.be.lt(block.timestamp);

        const finishUpdateTx = await hub.finishUpdate(hubId);
        await finishUpdateTx.wait();

        await expect(finishUpdateTx)
          .to.emit(hub, "FinishUpdate")
          .withArgs(hubId);

        const newDetails = await hub.getHubInfo(hubId);
        expect(newDetails.active).to.be.equal(true);
        expect(newDetails.owner).to.be.equal(account0.address);
        expect(newDetails.vault).to.be.equal(singleAssetVault.address);
        expect(newDetails.asset).to.be.equal(DAI);
        expect(newDetails.refundRatio).to.be.equal(refundRatio2);
        expect(newDetails.updating).to.be.equal(false);
        expect(newDetails.startTime).to.be.equal(0);
        expect(newDetails.endTime).to.be.equal(0);
        expect(newDetails.endCooldown).to.be.equal(oldDetails.endCooldown);
        expect(newDetails.reconfigure).to.be.equal(false);
        expect(newDetails.targetRefundRatio).to.be.equal(0);
      });

      describe("finishUpdate() from mint | burn", () => {
        let toggle = false; // for generating different weight each time
        beforeEach(async () => {
          const oldDetails = await hub.getHubInfo(hubId);
          await mineBlock(oldDetails.endCooldown.toNumber() + 10);

          const newReserveWeight = reserveWeight / (toggle ? 2 : 1);
          toggle = !toggle;
          const tx = await hub.initUpdate(hubId, 0, newReserveWeight);
          await tx.wait();

          // increase time after endTime
          const info = await hub.getHubInfo(hubId);
          await mineBlock(info.endTime.toNumber() + 2);
          const block = await ethers.provider.getBlock("latest");
          expect(info.endTime).to.be.lt(block.timestamp);
          expect(info.endCooldown).to.be.gt(block.timestamp);
        });

        it("should trigger finishUpdate() once when mint() called during cooldown", async () => {
          const amount = ethers.utils.parseEther("100");

          const tx = await foundry
            .connect(account2)
            .mint(meToken.address, amount, account2.address);

          await tx.wait();
          await expect(tx).to.emit(hub, "FinishUpdate").withArgs(hubId);
        });

        it("should trigger finishUpdate() once when burn() called during cooldown", async () => {
          const amount = ethers.utils.parseEther("10");

          const tx = await foundry
            .connect(account2)
            .burn(meToken.address, amount, account2.address);

          await tx.wait();
          await expect(tx).to.emit(hub, "FinishUpdate").withArgs(hubId);
        });

        it("should trigger finishUpdate() once after cooldown when mint() called if no mint() / burn() called during cooldown", async () => {
          // increase time after endCooldown
          const info = await hub.getHubInfo(hubId);
          await mineBlock(info.endCooldown.toNumber() + 2);
          const block = await ethers.provider.getBlock("latest");
          expect(info.endCooldown).to.be.lt(block.timestamp);

          const amount = ethers.utils.parseEther("100");

          const tx = await foundry
            .connect(account2)
            .mint(meToken.address, amount, account2.address);

          await tx.wait();
          await expect(tx).to.emit(hub, "FinishUpdate").withArgs(hubId);
        });

        it("should trigger finishUpdate() once after cooldown when burn() called if no mint() / burn() called during cooldown", async () => {
          // increase time after endCooldown
          const info = await hub.getHubInfo(hubId);
          await mineBlock(info.endCooldown.toNumber() + 2);
          const block = await ethers.provider.getBlock("latest");
          expect(info.endCooldown).to.be.lt(block.timestamp);

          const amount = ethers.utils.parseEther("10");

          const tx = await foundry
            .connect(account2)
            .burn(meToken.address, amount, account2.address);

          await tx.wait();
          await expect(tx).to.emit(hub, "FinishUpdate").withArgs(hubId);
        });
      });
    });

    describe("transferHubOwnership()", () => {
      it("should revert when called by non-owner", async () => {
        await expect(
          hub.connect(account1).transferHubOwnership(hubId, account1.address)
        ).to.be.revertedWith("!owner");
      });
      it("should revert when set to the current owner", async () => {
        await expect(
          hub.transferHubOwnership(hubId, account0.address)
        ).to.be.revertedWith("Same owner");
      });
      it("should transfers hub ownership", async () => {
        const transferHubOwnershipTx = await hub
          .connect(account0)
          .transferHubOwnership(hubId, account1.address);
        await transferHubOwnershipTx.wait();

        await expect(transferHubOwnershipTx)
          .to.emit(hub, "TransferHubOwnership")
          .withArgs(hubId, account1.address);

        const newDetails = await hub.getHubInfo(hubId);
        expect(newDetails.owner).to.be.equal(account1.address);
      });
      after(async () => {
        // transfer ownership back to account0, for simplicity of future tests
        await hub
          .connect(account1)
          .transferHubOwnership(hubId, account0.address);
        const newDetails = await hub.getHubInfo(hubId);
        expect(newDetails.owner).to.be.equal(account0.address);
      });
    });

    describe("deactivate()", () => {
      before(async () => {
        const newDetails = await hub.getHubInfo(hubId);
        expect(newDetails.active).to.equal(true);
      });
      it("should revert when sender isn't owner", async () => {
        await expect(
          hub.connect(account1).deactivate(hubId)
        ).to.be.revertedWith("!owner");
      });
      it("should deactivate hub", async () => {
        const tx = await hub.deactivate(hubId);

        await expect(tx).to.emit(hub, "Deactivate").withArgs(hubId);

        const newDetails = await hub.getHubInfo(hubId);
        expect(newDetails.active).to.equal(false);
      });
      it("should revert when hub already inactive", async () => {
        await expect(hub.deactivate(hubId)).to.be.revertedWith("!active");
      });
    });
    after(async () => {
      await network.provider.send("evm_revert", [snapshotId]);
    });
  });
};

setup().then(() => {
  run();
});
