import { ethers } from "hardhat";
import { Hub } from "../../../../artifacts/types/Hub";
import { SingleAssetFactory } from "../../../../artifacts/types/SingleAssetFactory";
import { SingleAssetVault } from "../../../../artifacts/types/SingleAssetVault";
import { VaultRegistry } from "../../../../artifacts/types/VaultRegistry";
import { deploy } from "../../../utils/helpers";

describe("SingleAssetFactory.sol", () => {
  let singleAssetFactory: SingleAssetFactory;
  let implementation: SingleAssetVault;
  let vaultRegistry: VaultRegistry;
  let hub: Hub;

  before(async () => {
    implementation = await deploy<SingleAssetVault>("SingleAssetVault");
    vaultRegistry = await deploy<VaultRegistry>("VaultRegistry");
    hub = await deploy<Hub>("Hub");
    singleAssetFactory = await deploy<SingleAssetFactory>(
      "SingleAssetFactory",
      undefined,
      implementation.address,
      ethers.constants.AddressZero,
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
