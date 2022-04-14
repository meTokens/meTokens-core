import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { deploy } from "../../utils/helpers";
import { VaultRegistry } from "../../../artifacts/types";

describe("VaultRegistry.sol", () => {
  let vaultRegistry: VaultRegistry;
  let signers: SignerWithAddress[];
  before(async () => {
    vaultRegistry = await deploy<VaultRegistry>("VaultRegistry");
    signers = await ethers.getSigners();
  });

  describe("approve()", () => {
    it("Emits Approve(address)", async () => {
      expect(await vaultRegistry.approve(signers[1].address))
        .to.emit(vaultRegistry, "Approve")
        .withArgs(signers[1].address);
    });
    it("Revert if already approved", async () => {
      await expect(
        vaultRegistry.approve(signers[1].address)
      ).to.be.revertedWith("addr approved");
    });
  });

  describe("unapprove()", () => {
    it("Revert if not approved", async () => {
      await expect(
        vaultRegistry.unapprove(signers[2].address)
      ).to.be.revertedWith("addr !approved");
    });

    it("Emits Unapprove(address)", async () => {
      await expect(vaultRegistry.unapprove(signers[1].address))
        .to.emit(vaultRegistry, "Unapprove")
        .withArgs(signers[1].address);
    });
  });

  describe("isApproved()", () => {
    it("Return false for nonapproved address", async () => {
      const newVaultRegistry = await deploy<VaultRegistry>("VaultRegistry");
      expect(await newVaultRegistry.isApproved(signers[1].address)).to.equal(
        false
      );
    });
    it("Return true for approved address", async () => {
      const newVaultRegistry = await deploy<VaultRegistry>("VaultRegistry");
      await newVaultRegistry.approve(signers[1].address);
      expect(await newVaultRegistry.isApproved(signers[1].address)).to.equal(
        true
      );
    });
  });
});
