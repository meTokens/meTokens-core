import { ethers } from "hardhat";
import { Foundry } from "../../artifacts/types/Foundry";

describe("Foundry.sol", () => {
  const hub = "0x0000000000000000000000000000000000000000";
  const fees = "0x0000000000000000000000000000000000000000";
  const meTokenRegistry = "0x0000000000000000000000000000000000000000";
  const updater = "0x0000000000000000000000000000000000000000";
  let foundry: Foundry;

  before(async () => {
    const foundryFactory = await ethers.getContractFactory("Hub");
    foundry = (await foundryFactory.deploy()) as Foundry;
    await foundry.deployed();
  });

  describe("mint()", () => {
    it("Should do something", async () => {
      // Do something
    });
  });

  describe("burn()", () => {
    it("Should do something", async () => {
      // Do something
    });
  });
});
