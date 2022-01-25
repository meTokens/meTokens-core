import { ethers, getNamedAccounts } from "hardhat";
import { SingleAssetVault } from "../../../artifacts/types/SingleAssetVault";
import { VaultRegistry } from "../../../artifacts/types/VaultRegistry";
import { Hub } from "../../../artifacts/types/Hub";
import { deploy } from "../../utils/helpers";
import { Foundry } from "../../../artifacts/types/Foundry";
import { WeightedAverage } from "../../../artifacts/types/WeightedAverage";
import { MeTokenFactory } from "../../../artifacts/types/MeTokenFactory";
import { MeTokenRegistry } from "../../../artifacts/types/MeTokenRegistry";
import { MigrationRegistry } from "../../../artifacts/types/MigrationRegistry";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("SingleAsset.sol", () => {
  let vaultRegistry: VaultRegistry;
  let vault: SingleAssetVault;
  let hub: Hub;
  let DAI: string;
  let account0: SignerWithAddress;
  let account1: SignerWithAddress;
  let account2: SignerWithAddress;
  before(async () => {
    ({ DAI } = await getNamedAccounts());

    [account0, account1, account2] = await ethers.getSigners();

    const weightedAverage = await deploy<WeightedAverage>("WeightedAverage");
    const migrationRegistry = await deploy<MigrationRegistry>(
      "MigrationRegistry"
    );

    const foundry = await deploy<Foundry>("Foundry", {
      WeightedAverage: weightedAverage.address,
    });
    const hub = await deploy<Hub>("Hub");
    const meTokenFactory = await deploy<MeTokenFactory>("MeTokenFactory");
    const meTokenRegistry = await deploy<MeTokenRegistry>(
      "MeTokenRegistry",
      undefined,
      foundry.address,
      hub.address,
      meTokenFactory.address,
      migrationRegistry.address
    );

    vault = await deploy<SingleAssetVault>(
      "SingleAssetVault",
      undefined, //no libs
      account1.address, // DAO
      foundry.address, // foundry
      hub.address, // hub
      meTokenRegistry.address, //IMeTokenRegistry
      migrationRegistry.address //IMigrationRegistry
    );
  });

  describe("", () => {
    it("Should do something", async () => {
      // Do something
    });
  });
});