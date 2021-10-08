import { ethers } from "hardhat";
import { Foundry } from "../../artifacts/types/Foundry";
import { WeightedAverage } from "../../artifacts/types/WeightedAverage";
import { deploy } from "../utils/helpers";

describe("Foundry.sol", () => {
  const hub = "0x0000000000000000000000000000000000000000";
  const fees = "0x0000000000000000000000000000000000000000";
  const meTokenRegistry = "0x0000000000000000000000000000000000000000";
  const updater = "0x0000000000000000000000000000000000000000";
  let foundry: Foundry;

  before(async () => {
    const weightedAverage = await deploy<WeightedAverage>("WeightedAverage");
    foundry = await deploy<Foundry>("Foundry", {
      WeightedAverage: weightedAverage.address,
    });
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
