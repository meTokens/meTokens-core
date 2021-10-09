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
import { SingleAssetFactory } from "../../../artifacts/types/SingleAssetFactory";
import { SingleAssetVault } from "../../../artifacts/types/SingleAssetVault";
import { WeightedAverage } from "../../../artifacts/types/WeightedAverage";
import { VaultRegistry } from "../../../artifacts/types/VaultRegistry";
import { impersonate } from "../../utils/hardhatNode";
import { deploy, getContractAt } from "../../utils/helpers";
import { exit } from "process";
import { expect } from "chai";

describe("BancorZeroCurve", () => {
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
  const decimals = 18;
  const PRECISION = BigNumber.from(10).pow(18);
  const one = ethers.utils.parseEther("1");

  const MAX_WEIGHT = 1000000;
  let hubId = 0;
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
    // baseY = 1 == PRECISION/1000  and  baseX = 1000 == PRECISION
    // Max weight = 1000000 if reserveWeight = 0.5 ==  Max weight  / 2
    // this gives us m = 1/1000
    const baseY = PRECISION.div(1000).toString();
    console.log({ baseY });
    const reserveWeight = BigNumber.from(MAX_WEIGHT).div(2).toString();
    console.log({ reserveWeight });
    const encodedValueSet = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint32"],
      [baseY, reserveWeight]
    );

    /*   require(
      hasRole(FOUNDRY, msg.sender) ||
          hasRole(METOKEN_REGISTRY, msg.sender) */
    console.log("dddddddddddddddd");
    await hub.register(
      singleAssetFactory.address,
      bancorZeroCurve.address,
      DAI,
      5000, //refund ratio
      encodedValueSet,
      ethers.utils.toUtf8Bytes("")
    );
  });
  it("calculateTargetMintReturn()", async () => {
    let amount = one.mul(2);

    //  let p = await getRequestParams(amount);
    let estimate = await bancorZeroCurve.calculateMintReturn(
      amount,
      hubId,
      0,
      0
    );
    console.log(`     Prcesion:${ethers.utils.formatEther(PRECISION)}   `);
    expect(estimate).to.equal(one.mul(2000));

    amount = one.mul(4);

    //  let p = await getRequestParams(amount);
    estimate = await bancorZeroCurve.calculateMintReturn(amount, hubId, 0, 0);
    console.log(`     Prcesion:${ethers.utils.formatEther(PRECISION)}   `);
    expect(estimate).to.equal(one.mul(4000));
    amount = one.mul(2);

    estimate = await bancorZeroCurve.calculateMintReturn(
      amount,
      hubId,
      one.mul(2000),
      one.mul(2)
    );
    console.log(
      `     estimate ts= 2000 collateral=2 dai how many tokens for 2 more dai:${ethers.utils.formatEther(
        estimate
      )}   `
    );

    amount = one.mul(2);

    estimate = await bancorZeroCurve.calculateMintReturn(
      amount,
      hubId,
      ethers.utils.parseEther("2828.427124746190097603"),
      one.mul(4)
    );
    console.log(
      `     estimate ts= 2828 collateral=4 dai how many tokens for 2 more dai:${ethers.utils.formatEther(
        estimate
      )}   `
    );
  });
  /*   it("register()", async () => {
    // const index = 1;
    // const key = "0xbccc714d56bc0da0fd33d96d2a87b680dd6d0df6";

    const encodedValueSet = ethers.utils.defaultAbiCoder.encode(
      ["uint256"],
      [131]
    );
    //const key = encodedValueSet;
    const key = "0x0000000000000000000000000000000000000083";
    //  const key = "0x0000000000000000000000000000000000000000";
    // const key = ethers.utils.hexlify(0);
    console.log(`     Key:${key}   `);
 

    for (let index = 0; index < 10; index++) {
      const aaa = await ethers.provider.getStorageAt(
        bancorZeroCurve.address,
        index
      );
      console.log(` AAAAAAA:${aaa}  --index:${index}`);

      // The pre-image used to compute the Storage location
      const newKeyPreimage = ethers.utils.concat([
        // Mappings' keys in Solidity must all be word-aligned (32 bytes)
        ethers.utils.hexZeroPad(key, 32),

        // Similarly with the slot-index into the Solidity variable layout
        ethers.utils.hexZeroPad(BigNumber.from(index).toHexString(), 32),
      ]);

      console.log("New Key Preimage:", ethers.utils.hexlify(newKeyPreimage));

      const newKey = ethers.utils.keccak256(newKeyPreimage);
      console.log("New Key:", newKey);
      // "0xafef6be2b419f4d69d56fe34788202bf06650015554457a2470181981bcce7ef"

      const totalOutstandingDebt = await ethers.provider.getStorageAt(
        bancorZeroCurve.address,
        newKey
      );
      if (totalOutstandingDebt != ethers.constants.HashZero) {
        console.log(`
        
          *************************
          *************************
          *************************
          *************************
          *************************
          *************************
          *************************
          *************************
          *************************
          *************************
          *************************
          *************************
        *************************
        *************************
        *************************
        **********************************************************************
        RES:${totalOutstandingDebt} 
          `);
      }
    }
    // TODO
  }); */

  describe("registerTarget()", () => {
    // TODO
  });

  describe("calculateMintReturn()", () => {
    // TODO
  });

  describe("calculateBurnReturn()", () => {
    // TODO
  });
  describe("calculateTargetBurnReturn()", () => {
    // TODO
  });
});
