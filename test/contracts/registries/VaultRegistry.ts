import { expect } from "chai";
import { ethers } from "hardhat";
import { Hub } from "../../../artifacts/types/Hub";
import { VaultRegistry } from "../../../artifacts/types/VaultRegistry";
import { SingleAssetVault } from "../../../artifacts/types/SingleAssetVault";
import { SingleAssetFactory } from "../../../artifacts/types/SingleAssetFactory";

describe("VaultRegistry.sol", () => {
  const vaultName = "Test Vault";
  let vaultRegistry: VaultRegistry;
  let implementation: SingleAssetVault;
  let factory: SingleAssetFactory;
  let hub: Hub;
  before(async () => {
    const hubFactory = await ethers.getContractFactory("Hub");
    hub = (await hubFactory.deploy()) as Hub;
    await hub.deployed();

    const vaultRegistryFactory = await ethers.getContractFactory(
      "VaultRegistry"
    );
    vaultRegistry = (await vaultRegistryFactory.deploy()) as VaultRegistry;
    await vaultRegistry.deployed();

    const singleAssetFactory = await ethers.getContractFactory(
      "SingleAssetVault"
    );
    implementation = (await singleAssetFactory.deploy()) as SingleAssetVault;
    await implementation.deployed();

    const factoryFactory = await ethers.getContractFactory(
      "SingleAssetFactory"
    );
    factory = (await factoryFactory.deploy(
      hub.address,
      vaultRegistry.address,
      implementation.address
    )) as SingleAssetFactory;
    await factory.deployed();
  });

  describe("register()", () => {
    it("Reverts when called by unapproved factory", async () => {
      // TODO: make sure new implementation is deployed
    });

    it("Emits Register(string, address, address)", async () => {
      // expect(
      //     await factory.create(vaultName, implementation.address, factory.address)
      // ).to.emit(vaultRegistry, "Register")
      // .withArgs(vaultName, implementation.address, factory.address);
    });
  });

  describe("approve()", () => {
    it("Vault is not yet approved", async () => {
      expect(
        await vaultRegistry.isApproved(ethers.constants.AddressZero)
      ).to.equal(false);
    });

    it("Emits Approve(address)", async () => {
      expect(await vaultRegistry.approve(factory.address))
        .to.emit(vaultRegistry, "Approve")
        .withArgs(factory.address);
    });
  });

  describe("unapprove()", () => {
    it("Revert if not yet approved", async () => {
      // expect(
      //     await vaultRegistry.unapprove(factory.address)
      // ).to.be.reverted;
    });

    it("Emits Unapprove(address)", async () => {
      await vaultRegistry.approve(factory.address);
      // expect(
      //     await vaultRegistry.unapprove(factory.address)
      // ).to.emit(vaultRegistry, "Unapprove")
      //  .withArgs(factory.address);
    });
  });

  describe("isActive()", () => {
    it("Return false for inactive/nonexistent vault", async () => {
      expect(await vaultRegistry.isActive(factory.address)).to.equal(false);
    });

    it("Return true for active vault", async () => {
      // await vaultRegistry.register(vaultName, implementation.address, factory.address);
      // expect(
      //     await vaultRegistry.isActive(factory.address)
      // ).to.equal(true);
    });
  });
});
