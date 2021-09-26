import { expect } from "chai";
import { ethers, getNamedAccounts } from "hardhat";
import { Hub } from "../../../artifacts/types/Hub";
import { VaultRegistry } from "../../../artifacts/types/VaultRegistry";
import { SingleAssetVault } from "../../../artifacts/types/SingleAssetVault";
import { SingleAssetFactory } from "../../../artifacts/types/SingleAssetFactory";

describe("VaultRegistry.sol", () => {
  let DAI: string;
  let vaultRegistry: VaultRegistry;
  let implementation: SingleAssetVault;
  let factory: SingleAssetFactory;
  let hub: Hub;
  before(async () => {
    // NOTE: test address we're using for approvals
    ({ DAI } = await getNamedAccounts());

    const hubFactory = await ethers.getContractFactory("Hub");
    hub = (await hubFactory.deploy()) as Hub;
    await hub.deployed();

    const singleAssetFactory = await ethers.getContractFactory(
      "SingleAssetVault"
    );
    implementation = (await singleAssetFactory.deploy()) as SingleAssetVault;
    await implementation.deployed();
  });

  describe("register()", () => {
    it("Reverts when called by unapproved factory", async () => {
      // TODO: make sure new implementation is deployed
    });

    it("Emits Register(address)", async () => {
      const vaultRegistryFactory = await ethers.getContractFactory(
        "VaultRegistry"
      );
      vaultRegistry = (await vaultRegistryFactory.deploy()) as VaultRegistry;
      await vaultRegistry.deployed();
      const factoryFactory = await ethers.getContractFactory(
        "SingleAssetFactory"
      );
      factory = (await factoryFactory.deploy(
        hub.address,
        vaultRegistry.address,
        implementation.address
      )) as SingleAssetFactory;
      await factory.deployed();

      // TODO: "invalid arrayify value"
      expect(await factory.create(DAI, "")).to.emit(vaultRegistry, "Register");
    });
  });

  describe("approve()", () => {
    it("Vault is not yet approved", async () => {
      const vaultRegistryFactory = await ethers.getContractFactory(
        "VaultRegistry"
      );
      vaultRegistry = (await vaultRegistryFactory.deploy()) as VaultRegistry;
      await vaultRegistry.deployed();

      expect(await vaultRegistry.isApproved(DAI)).to.equal(false);
    });

    it("Emits Approve(address)", async () => {
      const vaultRegistryFactory = await ethers.getContractFactory(
        "VaultRegistry"
      );
      vaultRegistry = (await vaultRegistryFactory.deploy()) as VaultRegistry;
      await vaultRegistry.deployed();

      expect(await vaultRegistry.approve(DAI))
        .to.emit(vaultRegistry, "Approve")
        .withArgs(DAI);
    });
  });

  describe("unapprove()", () => {
    it("Revert if not yet approved", async () => {
      const vaultRegistryFactory = await ethers.getContractFactory(
        "VaultRegistry"
      );
      vaultRegistry = (await vaultRegistryFactory.deploy()) as VaultRegistry;
      await vaultRegistry.deployed();

      expect(
        // TODO: This is supposed to revert, why error?
        await vaultRegistry.unapprove(DAI)
      ).to.be.reverted;
    });

    it("Emits Unapprove(address)", async () => {
      const vaultRegistryFactory = await ethers.getContractFactory(
        "VaultRegistry"
      );
      vaultRegistry = (await vaultRegistryFactory.deploy()) as VaultRegistry;
      await vaultRegistry.deployed();

      await vaultRegistry.approve(DAI);
      expect(await vaultRegistry.unapprove(DAI))
        .to.emit(vaultRegistry, "Unapprove")
        .withArgs(DAI);
    });
  });

  describe("isActive()", () => {
    it("Return false for inactive/nonexistent vault", async () => {
      const vaultRegistryFactory = await ethers.getContractFactory(
        "VaultRegistry"
      );
      vaultRegistry = (await vaultRegistryFactory.deploy()) as VaultRegistry;
      await vaultRegistry.deployed();

      expect(await vaultRegistry.isActive(DAI)).to.equal(false);
    });

    it("Return true for active vault", async () => {
      const vaultRegistryFactory = await ethers.getContractFactory(
        "VaultRegistry"
      );
      vaultRegistry = (await vaultRegistryFactory.deploy()) as VaultRegistry;
      await vaultRegistry.deployed();

      // TODO: vaultRegistry.approve(msg.sender)
      await vaultRegistry.register(DAI);
      expect(await vaultRegistry.isActive(DAI)).to.equal(true);
    });
  });
});
