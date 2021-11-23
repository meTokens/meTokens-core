import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, Signer } from "ethers";
import { ethers, getNamedAccounts } from "hardhat";
import { BancorBancor } from "../../../artifacts/types/BancorBancor";
import { CurveRegistry } from "../../../artifacts/types/CurveRegistry";
import { ERC20 } from "../../../artifacts/types/ERC20";
import { Foundry } from "../../../artifacts/types/Foundry";
import { Hub } from "../../../artifacts/types/Hub";
import { MeTokenFactory } from "../../../artifacts/types/MeTokenFactory";
import { MeTokenRegistry } from "../../../artifacts/types/MeTokenRegistry";
import { SingleAssetVault } from "../../../artifacts/types/SingleAssetVault";
import { WeightedAverage } from "../../../artifacts/types/WeightedAverage";
import { VaultRegistry } from "../../../artifacts/types/VaultRegistry";
import {
  calculateCollateralReturned,
  calculateTokenReturned,
  calculateTokenReturnedFromZero,
  deploy,
} from "../../utils/helpers";
import { expect } from "chai";
import { MigrationRegistry } from "../../../artifacts/types/MigrationRegistry";
import { hubSetup } from "../../utils/hubSetup";
import { ContractFunctionVisibility } from "hardhat/internal/hardhat-network/stack-traces/model";

