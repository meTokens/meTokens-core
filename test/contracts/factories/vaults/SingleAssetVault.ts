import { ethers } from "hardhat";
import { Foundry } from "../../../../artifacts/types/Foundry";
import { Hub } from "../../../../artifacts/types/Hub";
import { SingleAssetVault } from "../../../../artifacts/types/SingleAssetVault";
import { VaultRegistry } from "../../../../artifacts/types/VaultRegistry";
import { WeightedAverage } from "../../../../artifacts/types/WeightedAverage";
import { deploy } from "../../../utils/helpers";

describe("SingleAssetVault.sol", () => {
  let singleAssetVault: SingleAssetVault;
  let vaultRegistry: VaultRegistry;
  let hub: Hub;

  before(async () => {
    vaultRegistry = await deploy<VaultRegistry>("VaultRegistry");
    const weightedAverage = await deploy<WeightedAverage>("WeightedAverage");
    const foundry = await deploy<Foundry>("Foundry", {
      WeightedAverage: weightedAverage.address,
    });
    hub = await deploy<Hub>("Hub");
    singleAssetVault = await deploy<SingleAssetVault>(
      "SingleAssetVault",
      undefined,
      hub.address, //DAO ?
      foundry.address
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
