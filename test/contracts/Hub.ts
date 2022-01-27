import { ethers, getNamedAccounts } from "hardhat";
import { HubFacet } from "../../artifacts/types/HubFacet";
import { Foundry } from "../../artifacts/types/Foundry";
import { CurveRegistry } from "../../artifacts/types/CurveRegistry";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BancorABDK } from "../../artifacts/types/BancorABDK";
import { SingleAssetVault } from "../../artifacts/types/SingleAssetVault";
import { deploy, getContractAt } from "../utils/helpers";
import { hubSetupWithoutRegister } from "../utils/hubSetup";
import { expect } from "chai";
import { mineBlock } from "../utils/hardhatNode";
import { ERC20 } from "../../artifacts/types/ERC20";
import { Signer } from "ethers";
import { MeTokenRegistry } from "../../artifacts/types/MeTokenRegistry";
import { MeToken } from "../../artifacts/types/MeToken";
import { ICurve } from "../../artifacts/types";

/*
const paginationFactory = await ethers.getContractFactory("Pagination", {});
const paginationLib = await paginationFactory.deploy();

const policyFactory = await ethers.getContractFactory("PolicyLib", {
  libraries: {
    Pagination: paginationLib.address,
  },
});
*/
const setup = async () => {
  describe("HubFacet.sol", () => {
    let DAI: string;
    let account0: SignerWithAddress;
    let account1: SignerWithAddress;
    let account2: SignerWithAddress;
    let hubCurve: ICurve;
    let newCurve: BancorABDK;
    let foundry: Foundry;
    let hub: HubFacet;
    let singleAssetVault: SingleAssetVault;
    let curveRegistry: CurveRegistry;
    let encodedVaultDAIArgs: string;
    let encodedCurveDetails: string;
    let token: ERC20;
    let dai: ERC20;
    let tokenHolder: Signer;
    let meTokenRegistry: MeTokenRegistry;
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

    before(async () => {
      ({ DAI } = await getNamedAccounts());
      encodedVaultDAIArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [DAI]
      );
      encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint32"],
        [baseY, reserveWeight]
      );

      ({
        token,
        hubCurve,
        curveRegistry,
        hub,
        foundry,
        account0,
        account1,
        account2,
        meTokenRegistry,
      } = await hubSetupWithoutRegister("bancorABDK"));
    });

    describe("Initial state", () => {
      it("Check initial values", async () => {
        // expect(await hub.owner()).to.be.equal(account0.address);
        expect(await hub.count()).to.be.equal(0);
        expect(await hub.warmup()).to.be.equal(0);
        expect(await hub.duration()).to.be.equal(0);
        expect(await hub.cooldown()).to.be.equal(0);
        // expect(await hub.registerer()).to.be.equal(account0.address);
        const details = await hub.getDetails(0);
        expect(details.active).to.be.equal(false);
        expect(details.owner).to.be.equal(ethers.constants.AddressZero);
        expect(details.vault).to.be.equal(ethers.constants.AddressZero);
        expect(details.asset).to.be.equal(ethers.constants.AddressZero);
        expect(details.curve).to.be.equal(ethers.constants.AddressZero);
        expect(details.refundRatio).to.be.equal(0);
        expect(details.updating).to.be.equal(false);
        expect(details.startTime).to.be.equal(0);
        expect(details.endTime).to.be.equal(0);
        expect(details.endCooldown).to.be.equal(0);
        expect(details.reconfigure).to.be.equal(false);
        expect(details.targetCurve).to.be.equal(ethers.constants.AddressZero);
        expect(details.targetRefundRatio).to.be.equal(0);
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
              hubCurve.address,
              refundRatio1,
              encodedCurveDetails,
              encodedVaultDAIArgs
            )
        ).to.be.revertedWith("!registerer");
      });
      it("should revert from invalid address arguments", async () => {
        // Un-approved curve
        let tx = hub.register(
          account0.address,
          DAI,
          singleAssetVault.address,
          account0.address, // random unapproved address
          refundRatio1,
          encodedCurveDetails,
          encodedVaultDAIArgs
        );
        await expect(tx).to.be.revertedWith("_curve !approved");

        // Un-approved vault
        tx = hub.register(
          account0.address,
          DAI,
          account0.address, // random unapproved address
          hubCurve.address,
          refundRatio1,
          encodedCurveDetails,
          encodedVaultDAIArgs
        );
        await expect(tx).to.be.revertedWith("_vault !approved");
      });
      it("should revert from invalid encodedCurveDetails", async () => {
        // Invalid _encodedCurveDetails for particular curve
        await expect(
          hub.register(
            account0.address,
            DAI,
            singleAssetVault.address,
            hubCurve.address,
            refundRatio1,
            "0x", // invalid _encodedCurveDetails
            encodedVaultDAIArgs
          )
        ).to.be.revertedWith("!_encodedDetails");
        await expect(
          hub.register(
            account0.address,
            DAI,
            singleAssetVault.address,
            hubCurve.address,
            refundRatio1,
            ethers.utils.toUtf8Bytes(""), // invalid _encodedCurveDetails
            encodedVaultDAIArgs
          )
        ).to.be.revertedWith("!_encodedDetails");
      });
      it("should revert from invalid encodedVaultArgs", async () => {
        // Invalid _encodedVaultArgs
        const tx = hub.register(
          account0.address,
          ethers.constants.AddressZero,
          singleAssetVault.address,
          hubCurve.address,
          refundRatio1,
          encodedCurveDetails,
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
          hubCurve.address,
          10 ** 7,
          encodedCurveDetails,
          encodedVaultDAIArgs
        );
        await expect(tx).to.be.revertedWith("_refundRatio > MAX");

        // _refundRatio = 0
        tx = hub.register(
          account0.address,
          DAI,
          singleAssetVault.address,
          hubCurve.address,
          0,
          encodedCurveDetails,
          encodedVaultDAIArgs
        );
        await expect(tx).to.be.revertedWith("_refundRatio == 0");
      });
      it("should be able to register", async () => {
        const tx = await hub.register(
          account0.address,
          DAI,
          singleAssetVault.address,
          hubCurve.address,
          refundRatio1,
          encodedCurveDetails,
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
            hubCurve.address,
            refundRatio1,
            encodedCurveDetails,
            encodedVaultDAIArgs
          );
        expect(await hub.count()).to.be.equal(hubId);
        const details = await hub.getDetails(hubId);
        expect(details.active).to.be.equal(true);
        expect(details.owner).to.be.equal(account0.address);
        expect(details.vault).to.be.equal(singleAssetVault.address);
        expect(details.asset).to.be.equal(DAI);
        expect(details.curve).to.be.equal(hubCurve.address);
        expect(details.refundRatio).to.be.equal(refundRatio1);
        expect(details.updating).to.be.equal(false);
        expect(details.startTime).to.be.equal(0);
        expect(details.endTime).to.be.equal(0);
        expect(details.endCooldown).to.be.equal(0);
        expect(details.reconfigure).to.be.equal(false);
        expect(details.targetCurve).to.be.equal(ethers.constants.AddressZero);
        expect(details.targetRefundRatio).to.be.equal(0);
      });
    });

    describe("setWarmup()", () => {
      before(async () => {
        // required in later testing

        dai = token;
        let enough = amount.mul(10);
        await dai.connect(tokenHolder).transfer(account0.address, enough);
        await dai.connect(tokenHolder).transfer(account1.address, enough);
        await dai.connect(tokenHolder).transfer(account2.address, enough);
        let max = ethers.constants.MaxUint256;
        await dai.connect(account1).approve(singleAssetVault.address, max);
        await dai.connect(account2).approve(singleAssetVault.address, max);
        await dai.connect(account1).approve(meTokenRegistry.address, max);
        // account0 is registering a metoken
        const tx = await meTokenRegistry
          .connect(account0)
          .subscribe(name, symbol, hubId, 0);
        const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
          account0.address
        );

        meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);
      });
      it("should revert to setWarmup if not owner", async () => {
        const tx = hub.connect(account1).setWarmup(duration);
        await expect(tx).to.be.revertedWith(
          "LibDiamond: Must be contract owner"
        );
      });
      it("should revert to setWarmup if same as before", async () => {
        const oldWarmup = await hub.warmup();
        const tx = hub.setWarmup(oldWarmup);
        await expect(tx).to.be.revertedWith("_warmup == s.hubWarmup");
      });
      it("should be able to setWarmup", async () => {
        const tx = await hub.setWarmup(duration);
        await tx.wait();
        expect(await hub.warmup()).to.be.equal(duration);
      });
    });

    describe("setDuration()", () => {
      it("should revert to setDuration if not owner", async () => {
        const tx = hub.connect(account1).setDuration(duration);
        await expect(tx).to.be.revertedWith(
          "LibDiamond: Must be contract owner"
        );
      });
      it("should revert to setDuration if same as before", async () => {
        const oldWarmup = await hub.duration();
        const tx = hub.setDuration(oldWarmup);
        await expect(tx).to.be.revertedWith("_duration_ == s.hubDuration");
      });
      it("should be able to setDuration", async () => {
        const tx = await hub.setDuration(duration);
        await tx.wait();
        expect(await hub.duration()).to.be.equal(duration);
      });
    });

    describe("setCooldown()", () => {
      it("should revert to setCooldown if not owner", async () => {
        const tx = hub.connect(account1).setCooldown(duration);
        await expect(tx).to.be.revertedWith(
          "LibDiamond: Must be contract owner"
        );
      });
      it("should revert to setCooldown if same as before", async () => {
        const oldWarmup = await hub.cooldown();
        const tx = hub.setCooldown(oldWarmup);
        await expect(tx).to.be.revertedWith("_cooldown == s.hubCooldown");
      });
      it("should be able to setCooldown", async () => {
        const tx = await hub.setCooldown(duration);
        await tx.wait();
        expect(await hub.cooldown()).to.be.equal(duration);
      });
    });

    describe("initUpdate()", () => {
      it("should revert when sender is not owner", async () => {
        const tx = hub
          .connect(account1)
          .initUpdate(
            hubId,
            hubCurve.address,
            refundRatio2,
            encodedCurveDetails
          );
        await expect(tx).to.be.revertedWith("!owner");
      });

      it("should revert when nothing to update", async () => {
        const tx = hub.initUpdate(hubId, hubCurve.address, 0, "0x");
        await expect(tx).to.be.revertedWith("Nothing to update");
      });

      it("should revert from invalid _refundRatio", async () => {
        const tx1 = hub.initUpdate(
          hubId,
          hubCurve.address,
          10 ** 7,
          encodedCurveDetails
        );
        const tx2 = hub.initUpdate(
          hubId,
          hubCurve.address,
          refundRatio1,
          encodedCurveDetails
        );
        await expect(tx1).to.be.revertedWith("_targetRefundRatio >= MAX");
        await expect(tx2).to.be.revertedWith(
          "_targetRefundRatio == refundRatio"
        );
      });

      it("should revert on ICurve.initReconfigure() from invalid encodedCurveDetails", async () => {
        const badEncodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
          ["uint32"],
          [0]
        );
        const tx = hub.initUpdate(
          hubId,
          ethers.constants.AddressZero,
          0,
          badEncodedCurveDetails
        );
        await expect(tx).to.be.revertedWith("!reserveWeight");
      });

      it("should revert when curve is not approved", async () => {
        const tx = hub.initUpdate(
          hubId,
          account0.address, // invalid curve address
          refundRatio2,
          encodedCurveDetails
        );
        await expect(tx).to.be.revertedWith("_targetCurve !approved");
      });

      it("should revert on ICurve.register() from invalid encodedCurveDetails", async () => {
        const badEncodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
          ["uint256", "uint32"],
          [0, 0]
        );
        const newCurve = await deploy<BancorABDK>(
          "BancorABDK",
          undefined,
          hub.address
        );
        await curveRegistry.approve(newCurve.address);
        const tx = hub.initUpdate(
          hubId,
          newCurve.address,
          refundRatio2,
          badEncodedCurveDetails
        );
        await expect(tx).to.be.revertedWith("!baseY");
      });

      it("should be able to initUpdate with new refundRatio", async () => {
        newCurve = await deploy<BancorABDK>(
          "BancorABDK",
          undefined,
          hub.address
        );
        await curveRegistry.approve(newCurve.address);
        const tx = await hub.initUpdate(
          hubId,
          newCurve.address,
          refundRatio2,
          encodedCurveDetails
        );
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
            newCurve.address,
            refundRatio2,
            encodedCurveDetails,
            false,
            expectedStartTime,
            expectedEndTime,
            expectedEndCooldownTime
          );
        const details = await hub.getDetails(hubId);
        expect(details.active).to.be.equal(true);
        expect(details.owner).to.be.equal(account0.address);
        expect(details.vault).to.be.equal(singleAssetVault.address);
        expect(details.asset).to.be.equal(DAI);
        expect(details.curve).to.be.equal(hubCurve.address);
        expect(details.refundRatio).to.be.equal(refundRatio1);
        expect(details.updating).to.be.equal(true);
        expect(details.startTime).to.be.equal(expectedStartTime);
        expect(details.endTime).to.be.equal(expectedEndTime);
        expect(details.endCooldown).to.be.equal(expectedEndCooldownTime);
        expect(details.reconfigure).to.be.equal(false);
        expect(details.targetCurve).to.be.equal(newCurve.address);
        expect(details.targetRefundRatio).to.be.equal(refundRatio2);
      });

      it("should revert to called during warmup, duration, and cooldown", async () => {
        // calling initUpdate() to revert
        const txBeforeStartTime = hub.initUpdate(
          hubId,
          hubCurve.address,
          refundRatio2,
          encodedCurveDetails
        );
        const details = await hub.getDetails(hubId);

        await expect(txBeforeStartTime).to.be.revertedWith("already updating");
        let block = await ethers.provider.getBlock("latest");

        // fast fwd to startTime | warmup
        await mineBlock(details.startTime.toNumber() + 1);
        const txAfterStartTime = hub.initUpdate(
          hubId,
          hubCurve.address,
          refundRatio2,
          encodedCurveDetails
        );
        await expect(txAfterStartTime).to.be.revertedWith("already updating");
        block = await ethers.provider.getBlock("latest");
        expect(details.startTime).to.be.lt(block.timestamp);

        // fast fwd to endTime - 1
        await mineBlock(details.endTime.toNumber() - 1);
        const txBeforeEndTime = hub.initUpdate(
          hubId,
          hubCurve.address,
          refundRatio2,
          encodedCurveDetails
        );
        await expect(txBeforeEndTime).to.be.revertedWith("already updating");
        block = await ethers.provider.getBlock("latest");
        expect(details.endTime).to.be.gte(block.timestamp);

        // fast fwd to endTime | duration
        await mineBlock(details.endTime.toNumber() + 1);
        const txAfterEndTime = hub.initUpdate(
          hubId,
          hubCurve.address,
          refundRatio2,
          encodedCurveDetails
        );
        await expect(txAfterEndTime).to.be.revertedWith("Still cooling down");
        block = await ethers.provider.getBlock("latest");
        expect(details.endTime).to.be.lt(block.timestamp);

        // fast fwd to endCooldown - 2
        await mineBlock(details.endCooldown.toNumber() - 2);
        const txBeforeEndCooldown = hub.initUpdate(
          hubId,
          hubCurve.address,
          refundRatio2,
          encodedCurveDetails
        );
        await expect(txBeforeEndCooldown).to.be.revertedWith(
          "Still cooling down"
        );
        block = await ethers.provider.getBlock("latest");
        expect(details.endTime).to.be.lt(block.timestamp);
      });

      it("should first finishUpdate (if not) before next initUpdate and set correct Hub details", async () => {
        let details = await hub.getDetails(hubId);

        // fast fwd to endCooldown - 2
        await mineBlock(details.endCooldown.toNumber());
        const txAfterEndCooldown = await hub.initUpdate(
          hubId,
          ethers.constants.AddressZero,
          refundRatio1,
          "0x"
        );

        const receipt = await txAfterEndCooldown.wait();
        let block = await ethers.provider.getBlock("latest");
        expect(details.endCooldown).to.be.lte(block.timestamp);

        block = await ethers.provider.getBlock(receipt.blockNumber);
        const expectedStartTime = block.timestamp + duration;
        const expectedEndTime = block.timestamp + duration + duration;
        const expectedEndCooldownTime =
          block.timestamp + duration + duration + duration;

        await expect(txAfterEndCooldown)
          .to.emit(hub, "FinishUpdate")
          .withArgs(1)
          .to.emit(hub, "InitUpdate")
          .withArgs(
            hubId,
            ethers.constants.AddressZero,
            refundRatio1,
            "0x",
            false,
            expectedStartTime,
            expectedEndTime,
            expectedEndCooldownTime
          );

        details = await hub.getDetails(hubId);
        expect(details.active).to.be.equal(true);
        expect(details.owner).to.be.equal(account0.address);
        expect(details.vault).to.be.equal(singleAssetVault.address);
        expect(details.asset).to.be.equal(DAI);
        expect(details.curve).to.be.equal(newCurve.address);
        expect(details.refundRatio).to.be.equal(refundRatio2);
        expect(details.updating).to.be.equal(true);
        expect(details.startTime).to.be.equal(expectedStartTime);
        expect(details.endTime).to.be.equal(expectedEndTime);
        expect(details.endCooldown).to.be.equal(expectedEndCooldownTime);
        expect(details.reconfigure).to.be.equal(false);
        expect(details.targetCurve).to.be.equal(ethers.constants.AddressZero);
        expect(details.targetRefundRatio).to.be.equal(refundRatio1);
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

        const details = await hub.getDetails(hubId);
        expect(details.active).to.be.equal(true);
        expect(details.owner).to.be.equal(account0.address);
        expect(details.vault).to.be.equal(singleAssetVault.address);
        expect(details.asset).to.be.equal(DAI);
        expect(details.curve).to.be.equal(newCurve.address);
        expect(details.refundRatio).to.be.equal(refundRatio2);
        expect(details.updating).to.be.equal(false);
        expect(details.startTime).to.be.equal(0);
        expect(details.endTime).to.be.equal(0);
        expect(details.endCooldown).to.be.equal(0);
        expect(details.reconfigure).to.be.equal(false);
        expect(details.targetCurve).to.be.equal(ethers.constants.AddressZero);
        expect(details.targetRefundRatio).to.be.equal(0);
      });
      it("should revert when not updating", async () => {
        await expect(hub.cancelUpdate(hubId)).to.be.revertedWith("!updating");
      });
      it("should revert after warmup period", async () => {
        // create a update
        const newEncodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
          ["uint32"],
          [reserveWeight / 2]
        );
        const tx = await hub.initUpdate(
          hubId,
          ethers.constants.AddressZero,
          0,
          newEncodedCurveDetails
        );
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
            ethers.constants.AddressZero,
            0,
            newEncodedCurveDetails,
            true,
            expectedStartTime,
            expectedEndTime,
            expectedEndCooldownTime
          );

        const details = await hub.getDetails(hubId);
        expect(details.active).to.be.equal(true);
        expect(details.owner).to.be.equal(account0.address);
        expect(details.vault).to.be.equal(singleAssetVault.address);
        expect(details.asset).to.be.equal(DAI);
        expect(details.curve).to.be.equal(newCurve.address);
        expect(details.refundRatio).to.be.equal(refundRatio2);
        expect(details.updating).to.be.equal(true);
        expect(details.startTime).to.be.equal(expectedStartTime);
        expect(details.endTime).to.be.equal(expectedEndTime);
        expect(details.endCooldown).to.be.equal(expectedEndCooldownTime);
        expect(details.reconfigure).to.be.equal(true);
        expect(details.targetCurve).to.be.equal(ethers.constants.AddressZero);
        expect(details.targetRefundRatio).to.be.equal(0);

        // increase time beyond warmup period
        await mineBlock(details.startTime.toNumber() + 1);
        block = await ethers.provider.getBlock("latest");
        expect(details.startTime).to.be.lt(block.timestamp);

        // revert on cancelUpdate
        const cancelUpdateTx = hub.cancelUpdate(hubId);
        await expect(cancelUpdateTx).to.be.revertedWith("Update has started");
      });
    });

    describe("finishUpdate()", () => {
      it("should revert before endTime, during warmup and duration", async () => {
        // increase time before endTime
        const details = await hub.getDetails(hubId);

        await mineBlock(details.endTime.toNumber() - 2);
        const block = await ethers.provider.getBlock("latest");
        expect(details.endTime).to.be.gt(block.timestamp);

        // revert on finishUpdate
        await expect(hub.finishUpdate(hubId)).to.be.revertedWith(
          "Still updating"
        );
      });

      it("should correctly set HubDetails when called during cooldown", async () => {
        // increase time after endTime
        const oldDetails = await hub.getDetails(hubId);
        await mineBlock(oldDetails.endTime.toNumber() + 2);
        const block = await ethers.provider.getBlock("latest");
        expect(oldDetails.endTime).to.be.lt(block.timestamp);

        const finishUpdateTx = await hub.finishUpdate(hubId);
        await finishUpdateTx.wait();

        await expect(finishUpdateTx)
          .to.emit(hub, "FinishUpdate")
          .withArgs(hubId);

        const newDetails = await hub.getDetails(hubId);
        expect(newDetails.active).to.be.equal(true);
        expect(newDetails.owner).to.be.equal(account0.address);
        expect(newDetails.vault).to.be.equal(singleAssetVault.address);
        expect(newDetails.asset).to.be.equal(DAI);
        expect(newDetails.curve).to.be.equal(newCurve.address);
        expect(newDetails.refundRatio).to.be.equal(refundRatio2);
        expect(newDetails.updating).to.be.equal(false);
        expect(newDetails.startTime).to.be.equal(0);
        expect(newDetails.endTime).to.be.equal(0);
        expect(newDetails.endCooldown).to.be.equal(oldDetails.endCooldown);
        expect(newDetails.reconfigure).to.be.equal(false);
        expect(newDetails.targetCurve).to.be.equal(
          ethers.constants.AddressZero
        );
        expect(newDetails.targetRefundRatio).to.be.equal(0);
      });

      describe("finishUpdate() from mint | burn", () => {
        let toggle = false; // for generating different weight each time
        beforeEach(async () => {
          const oldDetails = await hub.getDetails(hubId);
          await mineBlock(oldDetails.endCooldown.toNumber() + 10);

          const newEncodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
            ["uint32"],
            [reserveWeight / (toggle ? 2 : 1)]
          );
          toggle = !toggle;
          const tx = await hub.initUpdate(
            hubId,
            ethers.constants.AddressZero,
            0,
            newEncodedCurveDetails
          );
          await tx.wait();

          // increase time after endTime
          const details = await hub.getDetails(hubId);
          await mineBlock(details.endTime.toNumber() + 2);
          const block = await ethers.provider.getBlock("latest");
          expect(details.endTime).to.be.lt(block.timestamp);
          expect(details.endCooldown).to.be.gt(block.timestamp);
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
          const details = await hub.getDetails(hubId);
          await mineBlock(details.endCooldown.toNumber() + 2);
          const block = await ethers.provider.getBlock("latest");
          expect(details.endCooldown).to.be.lt(block.timestamp);

          const amount = ethers.utils.parseEther("100");

          const tx = await foundry
            .connect(account2)
            .mint(meToken.address, amount, account2.address);

          await tx.wait();
          await expect(tx).to.emit(hub, "FinishUpdate").withArgs(hubId);
        });

        it("should trigger finishUpdate() once after cooldown when burn() called if no mint() / burn() called during cooldown", async () => {
          // increase time after endCooldown
          const details = await hub.getDetails(hubId);
          await mineBlock(details.endCooldown.toNumber() + 2);
          const block = await ethers.provider.getBlock("latest");
          expect(details.endCooldown).to.be.lt(block.timestamp);

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
        const transferHubOwnershipTx = await hub.transferHubOwnership(
          hubId,
          account1.address
        );
        await transferHubOwnershipTx.wait();

        await expect(transferHubOwnershipTx)
          .to.emit(hub, "TransferHubOwnership")
          .withArgs(hubId, account1.address);

        const newDetails = await hub.getDetails(hubId);
        expect(newDetails.owner).to.be.equal(account1.address);
      });
      after(async () => {
        // transfer ownership back to account0, for simplicity of future tests
        await hub
          .connect(account1)
          .transferHubOwnership(hubId, account0.address);
        const newDetails = await hub.getDetails(hubId);
        expect(newDetails.owner).to.be.equal(account0.address);
      });
    });

    describe("deactivate()", () => {
      before(async () => {
        const newDetails = await hub.getDetails(hubId);
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

        const newDetails = await hub.getDetails(hubId);
        expect(newDetails.active).to.equal(false);
      });
      it("should revert when hub already inactive", async () => {
        await expect(hub.deactivate(hubId)).to.be.revertedWith("!active");
      });
    });

    describe("setRegisterer() [TODO]", () => {
      // it("should revert when sender is not registerer", async () => {
      //   await expect(
      //     hub.connect(account1).setRegisterer(account1.address)
      //   ).to.be.revertedWith("!registerer");
      // });
      // it("should revert when new registerer is same as old", async () => {
      //   await expect(hub.setRegisterer(account0.address)).to.be.revertedWith(
      //     "_registerer == registerer"
      //   );
      // });
      // it("should be able to change registerer", async () => {
      //   await hub.setRegisterer(account1.address);
      //   expect(await hub.registerer()).to.be.equal(account1.address);
      // });
      // after(async () => {
      //   await expect(
      //     hub.connect(account0).setRegisterer(account0.address)
      //   ).to.be.revertedWith("!registerer");
      //   // set registerer back to account0
      //   await hub.connect(account1).setRegisterer(account0.address);
      //   expect(await hub.registerer()).to.be.equal(account0.address);
      // });
    });
  });
};

setup().then(() => {
  run();
});
