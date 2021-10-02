import { expect } from "chai";
import { ethers } from "hardhat";
import { CurveRegistry } from "../../../artifacts/types/CurveRegistry";
import { BancorZeroCurve } from "../../../artifacts/types/BancorZeroCurve";

describe("CurveRegistry.sol", () => {
  let curveRegistry: CurveRegistry;
  let curve: BancorZeroCurve;

  before(async () => {
    const curveFactory = await ethers.getContractFactory("BancorZeroCurve");
    curve = (await curveFactory.deploy()) as BancorZeroCurve;
    await curve.deployed();
  });

  describe("register()", () => {
    it("Emits register()", async () => {
      const curveRegistryFactory = await ethers.getContractFactory(
        "CurveRegistry"
      );
      curveRegistry = (await curveRegistryFactory.deploy()) as CurveRegistry;
      await curveRegistry.deployed();

      expect(await curveRegistry.register(curve.address))
        .to.emit(curveRegistry, "Register")
        .withArgs(curve.address);
    });
  });

  describe("deactivate()", () => {
    it("Reverts when deactivating an inactive curve", async () => {
      const curveRegistryFactory = await ethers.getContractFactory(
        "CurveRegistry"
      );
      curveRegistry = (await curveRegistryFactory.deploy()) as CurveRegistry;
      await curveRegistry.deployed();

      await expect(curveRegistry.deactivate(curve.address)).to.be.reverted;
    });

    it("Emits Deactivate(id) when successful", async () => {
      const curveRegistryFactory = await ethers.getContractFactory(
        "CurveRegistry"
      );
      curveRegistry = (await curveRegistryFactory.deploy()) as CurveRegistry;
      await curveRegistry.deployed();

      await curveRegistry.register(curve.address);
      expect(await curveRegistry.deactivate(curve.address))
        .to.emit(curveRegistry, "Deactivate")
        .withArgs(curve.address);
    });

    it("Sets active to from true to false", async () => {
      const curveRegistryFactory = await ethers.getContractFactory(
        "CurveRegistry"
      );
      curveRegistry = (await curveRegistryFactory.deploy()) as CurveRegistry;
      await curveRegistry.deployed();

      await curveRegistry.register(curve.address);
      expect(await curveRegistry.isActive(curve.address)).to.equal(true);
      await curveRegistry.deactivate(curve.address);
      expect(await curveRegistry.isActive(curve.address)).to.equal(false);
    });
  });

  describe("isActive()", () => {
    it("Return false for invalid curve address", async () => {
      const curveRegistryFactory = await ethers.getContractFactory(
        "CurveRegistry"
      );
      curveRegistry = (await curveRegistryFactory.deploy()) as CurveRegistry;
      await curveRegistry.deployed();

      expect(await curveRegistry.isActive(curve.address)).to.equal(false);
    });

    it("Return true for an active ID", async () => {
      const curveRegistryFactory = await ethers.getContractFactory(
        "CurveRegistry"
      );
      curveRegistry = (await curveRegistryFactory.deploy()) as CurveRegistry;
      await curveRegistry.deployed();

      await curveRegistry.register(curve.address);
      expect(await curveRegistry.isActive(curve.address)).to.equal(true);
    });
  });
});
