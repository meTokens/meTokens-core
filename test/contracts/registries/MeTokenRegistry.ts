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
import { deploy, getContractAt } from "../../utils/helpers";

describe("MeTokenRegistry.sol", () => {
  let DAI: string;
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
  let dai: ERC20;
  before(async () => {
    ({ DAI } = await getNamedAccounts());
    // const dai = (await ethers.getContractAt("ERC20", DAI)) as ERC20;
    dai = await getContractAt<ERC20>("ERC20", DAI);
    weightedAverage = await deploy<WeightedAverage>("WeightedAverage");
    bancorZeroCurve = await deploy<BancorZeroCurve>("BancorZeroCurve");
    curveRegistry = await deploy<CurveRegistry>("CurveRegistry");
    vaultRegistry = await deploy<VaultRegistry>("VaultRegistry");
    singleAssetVault = await deploy<SingleAssetVault>("SingleAssetVault");
    foundry = await deploy<Foundry>("Foundry", {
      WeightedAverage: weightedAverage.address,
    });
    singleAssetFactory = await deploy<SingleAssetFactory>(
      "SingleAssetFactory",
      undefined, //no libs
      singleAssetVault.address, // implementation to clone
      foundry.address, // foundry
      vaultRegistry.address // vault registry
    );

    hub = await deploy<Hub>("Hub");
    meTokenFactory = await deploy<MeTokenFactory>("MeTokenFactory");
    meTokenRegistry = await deploy<MeTokenRegistry>(
      "MeTokenRegistry",
      undefined,
      hub.address,
      meTokenFactory.address
    );
    console.log("yeah");
    await curveRegistry.register(bancorZeroCurve.address);
    console.log("az");
    await vaultRegistry.approve(singleAssetFactory.address);
    console.log("bz");
    await hub.initialize(
      foundry.address,
      vaultRegistry.address,
      curveRegistry.address
    );
    console.log("cz");
    const encodedValueSet = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint32"],
      [200, 5000]
    );
    console.log("encodedValueSet", encodedValueSet);
    await hub.register(
      singleAssetFactory.address,
      bancorZeroCurve.address,
      DAI,
      50000,
      encodedValueSet,
      ethers.utils.toUtf8Bytes("")
    );
    console.log("register");
  });

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
