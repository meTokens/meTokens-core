import { ethers } from "hardhat";
import { SingleAssetVault } from "../../../artifacts/types/SingleAssetVault";
import { VaultRegistry } from "../../../artifacts/types/VaultRegistry";
import { Hub } from "../../../artifacts/types/Hub";
import { deploy } from "../../utils/helpers";
import { Foundry } from "../../../artifacts/types/Foundry";
import { WeightedAverage } from "../../../artifacts/types/WeightedAverage";

describe("SingleAsset.sol", () => {
  let vaultRegistry: VaultRegistry;
  let implementation: SingleAssetVault;
  let hub: Hub;
  before(async () => {
    hub = await deploy<Hub>("Hub");
    vaultRegistry = await deploy<VaultRegistry>("VaultRegistry");
    implementation = await deploy<SingleAssetVault>("SingleAssetVault");

    const weightedAverage = await deploy<WeightedAverage>("WeightedAverage");
    const foundry = await deploy<Foundry>("Foundry", {
      WeightedAverage: weightedAverage.address,
    });
  });

  describe("", () => {
    it("Should do something", async () => {
      // Do something
    });
  });
});
