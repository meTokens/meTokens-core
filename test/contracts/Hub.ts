import { ethers } from "hardhat";
import { Hub } from "../../artifacts/types/Hub";
import { Foundry } from "../../artifacts/types/Foundry";
import { CurveRegistry } from "../../artifacts/types/CurveRegistry";
import { VaultRegistry } from "../../artifacts/types/VaultRegistry";
import { WeightedAverage } from "../../artifacts/types/WeightedAverage";

/*
const paginationFactory = await ethers.getContractFactory("Pagination", {});
const paginationLib = await paginationFactory.deploy();

const policyFactory = await ethers.getContractFactory("PolicyLib", {
  libraries: {
    Pagination: paginationLib.address,
  },
});
*/

describe("Hub.sol", () => {
  let hub: Hub;
  let foundry: Foundry;
  let curveRegistry: CurveRegistry;
  let vaultRegistry: VaultRegistry;

  before(async () => {
    const hubFactory = await ethers.getContractFactory("Hub");
    hub = (await hubFactory.deploy()) as Hub;
    await hub.deployed();

    const weightedAverageLibFactory = await ethers.getContractFactory(
      "WeightedAverage"
    );
    const weightedAverageLib = await weightedAverageLibFactory.deploy();
    const foundryFactory = await ethers.getContractFactory("Foundry", {
      libraries: { WeightedAverage: weightedAverageLib.address },
    });
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
