import { ethers } from "hardhat";
import { Foundry } from "../../../../artifacts/types/Foundry";
import { Hub } from "../../../../artifacts/types/Hub";
import { SingleAssetFactory } from "../../../../artifacts/types/SingleAssetFactory";
import { SingleAssetVault } from "../../../../artifacts/types/SingleAssetVault";
import { VaultRegistry } from "../../../../artifacts/types/VaultRegistry";
import { WeightedAverage } from "../../../../artifacts/types/WeightedAverage";
import { deploy } from "../../../utils/helpers";

describe("SingleAssetFactory.sol", () => {
  let singleAssetFactory: SingleAssetFactory;
  let implementation: SingleAssetVault;
  let vaultRegistry: VaultRegistry;
  let hub: Hub;

  before(async () => {
    implementation = await deploy<SingleAssetVault>("SingleAssetVault");
    vaultRegistry = await deploy<VaultRegistry>("VaultRegistry");
    const weightedAverage = await deploy<WeightedAverage>("WeightedAverage");
    const foundry = await deploy<Foundry>("Foundry", {
      WeightedAverage: weightedAverage.address,
    });
    hub = await deploy<Hub>("Hub");
    singleAssetFactory = await deploy<SingleAssetFactory>(
      "SingleAssetFactory",
      undefined,
      hub.address,
      implementation.address,
      foundry.address,
      vaultRegistry.address
    );

    // TODO: call hub.initialize()
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
