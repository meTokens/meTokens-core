import { ethers } from "hardhat";
import { SingleAssetVault } from "../../../artifacts/types/SingleAssetVault";
import { SingleAssetFactory } from "../../../artifacts/types/SingleAssetFactory";
import { VaultRegistry } from "../../../artifacts/types/VaultRegistry";
import { Hub } from "../../../artifacts/types/Hub";

describe("SingleAsset.sol", () => {
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

  describe("", () => {
    it("Should do something", async () => {
      // Do something
    });
  });
});
