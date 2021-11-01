import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { Foundry } from "../../../../artifacts/types/Foundry";
import { Hub } from "../../../../artifacts/types/Hub";
import { MeTokenFactory } from "../../../../artifacts/types/MeTokenFactory";
import { MeTokenRegistry } from "../../../../artifacts/types/MeTokenRegistry";
import { MigrationRegistry } from "../../../../artifacts/types/MigrationRegistry";
import { SingleAssetVault } from "../../../../artifacts/types/SingleAssetVault";
import { VaultRegistry } from "../../../../artifacts/types/VaultRegistry";
import { WeightedAverage } from "../../../../artifacts/types/WeightedAverage";
import { deploy } from "../../../utils/helpers";

describe("SingleAssetVault.sol", () => {
  let singleAssetVault: SingleAssetVault;
  let vaultRegistry: VaultRegistry;
  let hub: Hub;
  let account0: SignerWithAddress;
  let account1: SignerWithAddress;
  let account2: SignerWithAddress;

  before(async () => {
    [account0, account1, account2] = await ethers.getSigners();
    vaultRegistry = await deploy<VaultRegistry>("VaultRegistry");
    const weightedAverage = await deploy<WeightedAverage>("WeightedAverage");
    const foundry = await deploy<Foundry>("Foundry", {
      WeightedAverage: weightedAverage.address,
    });
    hub = await deploy<Hub>("Hub");
    const meTokenFactory = await deploy<MeTokenFactory>("MeTokenFactory");
    const migrationRegistry = await deploy<MigrationRegistry>(
      "MigrationRegistry"
    );

    const meTokenRegistry = await deploy<MeTokenRegistry>(
      "MeTokenRegistry",
      undefined,
      hub.address,
      meTokenFactory.address,
      migrationRegistry.address
    );

    singleAssetVault = await deploy<SingleAssetVault>(
      "SingleAssetVault",
      undefined, //no libs
      account1.address, // DAO
      foundry.address, // foundry
      hub.address, // hub
      meTokenRegistry.address, //IMeTokenRegistry
      migrationRegistry.address //IMigrationRegistry
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
