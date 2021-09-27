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
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { impersonate } from "../../utils/hardhatNode";
import { Signer } from "ethers";
import { expect } from "chai";

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
  let account0: SignerWithAddress;
  let account1: SignerWithAddress;
  let account2: SignerWithAddress;
  let daiHolder: Signer;
  let DAIWhale: string;
  before(async () => {
    ({ DAI, DAIWhale } = await getNamedAccounts());
    [account0, account1, account2] = await ethers.getSigners();
    dai = await getContractAt<ERC20>("ERC20", DAI);
    daiHolder = await impersonate(DAIWhale);
    dai
      .connect(daiHolder)
      .transfer(account1.address, ethers.utils.parseEther("1000"));
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
    await curveRegistry.register(bancorZeroCurve.address);

    await vaultRegistry.approve(singleAssetFactory.address);

    await hub.initialize(
      foundry.address,
      vaultRegistry.address,
      curveRegistry.address
    );
    const encodedValueSet = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint32"],
      [200, 5000]
    );
    await hub.register(
      singleAssetFactory.address,
      bancorZeroCurve.address,
      DAI,
      50000,
      encodedValueSet,
      ethers.utils.toUtf8Bytes("")
    );
  });

  describe("register()", () => {
    it("User can create a meToken with no collateral", async () => {
      await meTokenRegistry
        .connect(account0)
        .register("Carl0 meToken", "CARL", 0, 0);
      // assert token infos
      // assert event emitting
    });

    it("User can create a meToken with 100 DAI as collateral", async () => {
      const amount = 100;
      const balBefore = await dai.balanceOf(account1.address);
      console.log(
        `balBefore:${ethers.utils.formatEther(balBefore)} of:${
          account1.address
        }`
      );
      // need an approve of metoken registry first
      await dai.connect(account1).approve(meTokenRegistry.address, amount);
      await meTokenRegistry
        .connect(account1)
        .register("Carl1 meToken", "CARL", 0, amount);
      const balAfter = await dai.balanceOf(account1.address);
      expect(balBefore.sub(balAfter)).equal(amount);
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
