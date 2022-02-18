import { expect } from "chai";
import { ethers } from "hardhat";
import { Registry } from "../../../artifacts/types/Registry";
import { deploy } from "../../utils/helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Registry.sol", () => {
  let registry: Registry;
  let signers: SignerWithAddress[];
  before(async () => {
    registry = await deploy<Registry>("Registry");
    signers = await ethers.getSigners();
  });

  describe("approve()", () => {
    it("Emits Approve(address)", async () => {
      expect(await registry.approve(signers[1].address))
        .to.emit(registry, "Approve")
        .withArgs(signers[1].address);
    });
    it("Revert if already approved", async () => {
      await expect(registry.approve(signers[1].address)).to.be.revertedWith(
        "addr approved"
      );
    });
  });

  describe("unapprove()", () => {
    it("Revert if not approved", async () => {
      await expect(registry.unapprove(signers[2].address)).to.be.revertedWith(
        "addr !approved"
      );
    });

    it("Emits Unapprove(address)", async () => {
      await expect(registry.unapprove(signers[1].address))
        .to.emit(registry, "Unapprove")
        .withArgs(signers[1].address);
    });
  });

  describe("isApproved()", () => {
    it("Return false for nonapproved address", async () => {
      const newRegistry = await deploy<Registry>("Registry");
      expect(await newRegistry.isApproved(signers[1].address)).to.equal(false);
    });
    it("Return true for approved address", async () => {
      const newRegistry = await deploy<Registry>("Registry");
      await newRegistry.approve(signers[1].address);
      expect(await newRegistry.isApproved(signers[1].address)).to.equal(true);
    });
  });
});