describe("BancorZeroCurve", () => {
  let DAI: string;
  let weightedAverage: WeightedAverage;
  let meTokenRegistry: MeTokenRegistry;
  let meTokenFactory: MeTokenFactory;
  let bancorZeroCurve: BancorBancor;
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
  const reserveWeight = MAX_WEIGHT / 2;
  let hubId = 1;
  let token;
  before(async () => {
    baseY = one.mul(1000);

    let DAI;
    ({ DAI } = await getNamedAccounts());

    const encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint32"],
      [baseY, reserveWeight]
    );
    const encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
      ["address"],
      [DAI]
    );
    // bancorZeroCurve = await deploy<BancorBancor>("BancorBancor");
    let token;
    bancorZeroCurve = await deploy<BancorZeroCurve>("BancorZeroCurve");

    ({
      token,
      hub,
      curveRegistry,
      migrationRegistry,
      foundry,
      account0,
      account1,
      account2,
      meTokenRegistry,
    } = await hubSetup(
      encodedCurveDetails,
      encodedVaultArgs,
      5000,
      bancorZeroCurve
    ));
    dai = token;
  });

  it("viewMeTokensMinted() from zero should work", async () => {
    let amount = one.mul(20);

    let estimate = await bancorZeroCurve.viewMeTokensMinted(
      amount,
      hubId,
      0,
      0
    );
    const calculatedRes = calculateTokenReturnedFromZero(
      20,
      1000,
      reserveWeight / MAX_WEIGHT
    );
    expect(
      Number.parseFloat(ethers.utils.formatEther(estimate))
    ).to.be.approximately(calculatedRes, 0.00000000000000000001);
  });
  it("viewMeTokensMinted() should work", async () => {
    const amount = one.mul(2);
    let estimate = await bancorZeroCurve.viewMeTokensMinted(
      amount,
      hubId,
      one.mul(2000),
      one.mul(2)
    );
    let calculatedRes = calculateTokenReturned(
      2,
      2000,
      2,
      reserveWeight / MAX_WEIGHT
    );

    // estimate = 828.427124746190097603
    expect(
      Number.parseFloat(ethers.utils.formatEther(estimate))
    ).to.be.approximately(calculatedRes, 0.0000000000003);
    estimate = await bancorZeroCurve.viewMeTokensMinted(
      amount,
      hubId,
      ethers.utils.parseEther("2828.427124746190097603"),
      one.mul(4)
    );
    calculatedRes = calculateTokenReturned(
      2,
      2828.427124746190097603,
      4,
      reserveWeight / MAX_WEIGHT
    );
    // estimate = 635.674490391564489451
    expect(
      Number.parseFloat(ethers.utils.formatEther(estimate))
    ).to.be.approximately(calculatedRes, 0.0000000000004);
  });
  it("viewMeTokensMinted should work with a max of 1414213562 supply should work", async () => {
    let amount = one.mul(999999999999999);
    let estimate = await bancorZeroCurve.viewMeTokensMinted(
      amount,
      hubId,
      0,
      0
    );
    const calculatedRes = calculateTokenReturnedFromZero(
      999999999999999,
      1000,
      reserveWeight / MAX_WEIGHT
    );
    // estimate = 1414213562.373094341694907537
    expect(
      Number.parseFloat(ethers.utils.formatEther(estimate))
    ).to.be.approximately(calculatedRes, 0.00000000000000004);
  });
  it("viewAssetsReturned() to zero supply should work", async () => {
    let amount = ethers.utils.parseEther("200");
    // 586 burned token should release 1 DAI
    //  let p = await getRequestParams(amount);
    let estimate = await bancorZeroCurve.viewAssetsReturned(
      amount,
      hubId,
      one.mul(200),
      one.mul(20)
    );
    const calculatedRes = calculateCollateralReturned(
      200,
      200,
      20,
      reserveWeight / MAX_WEIGHT
    );
    // estimate = 20
    expect(
      Number.parseFloat(ethers.utils.formatEther(estimate))
    ).to.be.approximately(calculatedRes, 0.00000000000000000000001);
  });
  it("viewAssetsReturned() should work", async () => {
    let amount = ethers.utils.parseEther("585.786437626904952");
    // 586 burned token should release 1 DAI
    //  let p = await getRequestParams(amount);
    let estimate = await bancorZeroCurve.viewAssetsReturned(
      amount,
      hubId,
      one.mul(2000),
      one.mul(2)
    );
    let calculatedRes = calculateCollateralReturned(
      585.786437626904952,
      2000,
      2,
      reserveWeight / MAX_WEIGHT
    );
    // estimate = 1.000000000000000001
    expect(
      Number.parseFloat(ethers.utils.formatEther(estimate))
    ).to.be.approximately(calculatedRes, 0.0000000000000003);

    amount = ethers.utils.parseEther("1171.572875253809903");

    estimate = await bancorZeroCurve.viewAssetsReturned(
      amount,
      hubId,
      one.mul(4000),
      one.mul(8)
    );
    calculatedRes = calculateCollateralReturned(
      1171.572875253809903,
      4000,
      8,
      reserveWeight / MAX_WEIGHT
    );
    // estimate = 4.000000000000000001
    expect(
      Number.parseFloat(ethers.utils.formatEther(estimate))
    ).to.be.approximately(calculatedRes, 0.000000000000001);
  });
  it("viewAssetsReturned should work with a max of 999999999999999000000000000000000 supply should work", async () => {
    let amount = one;

    let estimate = await bancorZeroCurve.viewAssetsReturned(
      amount,
      hubId,
      ethers.utils.parseEther("999999999999998999.99999999999999744"),
      one.mul(999999999999999)
    );
    const calculatedRes = calculateCollateralReturned(
      1,
      999999999999998999.999999,
      999999999999999,
      reserveWeight / MAX_WEIGHT
    );
    // estimate = 0.002
    expect(
      Number.parseFloat(ethers.utils.formatEther(estimate))
    ).to.be.approximately(calculatedRes, 0.000000000000001);
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
    expect(detail.targetBaseY).to.equal(targetBaseY);
  });
  it("viewTargetMeTokensMinted() from zero should work", async () => {
    const detail = await bancorZeroCurve.getDetails(hubId);
    let amount = one.mul(2);

    // (2^((1/0.98)−1))/(0.000510204081632653^((1/0.98)−1)) ==1.183947292541541

    let estimate = await bancorZeroCurve.viewTargetMeTokensMinted(
      amount,
      hubId,
      0,
      0
    );

    // 2.279096531302603397
    const calculatedRes = calculateTokenReturnedFromZero(
      2,
      (1000 * 500000) / (1000000 - 20000),
      (MAX_WEIGHT - 20000) / MAX_WEIGHT
    );
    expect(
      Number.parseFloat(ethers.utils.formatEther(estimate))
    ).to.be.approximately(calculatedRes, 0.000000000000000001);
  });
  it("viewTargetMeTokensMinted() should work", async () => {
    const detail = await bancorZeroCurve.getDetails(hubId);
    const targetReserveWeight = detail.targetReserveWeight;
    let amount = one.mul(2);

    //   2/(2000^((1/0.98)−1))* 1944.930817973436691629^((1/0.98)−1)) == 1,998860701224224
    let estimate = await bancorZeroCurve.viewTargetMeTokensMinted(
      amount,
      hubId,
      one.mul(2000),
      one.mul(2)
    );
    // 1944.930817973436691629
    const calculatedRes = calculateTokenReturned(
      2,
      2000,
      2,
      (MAX_WEIGHT - 20000) / MAX_WEIGHT
    );
    expect(
      Number.parseFloat(ethers.utils.formatEther(estimate))
    ).to.be.approximately(calculatedRes, 0.00000000000000000001);
  });
  it("viewTargetAssetsReturned()  to zero supply should work", async () => {
    let amount = ethers.utils.parseEther("2000");
    // 586 burned token should release 1 DAI
    //  let p = await getRequestParams(amount);
    let estimate = await bancorZeroCurve.viewTargetAssetsReturned(
      amount,
      hubId,
      one.mul(2000),
      one.mul(2)
    );
    // 2
    const calculatedRes = calculateCollateralReturned(
      2000,
      2000,
      2,
      (MAX_WEIGHT - 20000) / MAX_WEIGHT
    );
    expect(
      Number.parseFloat(ethers.utils.formatEther(estimate))
    ).to.be.approximately(calculatedRes, 0.00000000000000000001);
  });
  it("viewAssetsReturned() should work", async () => {
    let amount = ethers.utils.parseEther("1944.930817973436691629");
    // 586 burned token should release 1 DAI
    //  let p = await getRequestParams(amount);
    let estimate = await bancorZeroCurve.viewTargetAssetsReturned(
      amount,
      hubId,
      ethers.utils.parseEther("3944.930817973436691629"),
      one.mul(4)
    );
    // 1.999999999999999999
    let calculatedRes = calculateCollateralReturned(
      1944.930817973436691629,
      3944.930817973436691629,
      4,
      (MAX_WEIGHT - 20000) / MAX_WEIGHT
    );
    expect(
      Number.parseFloat(ethers.utils.formatEther(estimate))
    ).to.be.approximately(calculatedRes, 0.00000000000000000001);

    expect(estimate).to.equal(ethers.utils.parseEther("1.999999999999999999"));

    amount = one.mul(1000);

    estimate = await bancorZeroCurve.viewTargetAssetsReturned(
      amount,
      hubId,
      one.mul(2000),
      one.mul(2)
    );
    // 1.014046278251899934
    calculatedRes = calculateCollateralReturned(
      1000,
      2000,
      2,
      (MAX_WEIGHT - 20000) / MAX_WEIGHT
    );
    expect(
      Number.parseFloat(ethers.utils.formatEther(estimate))
    ).to.be.approximately(calculatedRes, 0.00000000000000000001);
  });
  describe("with baseY less than 1 ", () => {
    let newBancorZeroCurve: BancorZeroCurve;
    before(async () => {
      baseY = one.mul(1000);

      let DAI;
      ({ DAI } = await getNamedAccounts());

      const newEncodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint32"],
        [one.div(1000), reserveWeight]
      );
      const encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [DAI]
      );
      newBancorZeroCurve = await deploy<BancorZeroCurve>("BancorZeroCurve");

      ({
        token,
        hub,
        curveRegistry,
        migrationRegistry,
        foundry,
        account0,
        account1,
        account2,
        meTokenRegistry,
      } = await hubSetup(
        newEncodedCurveDetails,
        encodedVaultArgs,
        5000,
        newBancorZeroCurve
      ));
      dai = token;
    });
    it("viewMeTokensMinted() from zero should work", async () => {
      let amount = one.mul(100);
      console.log("newBancorZeroCurve", newBancorZeroCurve.address);
      let estimate = await newBancorZeroCurve.viewMeTokensMinted(
        amount,
        hubId,
        0,
        0
      );
      const calculatedRes = calculateTokenReturnedFromZero(
        100,
        0.001,
        reserveWeight / MAX_WEIGHT
      );
      expect(
        Number.parseFloat(ethers.utils.formatEther(estimate))
      ).to.be.approximately(calculatedRes, 0.00000000000000000001);
    });
  });
  it("finishUpdate should work", async () => {
    // TODO
  });
});
