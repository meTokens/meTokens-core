import { ethers, getNamedAccounts } from "hardhat";
import { Hub } from "../../artifacts/types/Hub";
import { Foundry } from "../../artifacts/types/Foundry";
import { CurveRegistry } from "../../artifacts/types/CurveRegistry";
import { VaultRegistry } from "../../artifacts/types/VaultRegistry";
import { Signer, BigNumber } from "ethers";
import { ERC20 } from "../../artifacts/types/ERC20";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BancorZeroCurve } from "../../artifacts/types/BancorZeroCurve";
import { MeTokenRegistry } from "../../artifacts/types/MeTokenRegistry";
import { MeToken } from "../../artifacts/types/MeToken";
import { SingleAssetVault } from "../../artifacts/types/SingleAssetVault";
import { MigrationRegistry } from "../../artifacts/types/MigrationRegistry";
import { deploy } from "../utils/helpers";
import { hubSetup, hubSetupWithoutRegister } from "../utils/hubSetup";
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
  let DAIWhale: string;
  let WETH: string;
  let WETHWhale: string;
  let daiHolder: Signer;
  let dai: ERC20;
  let account0: SignerWithAddress;
  let account1: SignerWithAddress;
  let account2: SignerWithAddress;
  let curve: BancorZeroCurve;
  let meTokenRegistry: MeTokenRegistry;
  let foundry: Foundry;
  let token: ERC20;
  let meToken: MeToken;
  let tokenHolder: Signer;
  let hub: Hub;
  let singleAssetVault: SingleAssetVault;
  let migrationRegistry: MigrationRegistry;
  let curveRegistry: CurveRegistry;
  let vaultRegistry: VaultRegistry;
  let encodedVaultDAIArgs: string;
  let encodedVaultWETHArgs: string;
  let encodedCurveDetails: string;

  const hubId = 1;
  const name = "Carl meToken";
  const symbol = "CARL";
  const refundRatio1 = 250000;
  const refundRatio2 = 240000;
  const initRefundRatio = 50000;
  const PRECISION = ethers.utils.parseEther("1");
  const amount = ethers.utils.parseEther("10");
  const amount1 = ethers.utils.parseEther("100");
  const amount2 = ethers.utils.parseEther("6.9");
  const duration = 60 * 60;

  // TODO: pass in curve arguments to function
  // TODO: then loop over array of set of curve arguments
  const MAX_WEIGHT = 1000000;
  const reserveWeight = MAX_WEIGHT / 2;
  const baseY = PRECISION.div(1000);

  before(async () => {
    ({ DAI, DAIWhale, WETH, WETHWhale } = await getNamedAccounts());
    encodedVaultDAIArgs = ethers.utils.defaultAbiCoder.encode(
      ["address"],
      [DAI]
    );
    encodedVaultWETHArgs = ethers.utils.defaultAbiCoder.encode(
      ["address"],
      [WETH]
    );
    // TODO: pass in name of curve to deploy, encodedCurveDetails to general func
    encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint32"],
      [baseY, reserveWeight]
    );
    curve = await deploy<BancorZeroCurve>("BancorZeroCurve");
    ({
      token,
      tokenHolder,
      hub,
      foundry,
      account0,
      account1,
      account2,
      meTokenRegistry,
      vaultRegistry,
      curveRegistry,
      migrationRegistry,
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
      expect(await hub.count()).to.be.equal(1);
      const details = await hub.getDetails(1);
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
      // FIXME Hub.sol, -109 fix the conditions
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

      const details = await hub.getDetails(1);
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
      // TODO: fast fwd to warmup, duration, cooldown and use expect() for each
      // calling initUpdate() to revert
      const txBeforeStartTime = hub.initUpdate(
        hubId,
        curve.address,
        refundRatio2,
        encodedCurveDetails
      );
      const details = await hub.getDetails(1);

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

    it("Should first finishUpdate (if not) before next initUpdate", async () => {
      let details = await hub.getDetails(1);
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

      details = await hub.getDetails(1);
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

      const details = await hub.getDetails(1);
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
    it("should revert after warmup period", async () => {});
  });

  describe("finishUpdate()", () => {
    it("Should revert if all arguments are the same", async () => {
      // TODO
    });
    it("Doesn't trigger during warmup or duration", async () => {
      // TODO
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

    it("Correctly set HubDetails when called during cooldown", async () => {
      // TODO
    });
    it("Correctly set HubDetails when called after cooldown", async () => {
      // TODO
    });
    it("Correctly set HubDetails when called during second initUpdate()", async () => {
      // TODO
    });
  });

  describe("transferHubOwnership()", () => {
    it("Cannot be called by non-owner", async () => {
      // TODO
    });
    it("Cannot be set to the current owner", async () => {
      // TODO
    });
    it("Successfully transfers hub ownership", async () => {
      // TODO
    });
  });
});
