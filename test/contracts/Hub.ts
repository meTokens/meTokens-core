import { ethers, getNamedAccounts } from "hardhat";
import { Hub } from "../../artifacts/types/Hub";
import { Foundry } from "../../artifacts/types/Foundry";
import { CurveRegistry } from "../../artifacts/types/CurveRegistry";
import { VaultRegistry } from "../../artifacts/types/VaultRegistry";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BancorZeroCurve } from "../../artifacts/types/BancorZeroCurve";
import { SingleAssetVault } from "../../artifacts/types/SingleAssetVault";
import { deploy } from "../utils/helpers";
import { hubSetupWithoutRegister } from "../utils/hubSetup";
import { expect } from "chai";
import { mineBlock } from "../utils/hardhatNode";

/*
const paginationFactory = await ethers.getContractFactory("Pagination", {});
const paginationLib = await paginationFactory.deploy();

const policyFactory = await ethers.getContractFactory("PolicyLib", {
  libraries: {
    Pagination: paginationLib.address,
  },
});
*/

describe("Hub.sol", () => {
  let DAI: string;
  let WETH: string;
  let account0: SignerWithAddress;
  let account1: SignerWithAddress;
  let curve: BancorZeroCurve;
  let foundry: Foundry;
  let hub: Hub;
  let singleAssetVault: SingleAssetVault;
  let curveRegistry: CurveRegistry;
  let vaultRegistry: VaultRegistry;
  let encodedVaultDAIArgs: string;
  let encodedVaultWETHArgs: string;
  let encodedCurveDetails: string;

  const hubId = 1;
  const refundRatio1 = 250000;
  const refundRatio2 = 240000;
  const PRECISION = ethers.utils.parseEther("1");
  const duration = 60 * 60;

  const MAX_WEIGHT = 1000000;
  const reserveWeight = MAX_WEIGHT / 2;
  const baseY = PRECISION.div(1000);

  before(async () => {
    ({ DAI, WETH } = await getNamedAccounts());
    encodedVaultDAIArgs = ethers.utils.defaultAbiCoder.encode(
      ["address"],
      [DAI]
    );
    encodedVaultWETHArgs = ethers.utils.defaultAbiCoder.encode(
      ["address"],
      [WETH]
    );
    encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint32"],
      [baseY, reserveWeight]
    );
    curve = await deploy<BancorZeroCurve>("BancorZeroCurve");
    ({
      hub,
      foundry,
      account0,
      account1,
      vaultRegistry,
      curveRegistry,
      singleAssetVault,
    } = await hubSetupWithoutRegister(curve));
  });

  describe("Initial state", () => {
    it("Check initial values", async () => {
      expect(await hub.MAX_REFUND_RATIO()).to.be.equal(10 ** 6);
      expect(await hub.foundry()).to.be.equal(foundry.address);
      expect(await hub.vaultRegistry()).to.be.equal(vaultRegistry.address);
      expect(await hub.curveRegistry()).to.be.equal(curveRegistry.address);
      expect(await hub.owner()).to.be.equal(account0.address);
      expect(await hub.count()).to.be.equal(0);
      expect(await hub.getWarmup()).to.be.equal(0);
      expect(await hub.getDuration()).to.be.equal(0);
      expect(await hub.getCooldown()).to.be.equal(0);
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
    it("Should revert from invalid address arguments", async () => {
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
        curve.address,
        refundRatio1,
        encodedCurveDetails,
        encodedVaultDAIArgs
      );
      await expect(tx).to.be.revertedWith("_vault !approved");
    });
    it("Should revert from invalid encodedCurveDetails", async () => {
      // Invalid _encodedCurveDetails for particular curve
      let tx = hub.register(
        account0.address,
        DAI,
        singleAssetVault.address,
        curve.address,
        refundRatio1,
        "0x", // invalid _encodedCurveDetails
        encodedVaultDAIArgs
      );
      await expect(tx).to.be.revertedWith("!_encodedDetails");

      // TODO as this revert is caused by external contracts, do they need to be covered here?
    });
    it("Should revert from invalid encodedVaultArgs", async () => {
      // Invalid _encodedVaultArgs
      const tx = hub.register(
        account0.address,
        ethers.constants.AddressZero,
        singleAssetVault.address,
        curve.address,
        refundRatio1,
        encodedCurveDetails,
        encodedVaultDAIArgs // invalid _encodedVaultArgs
      );
      await expect(tx).to.be.revertedWith("asset !valid");
    });
    it("Should revert from invalid _refundRatio", async () => {
      // _refundRatio > MAX_REFUND_RATIO
      let tx = hub.register(
        account0.address,
        DAI,
        singleAssetVault.address,
        curve.address,
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
        curve.address,
        0,
        encodedCurveDetails,
        encodedVaultDAIArgs
      );
      await expect(tx).to.be.revertedWith("_refundRatio == 0");
    });
    it("Should be able to register", async () => {
      const tx = await hub.register(
        account0.address,
        DAI,
        singleAssetVault.address,
        curve.address,
        refundRatio1,
        encodedCurveDetails,
        encodedVaultDAIArgs
      );
      await tx.wait();

      expect(tx)
        .to.emit(hub, "Register")
        .withArgs(
          account0.address,
          DAI,
          singleAssetVault.address,
          curve.address,
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
      expect(details.curve).to.be.equal(curve.address);
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
    it("Should revert to setWarmup if not owner", async () => {
      const tx = hub.connect(account1).setWarmup(duration);
      await expect(tx).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("Should revert to setWarmup if same as before", async () => {
      const oldWarmup = await hub.getWarmup();
      const tx = hub.setWarmup(oldWarmup);
      await expect(tx).to.be.revertedWith("warmup_ == _warmup");
    });
    it("Should be able to setWarmup", async () => {
      const tx = await hub.setWarmup(duration);
      await tx.wait();
      expect(await hub.getWarmup()).to.be.equal(duration);
    });
  });

  describe("setDuration()", () => {
    it("Should revert to setDuration if not owner", async () => {
      const tx = hub.connect(account1).setDuration(duration);
      await expect(tx).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("Should revert to setDuration if same as before", async () => {
      const oldWarmup = await hub.getDuration();
      const tx = hub.setDuration(oldWarmup);
      await expect(tx).to.be.revertedWith("duration_ == _duration");
    });
    it("Should be able to setDuration", async () => {
      const tx = await hub.setDuration(duration);
      await tx.wait();
      expect(await hub.getDuration()).to.be.equal(duration);
    });
  });

  describe("setCooldown()", () => {
    it("Should revert to setCooldown if not owner", async () => {
      const tx = hub.connect(account1).setCooldown(duration);
      await expect(tx).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("Should revert to setCooldown if same as before", async () => {
      const oldWarmup = await hub.getCooldown();
      const tx = hub.setCooldown(oldWarmup);
      await expect(tx).to.be.revertedWith("cooldown_ == _cooldown");
    });
    it("Should be able to setCooldown", async () => {
      const tx = await hub.setCooldown(duration);
      await tx.wait();
      expect(await hub.getCooldown()).to.be.equal(duration);
    });
  });

  describe("initUpdate()", () => {
    it("Should revert when sender is not owner", async () => {
      const tx = hub
        .connect(account1)
        .initUpdate(hubId, curve.address, refundRatio2, encodedCurveDetails);
      await expect(tx).to.be.revertedWith("!owner");
    });

    it("Should revert when nothing to update", async () => {
      const tx = hub.initUpdate(hubId, curve.address, 0, "0x");
      await expect(tx).to.be.revertedWith("Nothing to update");
      // FIXME Hub.sol, -109 fix the require conditions
    });

    it("Should revert from invalid _refundRatio", async () => {
      const tx1 = hub.initUpdate(
        hubId,
        curve.address,
        10 ** 7,
        encodedCurveDetails
      );
      const tx2 = hub.initUpdate(
        hubId,
        curve.address,
        refundRatio1,
        encodedCurveDetails
      );
      await expect(tx1).to.be.revertedWith("_targetRefundRatio >= MAX");
      await expect(tx2).to.be.revertedWith("_targetRefundRatio == refundRatio");
    });

    it("Should revert on ICurve.initReconfigure() from invalid encodedCurveDetails", async () => {
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
      // TODO as this revert is caused by external contracts, do they need to be covered here?
    });

    it("Should revert when curve is not approved", async () => {
      const tx = hub.initUpdate(
        hubId,
        account0.address, // invalid curve address
        refundRatio2,
        encodedCurveDetails
      );
      await expect(tx).to.be.revertedWith("_targetCurve !approved");
    });

    it("Should revert on ICurve.register() from invalid encodedCurveDetails", async () => {
      const badEncodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint32"],
        [0, 0]
      );
      const tx = hub.initUpdate(
        hubId,
        curve.address,
        refundRatio2,
        badEncodedCurveDetails
      );
      await expect(tx).to.be.revertedWith("!baseY");
      // TODO as this revert is caused by external contracts, do they need to be covered here?
    });

    it("Should be able to initUpdate with new refundRatio", async () => {
      const tx = await hub.initUpdate(
        hubId,
        curve.address,
        refundRatio2,
        encodedCurveDetails
      );
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      const expectedStartTime = block.timestamp + duration;
      const expectedEndTime = block.timestamp + duration + duration;
      const expectedEndCooldownTime =
        block.timestamp + duration + duration + duration;

      expect(tx)
        .to.emit(hub, "InitUpdate")
        .withArgs(
          hubId,
          curve.address,
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
      expect(details.curve).to.be.equal(curve.address);
      expect(details.refundRatio).to.be.equal(refundRatio1);
      expect(details.updating).to.be.equal(true);
      expect(details.startTime).to.be.equal(expectedStartTime);
      expect(details.endTime).to.be.equal(expectedEndTime);
      expect(details.endCooldown).to.be.equal(expectedEndCooldownTime);
      expect(details.reconfigure).to.be.equal(false);
      expect(details.targetCurve).to.be.equal(curve.address);
      expect(details.targetRefundRatio).to.be.equal(refundRatio2);
    });

    it("Should revert to called during warmup, duration, and cooldown", async () => {
      // calling initUpdate() to revert
      const txBeforeStartTime = hub.initUpdate(
        hubId,
        curve.address,
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
        curve.address,
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
        curve.address,
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
        curve.address,
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
        curve.address,
        refundRatio2,
        encodedCurveDetails
      );
      await expect(txBeforeEndCooldown).to.be.revertedWith(
        "Still cooling down"
      );
      block = await ethers.provider.getBlock("latest");
      expect(details.endTime).to.be.lt(block.timestamp);
    });

    it("Should first finishUpdate (if not) before next initUpdate and set correct Hub details", async () => {
      let details = await hub.getDetails(hubId);
      const newEncodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
        ["uint32"],
        [reserveWeight / 2]
      );

      // fast fwd to endCooldown - 2
      await mineBlock(details.endCooldown.toNumber());
      const txAfterEndCooldown = await hub.initUpdate(
        hubId,
        ethers.constants.AddressZero,
        0,
        newEncodedCurveDetails
      );

      const receipt = await txAfterEndCooldown.wait();
      let block = await ethers.provider.getBlock("latest");
      expect(details.endCooldown).to.be.lte(block.timestamp);

      block = await ethers.provider.getBlock(receipt.blockNumber);
      const expectedStartTime = block.timestamp + duration;
      const expectedEndTime = block.timestamp + duration + duration;
      const expectedEndCooldownTime =
        block.timestamp + duration + duration + duration;

      expect(txAfterEndCooldown)
        .to.emit(hub, "FinishUpdate")
        .withArgs(1)
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

      details = await hub.getDetails(hubId);
      expect(details.active).to.be.equal(true);
      expect(details.owner).to.be.equal(account0.address);
      expect(details.vault).to.be.equal(singleAssetVault.address);
      expect(details.asset).to.be.equal(DAI);
      expect(details.curve).to.be.equal(curve.address);
      expect(details.refundRatio).to.be.equal(refundRatio2);
      expect(details.updating).to.be.equal(true);
      expect(details.startTime).to.be.equal(expectedStartTime);
      expect(details.endTime).to.be.equal(expectedEndTime);
      expect(details.endCooldown).to.be.equal(expectedEndCooldownTime);
      expect(details.reconfigure).to.be.equal(true);
      expect(details.targetCurve).to.be.equal(curve.address);
      expect(details.targetRefundRatio).to.be.equal(0);
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

      expect(tx).to.emit(hub, "CancelUpdate").withArgs(hubId);

      const details = await hub.getDetails(hubId);
      expect(details.active).to.be.equal(true);
      expect(details.owner).to.be.equal(account0.address);
      expect(details.vault).to.be.equal(singleAssetVault.address);
      expect(details.asset).to.be.equal(DAI);
      expect(details.curve).to.be.equal(curve.address);
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

      expect(tx)
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
      expect(details.curve).to.be.equal(curve.address);
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
    it("Should revert if all arguments are the same", async () => {
      // TODO
    });
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

    it("Trigger once when mint() called during cooldown", async () => {
      // TODO
    });

    it("Trigger once when burn() called during cooldown", async () => {
      // TODO
    });

    it("Trigger once when mint() called if no mint() / burn() called during cooldown", async () => {
      // TODO
    });

    it("Trigger once when burn() called if no mint() / burn() called during cooldown", async () => {
      // TODO
    });

    it("should correctly set HubDetails when called during cooldown", async () => {
      // increase time after endTime
      const oldDetails = await hub.getDetails(hubId);
      await mineBlock(oldDetails.endTime.toNumber() + 2);
      const block = await ethers.provider.getBlock("latest");
      expect(oldDetails.endTime).to.be.lt(block.timestamp);

      const finishUpdateTx = await hub.finishUpdate(hubId);
      await finishUpdateTx.wait();

      expect(finishUpdateTx).to.emit(hub, "FinishUpdate").withArgs(hubId);

      const newDetails = await hub.getDetails(hubId);
      expect(newDetails.active).to.be.equal(true);
      expect(newDetails.owner).to.be.equal(account0.address);
      expect(newDetails.vault).to.be.equal(singleAssetVault.address);
      expect(newDetails.asset).to.be.equal(DAI);
      expect(newDetails.curve).to.be.equal(curve.address);
      expect(newDetails.refundRatio).to.be.equal(refundRatio2);
      expect(newDetails.updating).to.be.equal(false);
      expect(newDetails.startTime).to.be.equal(0);
      expect(newDetails.endTime).to.be.equal(0);
      expect(newDetails.endCooldown).to.be.equal(oldDetails.endCooldown);
      expect(newDetails.reconfigure).to.be.equal(false);
      expect(newDetails.targetCurve).to.be.equal(ethers.constants.AddressZero);
      expect(newDetails.targetRefundRatio).to.be.equal(0);
    });
    it("Correctly set HubDetails when called after cooldown", async () => {
      // TODO Not required as would be same as above
    });
    it("Correctly set HubDetails when called during second initUpdate()", async () => {
      // TODO Covered in initUpdate() describe
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

      expect(transferHubOwnershipTx)
        .to.emit(hub, "TransferHubOwnership")
        .withArgs(hubId, account1.address);

      const newDetails = await hub.getDetails(hubId);
      expect(newDetails.owner).to.be.equal(account1.address);
    });
  });
});
