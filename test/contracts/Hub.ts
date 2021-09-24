import { ethers } from "hardhat";
import { Hub } from "../../artifacts/types/Hub";
import { Updater } from "../../artifacts/types/Updater";
import { Foundry } from "../../artifacts/types/Foundry";
import { CurveRegistry } from "../../artifacts/types/CurveRegistry";
import { VaultRegistry } from "../../artifacts/types/VaultRegistry";

describe("Hub.sol", () => {
  let hub: Hub;
  let updater: Updater;
  let foundry: Foundry;
  let curveRegistry: CurveRegistry;
  let vaultRegistry: VaultRegistry;
  before(async () => {
    const hubFactory = await ethers.getContractFactory("Hub");
    hub = (await hubFactory.deploy()) as Hub;
    await hub.deployed();

    const updaterFactory = await ethers.getContractFactory("Updater");
    updater = (await updaterFactory.deploy()) as Updater;
    await updater.deployed();

    const foundryFactory = await ethers.getContractFactory("Foundry");
    foundry = (await foundryFactory.deploy()) as Foundry;
    await foundry.deployed();

    const curveRegistryFactory = await ethers.getContractFactory(
      "CurveRegistry"
    );
    curveRegistry = (await curveRegistryFactory.deploy()) as CurveRegistry;
    await curveRegistry.deployed();

    const vaultRegistryFactory = await ethers.getContractFactory(
      "VaultRegistry"
    );
    vaultRegistry = (await vaultRegistryFactory.deploy()) as VaultRegistry;
    await vaultRegistry.deployed();
  });

  it("initialize()", async () => {
    // Do something
  });

  it("register()", async () => {
    // Do something
  });

  it("deactivate()", async () => {
    // Do something
  });
});
