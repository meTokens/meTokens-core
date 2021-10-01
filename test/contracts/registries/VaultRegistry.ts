import { expect } from "chai";
import { ethers, getNamedAccounts } from "hardhat";
import { Hub } from "../../../artifacts/types/Hub";
import { VaultRegistry } from "../../../artifacts/types/VaultRegistry";
import { SingleAssetVault } from "../../../artifacts/types/SingleAssetVault";
import { SingleAssetFactory } from "../../../artifacts/types/SingleAssetFactory";
import { deploy } from "../../utils/helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("VaultRegistry.sol", () => {
  let DAI: string;
  let vaultRegistry: VaultRegistry;
  let implementation: SingleAssetVault;
  let factory: SingleAssetFactory;
  let hub: Hub;
  let signers: SignerWithAddress[];
  before(async () => {
    // NOTE: test address we're using for approvals
    ({ DAI } = await getNamedAccounts());

    signers = await ethers.getSigners();
    hub = await deploy<Hub>("Hub");

    implementation = await deploy<SingleAssetVault>("SingleAssetVault");
    await implementation.deployed();
  });

  describe("approve()", () => {
    it("Vault is not yet approved", async () => {
      vaultRegistry = await deploy<VaultRegistry>("VaultRegistry");

      expect(await vaultRegistry.isApproved(DAI)).to.equal(false);
    });

    it("Emits Approve(address)", async () => {
      vaultRegistry = await deploy<VaultRegistry>("VaultRegistry");

      expect(await vaultRegistry.approve(DAI))
        .to.emit(vaultRegistry, "Approve")
        .withArgs(DAI);
    });
  });
  describe("register()", () => {
    it("Reverts when called by unapproved factory", async () => {
      // TODO: make sure new implementation is deployed
    });

    it("Emits Register(address)", async () => {
      vaultRegistry = await deploy<VaultRegistry>("VaultRegistry");

      factory = await deploy<SingleAssetFactory>(
        "SingleAssetFactory",
        undefined, //no lib
        implementation.address,
        hub.address,
        vaultRegistry.address
      );

      // clone implementation to make it a SingleAssetVault with hub and DAI
      await vaultRegistry.approve(factory.address);
      expect(await factory.create(DAI, ethers.utils.toUtf8Bytes(""))).to.emit(
        vaultRegistry,
        "Register"
      );
    });
  });
  describe("unapprove()", () => {
    it("Revert if not yet approved", async () => {
      vaultRegistry = await deploy<VaultRegistry>("VaultRegistry");

      await expect(
        // TODO: This is supposed to revert, why error?
        vaultRegistry.unapprove(DAI)
      ).to.revertedWith("Factory not _approved");
    });

    it("Emits Unapprove(address)", async () => {
      vaultRegistry = await deploy<VaultRegistry>("VaultRegistry");

      await vaultRegistry.approve(DAI);
      expect(await vaultRegistry.unapprove(DAI))
        .to.emit(vaultRegistry, "Unapprove")
        .withArgs(DAI);
    });
  });

  describe("isActive()", () => {
    it("Return false for inactive/nonexistent vault", async () => {
      vaultRegistry = await deploy<VaultRegistry>("VaultRegistry");
      expect(await vaultRegistry.isActive(DAI)).to.equal(false);
    });
    it("register Revert if not yet approved", async () => {
      vaultRegistry = await deploy<VaultRegistry>("VaultRegistry");
      await expect(vaultRegistry.register(DAI)).to.revertedWith(
        "Only vault factories can register _vaults"
      );
    });
    it("Return true for active vault", async () => {
      vaultRegistry = await deploy<VaultRegistry>("VaultRegistry");

      // TODO: vaultRegistry.approve(msg.sender)
      await vaultRegistry.approve(signers[0].address);
      await vaultRegistry.register(DAI);
      expect(await vaultRegistry.isActive(DAI)).to.equal(true);
    });
  });
});
