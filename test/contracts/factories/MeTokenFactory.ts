import { expect } from "chai";
import { ethers } from "hardhat";
import { Hub } from "../../../artifacts/types/Hub";
import { MeTokenFactory } from "../../../artifacts/types/MeTokenFactory";
import {
  MeTokenRegistry,
  MeTokenRegistryInterface,
} from "../../../artifacts/types/MeTokenRegistry";

describe("MeTokenFactory.sol", function () {
  let hub: Hub;
  let meTokenFactory: MeTokenFactory;
  let meTokenRegistry: MeTokenRegistry;

  before(async () => {
    const hubFactory = await ethers.getContractFactory("Hub");
    hub = (await hubFactory.deploy()) as Hub;
    await hub.deployed();

    const meTokenFactoryFactory = await ethers.getContractFactory(
      "MeTokenFactory"
    );
    meTokenFactory = (await meTokenFactoryFactory.deploy()) as MeTokenFactory;
    await meTokenFactory.deployed();

    const meTokenRegistryFactory = await ethers.getContractFactory(
      "MeTokenRegistry"
    );
    meTokenRegistry = (await meTokenRegistryFactory.deploy(
      hub.address,
      meTokenFactory.address
    )) as MeTokenRegistry;
    await meTokenRegistry.deployed();
  });

  it("create()", async () => {
    // Do something
  });
});
