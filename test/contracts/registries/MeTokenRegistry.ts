import { ethers, getNamedAccounts } from "hardhat";
import { WeightedAverage } from "../../../artifacts/types/WeightedAverage";
import { MeTokenRegistry } from "../../../artifacts/types/MeTokenRegistry";
import { MeTokenFactory } from "../../../artifacts/types/MeTokenFactory";
import { BancorZeroCurve } from "../../../artifacts/types/BancorZeroCurve";
import { CurveRegistry } from "../../../artifacts/types/CurveRegistry";
import { VaultRegistry } from "../../../artifacts/types/VaultRegistry";
import { SingleAssetVault } from "../../../artifacts/types/SingleAssetVault";
import { SingleAssetFactory } from "../../../artifacts/types/SingleAssetFactory";
import { Foundry } from "../../../artifacts/types/Foundry";
import { Hub } from "../../../artifacts/types/Hub";
import { ERC20 } from "../../../artifacts/types/ERC20";

describe("MeTokenRegistry.sol", () => {
  let weightedAverage: WeightedAverage;
  let meTokenRegistry: MeTokenRegistry;
  let meTokenFactory: MeTokenFactory;
  let bancorZeroCurve: BancorZeroCurve;
  let curveRegistry: CurveRegistry;
  let vaultRegistry: VaultRegistry;
  let singleAssetVault: SingleAssetVault;
  let singleAssetFactory: SingleAssetFactory;
  let foundry: Foundry;
  let hub: Hub;
  let DAI: string;

  before(async () => {
    ({ DAI } = await getNamedAccounts());
    const dai = (await ethers.getContractAt("ERC20", DAI)) as ERC20;

    const weightedAverageFactory = await ethers.getContractFactory(
      "WeightedAverage"
    );
    weightedAverage =
      (await weightedAverageFactory.deploy()) as WeightedAverage;
    await weightedAverage.deployed();

    const bancorZeroCurveFactory = await ethers.getContractFactory(
      "BancorZeroCurve"
    );
    bancorZeroCurve =
      (await bancorZeroCurveFactory.deploy()) as BancorZeroCurve;
    await bancorZeroCurve.deployed();

    const curveRegistryFactory = await ethers.getContractFactory(
      "CurveRegistry"
    );
    curveRegistry = (await curveRegistryFactory.deploy()) as CurveRegistry;
    await curveRegistry.deployed();

    const vaultRegistryFactory = await ethers.getContractFactory(
      "VaultRegistry"
    );
    vaultRegistry = (await vaultRegistryFactory.deploy()) as VaultRegistry;
    await vaultRegistry.deployed();

    const singleAssetVaultFactory = await ethers.getContractFactory(
      "SingleAssetVault"
    );
    singleAssetVault =
      (await singleAssetVaultFactory.deploy()) as SingleAssetVault;
    await singleAssetVault.deployed();

    const singleAssetFactoryFactory = await ethers.getContractFactory(
      "SingleAssetFactory"
    );
    singleAssetFactory = (await singleAssetFactoryFactory.deploy(
      vaultRegistry.address,
      singleAssetVault.address
    )) as SingleAssetFactory;
    await singleAssetFactory.deployed();

    const foundryFactory = await ethers.getContractFactory("Foundry");
    foundry = (await foundryFactory.deploy()) as Foundry;
    await foundry.deployed();

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

    await curveRegistry.register(bancorZeroCurve.address);
    await vaultRegistry.approve(singleAssetFactory.address);

    await hub.initialize(
      foundry.address,
      vaultRegistry.address,
      curveRegistry.address
    );
    await hub.register(
      singleAssetFactory.address,
      bancorZeroCurve.address,
      DAI,
      50000,
      "",
      ""
    );

    describe("register()", () => {
      it("User can create a meToken with no collateral", async () => {
        await meTokenRegistry.register("Carl meToken", "CARL", 0, 0);
      });

      it("User can create a meToken with 100 USDT as collateral", async () => {
        await meTokenRegistry.register("Carl meToken", "CARL", 0, 100);
      });

      // it("Emits Register()", async () => {

      // });
    });

    describe("transferOwnership()", () => {
      it("Fails if not owner", async () => {});
      it("Emits TransferOwnership()", async () => {});
    });

    describe("isOwner()", () => {
      it("Returns false for address(0)", async () => {});
      it("Returns true for a meToken issuer", async () => {});
    });

    describe("incrementBalancePooled()", async () => {});

    describe("incrementBalanceLocked()", async () => {});
  });
});
