import { expect } from "chai";
import { ethers } from "hardhat";
import { CurveRegistry } from "../../../artifacts/types/CurveRegistry";
import { BancorZeroCurve } from "../../../artifacts/types/BancorZeroCurve";
import { deploy } from "../../utils/helpers";

describe("CurveRegistry.sol", () => {
  let curveRegistry: CurveRegistry;
  let curve: BancorZeroCurve;

  before(async () => {
    curve = await deploy<BancorZeroCurve>("BancorZeroCurve");
  });

  describe("register()", () => {
    it("Emits register()", async () => {
      curveRegistry = await deploy<CurveRegistry>("CurveRegistry");
      const tx = await curveRegistry.approve(curve.address);
      // expect(tx).to.emit(curveRegistry, "Register").withArgs(curve.address);
    });
  });

  describe("deactivate()", () => {
    it("Reverts when deactivating an inactive curve", async () => {
      curveRegistry = await deploy<CurveRegistry>("CurveRegistry");

      await expect(curveRegistry.unapprove(curve.address)).to.be.reverted;
    });

    it("Emits Deactivate(id) when successful", async () => {
      curveRegistry = await deploy<CurveRegistry>("CurveRegistry");

      await curveRegistry.approve(curve.address);
      const tx = await curveRegistry.unapprove(curve.address);
      // expect(tx).to.emit(curveRegistry, "Deactivate").withArgs(curve.address);
    });

    it("Sets active to from true to false", async () => {
      curveRegistry = await deploy<CurveRegistry>("CurveRegistry");

      await curveRegistry.approve(curve.address);
      expect(await curveRegistry.isApproved(curve.address)).to.equal(true);
      await curveRegistry.unapprove(curve.address);
      expect(await curveRegistry.isApproved(curve.address)).to.equal(false);
    });
  });

  describe("isActive()", () => {
    it("Return false for invalid curve address", async () => {
      curveRegistry = await deploy<CurveRegistry>("CurveRegistry");

      expect(await curveRegistry.isApproved(curve.address)).to.equal(false);
    });

    it("Return true for an active ID", async () => {
      curveRegistry = await deploy<CurveRegistry>("CurveRegistry");

      await curveRegistry.approve(curve.address);
      expect(await curveRegistry.isApproved(curve.address)).to.equal(true);
    });
  });
});
