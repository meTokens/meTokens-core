import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, Signer } from "ethers";
import { ethers, getNamedAccounts } from "hardhat";
import { BancorZeroCurve } from "../../../artifacts/types/BancorZeroCurve";
import { CurveRegistry } from "../../../artifacts/types/CurveRegistry";
import { ERC20 } from "../../../artifacts/types/ERC20";
import { Foundry } from "../../../artifacts/types/Foundry";
import { Hub } from "../../../artifacts/types/Hub";
import { MeTokenFactory } from "../../../artifacts/types/MeTokenFactory";
import { MeTokenRegistry } from "../../../artifacts/types/MeTokenRegistry";
import { SingleAssetVault } from "../../../artifacts/types/SingleAssetVault";
import { WeightedAverage } from "../../../artifacts/types/WeightedAverage";
import { VaultRegistry } from "../../../artifacts/types/VaultRegistry";
import { impersonate } from "../../utils/hardhatNode";
import { deploy, getContractAt } from "../../utils/helpers";
import { expect } from "chai";
import { MigrationRegistry } from "../../../artifacts/types/MigrationRegistry";

describe("BancorZeroCurve", () => {
  let DAI: string;
  let weightedAverage: WeightedAverage;
  let meTokenRegistry: MeTokenRegistry;
  let meTokenFactory: MeTokenFactory;
  let bancorZeroCurve: BancorZeroCurve;
  let curveRegistry: CurveRegistry;
  let vaultRegistry: VaultRegistry;
  let migrationRegistry: MigrationRegistry;
  let singleAssetVault: SingleAssetVault;
  let foundry: Foundry;
  let hub: Hub;
  let dai: ERC20;
  let account0: SignerWithAddress;
  let account1: SignerWithAddress;
  let account2: SignerWithAddress;
  let daiHolder: Signer;
  let DAIWhale: string;
  const decimals = 18;
  const one = ethers.utils.parseEther("1");
  let baseY: BigNumber;
  const MAX_WEIGHT = 1000000;
  let hubId = 1;
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
    migrationRegistry = await deploy<MigrationRegistry>("MigrationRegistry");

    foundry = await deploy<Foundry>("Foundry", {
      WeightedAverage: weightedAverage.address,
    });
    hub = await deploy<Hub>("Hub");
    meTokenFactory = await deploy<MeTokenFactory>("MeTokenFactory");
    meTokenRegistry = await deploy<MeTokenRegistry>(
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

    await curveRegistry.approve(bancorZeroCurve.address);

    await vaultRegistry.approve(singleAssetVault.address);

    await hub.initialize(vaultRegistry.address, curveRegistry.address);
    // baseY = 1 == PRECISION/1000  and  baseX = 1000 == PRECISION
    // Max weight = 1000000 if reserveWeight = 0.5 ==  Max weight  / 2
    // this gives us m = 1/1000
    baseY = one.mul(1000);
    const reserveWeight = BigNumber.from(MAX_WEIGHT).div(2).toString();
    const encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint32"],
      [baseY, reserveWeight]
    );
    const encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
      ["address"],
      [DAI]
    );

    await hub.register(
      DAI,
      singleAssetVault.address,
      bancorZeroCurve.address,
      5000, //refund ratio
      encodedCurveDetails,
      encodedVaultArgs
    );
  });
  it("calculateMintReturn() from zero should work", async () => {
    let amount = one.mul(20);

    let estimate = await bancorZeroCurve.calculateMintReturn(
      amount,
      hubId,
      0,
      0
    );
    expect(estimate).to.equal(
      ethers.utils.parseEther("199.999999999999999999")
    );
  });
  it("calculateMintReturn() should work", async () => {
    let amount = one.mul(2);
    let estimate = await bancorZeroCurve.calculateMintReturn(
      amount,
      hubId,
      one.mul(2000),
      one.mul(2)
    );
    expect(estimate).to.equal(
      ethers.utils.parseEther("828.427124746190097603")
    );
    amount = one.mul(2);

    estimate = await bancorZeroCurve.calculateMintReturn(
      amount,
      hubId,
      ethers.utils.parseEther("2828.427124746190097603"),
      one.mul(4)
    );
    expect(estimate).to.equal(
      ethers.utils.parseEther("635.674490391564489451")
    );
  });
  it("calculateMintReturn should work with a max of 1414213562 supply should work", async () => {
    let amount = one.mul(999999999999999);
    let estimate = await bancorZeroCurve.calculateMintReturn(
      amount,
      hubId,
      0,
      0
    );
    expect(estimate).to.equal(
      ethers.utils.parseEther("1414213562.373094341694907537")
    );
  });
  it("calculateBurnReturn() to zero supply should work", async () => {
    let amount = ethers.utils.parseEther("200");
    // 586 burned token should release 1 DAI
    //  let p = await getRequestParams(amount);
    let estimate = await bancorZeroCurve.calculateBurnReturn(
      amount,
      hubId,
      one.mul(200),
      one.mul(20)
    );
    expect(estimate).to.equal(ethers.utils.parseEther("20"));
  });
  it("calculateBurnReturn() should work", async () => {
    let amount = ethers.utils.parseEther("585.786437626904952");
    // 586 burned token should release 1 DAI
    //  let p = await getRequestParams(amount);
    let estimate = await bancorZeroCurve.calculateBurnReturn(
      amount,
      hubId,
      one.mul(2000),
      one.mul(2)
    );
    expect(estimate).to.equal(ethers.utils.parseEther("1.000000000000000001"));

    amount = ethers.utils.parseEther("1171.572875253809903");

    estimate = await bancorZeroCurve.calculateBurnReturn(
      amount,
      hubId,
      one.mul(4000),
      one.mul(8)
    );
    expect(estimate).to.equal(ethers.utils.parseEther("4.000000000000000001"));
  });
  it("calculateBurnReturn should work with a max of 999999999999999000000000000000000 supply should work", async () => {
    let amount = one;

    let estimate = await bancorZeroCurve.calculateBurnReturn(
      amount,
      hubId,
      ethers.utils.parseEther("999999999999998999.99999999999999744"),
      one.mul(999999999999999)
    );

    expect(estimate).to.equal(ethers.utils.parseEther("0.002"));
  });
  it("initReconfigure() should work", async () => {
    const reserveWeight = BigNumber.from(MAX_WEIGHT).div(2);
    const targetReserveWeight = BigNumber.from(MAX_WEIGHT).sub(20000);
    const encodedValueSet = ethers.utils.defaultAbiCoder.encode(
      ["uint32"],
      [targetReserveWeight.toString()]
    );
    await bancorZeroCurve.initReconfigure(hubId, encodedValueSet);
    const detail = await bancorZeroCurve.getDetails(hubId);
    const targetBaseY = baseY.mul(reserveWeight).div(targetReserveWeight);
    expect(detail.targetReserveWeight).to.equal(targetReserveWeight);
    console.log(detail.targetReserveWeight.toString());
    expect(detail.targetBaseY).to.equal(targetBaseY);
  });

  it("calculateTargetMintReturn() from zero should work", async () => {
    const detail = await bancorZeroCurve.getDetails(hubId);
    let amount = one.mul(2);

    // (2^((1/0.98)−1))/(0.000510204081632653^((1/0.98)−1)) ==1.183947292541541

    let estimate = await bancorZeroCurve.calculateTargetMintReturn(
      amount,
      hubId,
      0,
      0
    );
    expect(estimate).to.equal(ethers.utils.parseEther("2.279096531302603397"));
  });

  it("calculateTargetMintReturn() should work", async () => {
    const detail = await bancorZeroCurve.getDetails(hubId);
    const targetReserveWeight = detail.targetReserveWeight;
    let amount = one.mul(2);

    //   2/(2000^((1/0.98)−1))* 1944.930817973436691629^((1/0.98)−1)) == 1,998860701224224
    let estimate = await bancorZeroCurve.calculateTargetMintReturn(
      amount,
      hubId,
      one.mul(2000),
      one.mul(2)
    );
    expect(estimate).to.equal(
      ethers.utils.parseEther("1944.930817973436691629")
    );
  });

  it("calculateTargetBurnReturn()  to zero supply should work", async () => {
    let amount = ethers.utils.parseEther("2000");
    // 586 burned token should release 1 DAI
    //  let p = await getRequestParams(amount);
    let estimate = await bancorZeroCurve.calculateTargetBurnReturn(
      amount,
      hubId,
      one.mul(2000),
      one.mul(2)
    );
    expect(estimate).to.equal(ethers.utils.parseEther("2"));
  });

  it("calculateBurnReturn() should work", async () => {
    let amount = ethers.utils.parseEther("1944.930817973436691629");
    // 586 burned token should release 1 DAI
    //  let p = await getRequestParams(amount);
    let estimate = await bancorZeroCurve.calculateTargetBurnReturn(
      amount,
      hubId,
      ethers.utils.parseEther("3944.930817973436691629"),
      one.mul(4)
    );
    expect(estimate).to.equal(ethers.utils.parseEther("1.999999999999999999"));

    amount = one.mul(1000);

    estimate = await bancorZeroCurve.calculateTargetBurnReturn(
      amount,
      hubId,
      one.mul(2000),
      one.mul(2)
    );
    expect(estimate).to.equal(ethers.utils.parseEther("1.014046278251899934"));
  });

  it("finishUpdate should work", async () => {
    // TODO
  });
});
