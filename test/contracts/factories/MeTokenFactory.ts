import { BaseContract, Contract } from "@ethersproject/contracts";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Hub } from "../../../artifacts/types/Hub";
import { MeTokenFactory } from "../../../artifacts/types/MeTokenFactory";
import { deploy } from "../../utils/helpers";
import {
  MeTokenRegistry,
  MeTokenRegistryInterface,
} from "../../../artifacts/types/MeTokenRegistry";

describe("MeTokenFactory.sol", function () {
  let hub: Hub;
  let meTokenFactory: MeTokenFactory;
  let meTokenRegistry: MeTokenRegistry;

  before(async () => {
    hub = await deploy<Hub>("Hub");
    meTokenFactory = await deploy<MeTokenFactory>("MeTokenFactory");
    meTokenRegistry = await deploy<MeTokenRegistry>(
      "MeTokenRegistry",
      undefined,
      hub.address,
      meTokenFactory.address
    );
  });

  it("create()", async () => {
    // Do something
  });
});
