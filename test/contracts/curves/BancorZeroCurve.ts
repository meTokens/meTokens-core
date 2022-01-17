import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, Signer } from "ethers";
import { ethers, getNamedAccounts } from "hardhat";
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
  toETHNumber,
} from "../../utils/helpers";
import { expect } from "chai";
import { MigrationRegistry } from "../../../artifacts/types/MigrationRegistry";
import { hubSetup } from "../../utils/hubSetup";
import { ContractFunctionVisibility } from "hardhat/internal/hardhat-network/stack-traces/model";
import { BancorABDK } from "../../../artifacts/types/BancorABDK";

describe("BancorABDK", () => {
  let bancorABDK: BancorABDK;
  const one = ethers.utils.parseEther("1");
  let baseY: BigNumber;
  const MAX_WEIGHT = 1000000;
  const reserveWeight = MAX_WEIGHT / 2;
  let hubId = 1;
  let hub: Hub;
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

    let token;
    const weightedAverage = await deploy<WeightedAverage>("WeightedAverage");
    const foundry = await deploy<Foundry>("Foundry", {
      WeightedAverage: weightedAverage.address,
    });
    hub = await deploy<Hub>("Hub");
    bancorABDK = await deploy<BancorABDK>(
      "BancorABDK",
      undefined,
      hub.address,
      foundry.address
    );

    ({ token } = await hubSetup(
      encodedCurveDetails,
      encodedVaultArgs,
      5000,
      hub,
      foundry,
      bancorABDK
    ));
  });

  it("viewMeTokensMinted() from zero should work", async () => {
    let amount = one.mul(20);
    let estimate = await bancorABDK.viewMeTokensMinted(amount, hubId, 0, 0);
    const calculatedRes = calculateTokenReturnedFromZero(
      20,
      1000,
      reserveWeight / MAX_WEIGHT
    );
    expect(toETHNumber(estimate)).to.be.approximately(
      calculatedRes,
      0.00000000000000000001
    );
  });
  it("viewMeTokensMinted() should work", async () => {
    const amount = one.mul(2);
    let estimate = await bancorABDK.viewMeTokensMinted(
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
    expect(toETHNumber(estimate)).to.be.approximately(
      calculatedRes,
      0.0000000000003
    );
    estimate = await bancorABDK.viewMeTokensMinted(
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
    expect(toETHNumber(estimate)).to.be.approximately(
      calculatedRes,
      0.0000000000004
    );
  });
  it("viewMeTokensMinted should work with a max of 1414213562 supply should work", async () => {
    let amount = one.mul(999999999999999);
    let estimate = await bancorABDK.viewMeTokensMinted(amount, hubId, 0, 0);
    const calculatedRes = calculateTokenReturnedFromZero(
      999999999999999,
      1000,
      reserveWeight / MAX_WEIGHT
    );
    // estimate = 1414213562.373094341694907537
    expect(toETHNumber(estimate)).to.be.approximately(
      calculatedRes,
      0.00000000000000004
    );
  });
  it("viewAssetsReturned() to zero supply should work", async () => {
    let amount = ethers.utils.parseEther("200");
    // 586 burned token should release 1 DAI
    //  let p = await getRequestParams(amount);
    let estimate = await bancorABDK.viewAssetsReturned(
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
    expect(toETHNumber(estimate)).to.be.approximately(
      calculatedRes,
      0.00000000000000000000001
    );
  });
  it("viewAssetsReturned() should work", async () => {
    let amount = ethers.utils.parseEther("585.786437626904952");
    // 586 burned token should release 1 DAI
    //  let p = await getRequestParams(amount);
    let estimate = await bancorABDK.viewAssetsReturned(
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
    expect(toETHNumber(estimate)).to.be.approximately(
      calculatedRes,
      0.0000000000000003
    );

    amount = ethers.utils.parseEther("1171.572875253809903");

    estimate = await bancorABDK.viewAssetsReturned(
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
    expect(toETHNumber(estimate)).to.be.approximately(
      calculatedRes,
      0.00000000000001
    );
  });
  it("viewAssetsReturned should work with a max of 999999999999999000000000000000000 supply should work", async () => {
    let amount = one;

    let estimate = await bancorABDK.viewAssetsReturned(
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
    expect(toETHNumber(estimate)).to.be.approximately(
      calculatedRes,
      0.00000000000001
    );
  });
  it("initReconfigure() should work", async () => {
    const reserveWeight = BigNumber.from(MAX_WEIGHT).div(2);
    const targetReserveWeight = BigNumber.from(MAX_WEIGHT).sub(20000);
    const encodedValueSet = ethers.utils.defaultAbiCoder.encode(
      ["uint32"],
      [targetReserveWeight.toString()]
    );
    await hub.initUpdate(
      hubId,
      ethers.constants.AddressZero,
      0,
      encodedValueSet
    );
    const detail = await bancorABDK.getBancorDetails(hubId);
    const targetBaseY = baseY.mul(reserveWeight).div(targetReserveWeight);
    expect(detail.targetReserveWeight).to.equal(targetReserveWeight);
    expect(detail.targetBaseY).to.equal(targetBaseY);
  });
  it("viewTargetMeTokensMinted() from zero should work", async () => {
    const detail = await bancorABDK.getBancorDetails(hubId);
    let amount = one.mul(2);

    // (2^((1/0.98)−1))/(0.000510204081632653^((1/0.98)−1)) ==1.183947292541541

    let estimate = await bancorABDK.viewTargetMeTokensMinted(
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
    expect(toETHNumber(estimate)).to.be.approximately(
      calculatedRes,
      0.000000000000000001
    );
  });
  it("viewTargetMeTokensMinted() should work", async () => {
    const detail = await bancorABDK.getBancorDetails(hubId);
    const targetReserveWeight = detail.targetReserveWeight;
    let amount = one.mul(2);

    //   2/(2000^((1/0.98)−1))* 1944.930817973436691629^((1/0.98)−1)) == 1,998860701224224
    let estimate = await bancorABDK.viewTargetMeTokensMinted(
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
    expect(toETHNumber(estimate)).to.be.approximately(
      calculatedRes,
      0.000000000001
    );
  });
  it("viewTargetAssetsReturned()  to zero supply should work", async () => {
    let amount = ethers.utils.parseEther("2000");
    // 586 burned token should release 1 DAI
    //  let p = await getRequestParams(amount);
    let estimate = await bancorABDK.viewTargetAssetsReturned(
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
    expect(toETHNumber(estimate)).to.be.approximately(
      calculatedRes,
      0.00000000000000000001
    );
  });
  it("viewAssetsReturned() should work", async () => {
    let amount = ethers.utils.parseEther("1944.930817973436691629");
    // 586 burned token should release 1 DAI
    //  let p = await getRequestParams(amount);
    let estimate = await bancorABDK.viewTargetAssetsReturned(
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
    expect(toETHNumber(estimate)).to.be.approximately(
      calculatedRes,
      0.00000000000000000001
    );

    expect(estimate).to.equal(ethers.utils.parseEther("1.999999999999999999"));

    amount = one.mul(1000);

    estimate = await bancorABDK.viewTargetAssetsReturned(
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
    expect(toETHNumber(estimate)).to.be.approximately(
      calculatedRes,
      0.00000000000000000001
    );
  });
  describe("with baseY less than 1 ", () => {
    let newBancorABDK: BancorABDK;
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

      const weightedAverage = await deploy<WeightedAverage>("WeightedAverage");
      const foundry = await deploy<Foundry>("Foundry", {
        WeightedAverage: weightedAverage.address,
      });
      const hub = await deploy<Hub>("Hub");

      newBancorABDK = await deploy<BancorABDK>(
        "BancorABDK",
        undefined,
        hub.address,
        foundry.address
      );

      ({ token } = await hubSetup(
        newEncodedCurveDetails,
        encodedVaultArgs,
        5000,
        hub,
        foundry,
        newBancorABDK
      ));
    });
    it("viewMeTokensMinted() from zero should work", async () => {
      let amount = one.mul(100);
      let estimate = await newBancorABDK.viewMeTokensMinted(
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
      expect(toETHNumber(estimate)).to.be.approximately(
        calculatedRes,
        0.00000000000000000001
      );
    });
  });
  it("finishUpdate should work", async () => {
    // TODO
  });
});
