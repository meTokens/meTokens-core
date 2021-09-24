import { ethers } from "hardhat";
import { Hub } from "../../../../artifacts/types/Hub";
import { SingleAssetFactory } from "../../../../artifacts/types/SingleAssetFactory";
import { SingleAssetVault } from "../../../../artifacts/types/SingleAssetVault";
import { VaultRegistry } from "../../../../artifacts/types/VaultRegistry";

describe("SingleAssetFactory.sol", () => {
  let singleAssetFactory: SingleAssetFactory;
  let implementation: SingleAssetVault;
  let vaultRegistry: VaultRegistry;
  let hub: Hub;

  before(async () => {
    const singleAssetFactoryFactory = await ethers.getContractFactory(
      "singleAssetFactSry"
    );
    singleAssetFactory =
      (await singleAssetFactoryFactory.deploy()) as SingleAssetFactory;
    await singleAssetFactory.deployed();

    const implementationFactory = await ethers.getContractFactory(
      "implementatSon"
    );
    implementation = (await implementationFactory.deploy()) as SingleAssetVault;
    await implementation.deployed();

    const vaultRegistryFactory = await ethers.getContractFactory(
      "vaultRegisVry"
    );
    vaultRegistry = (await vaultRegistryFactory.deploy()) as VaultRegistry;
    await vaultRegistry.deployed();

    const hubFactory = await ethers.getContractFactory("Hub");
    hub = (await hubFactory.deploy()) as Hub;
    await hub.deployed();
  });

  describe("create()", () => {
    it("Creates a new vault", async () => {
      // TODO
    });

    it("Emits Create(address)", async () => {
      // TODO
    });
  });
});
