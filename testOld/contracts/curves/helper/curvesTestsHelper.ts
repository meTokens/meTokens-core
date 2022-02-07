import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { ICurve } from "../../../../artifacts/types/ICurve";
import { toETHNumber } from "../../../utils/helpers";

export const curvesTestsHelper = async ({
  signers,
  curve,
  baseY,
  reserveWeight,
  MAX_WEIGHT,
  targetReserveWeight,
  hubId,
  calculateTokenReturned,
  calculateTokenReturnedFromZero,
  calculateCollateralReturned,
  precision,
}: {
  signers: SignerWithAddress[];
  curve: ICurve;
  baseY: number;
  reserveWeight: number;
  MAX_WEIGHT: number;
  targetReserveWeight: number;
  hubId: number;
  calculateTokenReturned: (
    collateralAmount: number,
    meTokenSupply: number,
    balancePooled: number,
    reserveWeight: number
  ) => number;
  calculateCollateralReturned: (
    meTokenBurned: number,
    meTokenSupply: number,
    balancePooled: number,
    reserveWeight: number
  ) => number;
  calculateTokenReturnedFromZero: (
    depositAmount: number,
    baseY: number,
    reserveWeight: number
  ) => number;
  precision: number;
}) => {
  const one = ethers.utils.parseEther("1");

  it("Reverts w/ empty encodedDetails", async () => {
    /* await expect(
      curve.register(hubId, ethers.constants.HashZero)
    ).to.be.revertedWith("!_encodedDetails"); */

    await expect(
      curve.register(hubId, ethers.utils.toUtf8Bytes(""))
    ).to.be.revertedWith("!_encodedDetails");
  });
  it("Reverts w/ invalid encodedDetails", async () => {
    // TODO
    let encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint32"],
      [0, 500000]
    );
    // baseY > 0
    await expect(curve.register(hubId, encodedCurveDetails)).to.be.revertedWith(
      "!baseY"
    );
    encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint32"],
      [100, 1000001]
    );
    // reserveWeight > 1000000
    await expect(curve.register(hubId, encodedCurveDetails)).to.be.revertedWith(
      "!reserveWeight"
    );
    // reserveWeight =0
    encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint32"],
      [100, 0]
    );
    await expect(curve.register(hubId, encodedCurveDetails)).to.be.revertedWith(
      "!reserveWeight"
    );
  });
  it("Passes w/ valid encodedDetails", async () => {
    //register is done in the setup and there is no getCurveDetails part of  the interface
  });
  it("should be able to calculate Mint Return from zero", async () => {
    const etherAmount = 20;
    let amount = one.mul(etherAmount);

    let estimate = await curve.viewMeTokensMinted(amount, hubId, 0, 0);
    const calculatedReturn = calculateTokenReturnedFromZero(
      etherAmount,
      baseY,
      reserveWeight / MAX_WEIGHT
    );
    expect(toETHNumber(estimate)).to.be.approximately(
      calculatedReturn,
      precision
    );
  });
  it("should be able to calculate Mint Return", async () => {
    const amount = one.mul(2);
    let estimate = await curve.viewMeTokensMinted(
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
    expect(toETHNumber(estimate)).to.be.approximately(
      calculatedRes,
      precision //* 3
    );
    estimate = await curve.viewMeTokensMinted(
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
    expect(toETHNumber(estimate)).to.be.approximately(
      calculatedRes,
      precision // *4
    );
  });
  it("should be able to calculate Mint Return with a max of 1414213562 supply should work", async () => {
    let amount = one.mul(999999999999999);
    let estimate = await curve.viewMeTokensMinted(amount, hubId, 0, 0);
    const calculatedRes = calculateTokenReturnedFromZero(
      999999999999999,
      baseY,
      reserveWeight / MAX_WEIGHT
    );
    expect(toETHNumber(estimate)).to.be.approximately(
      calculatedRes,
      precision // *4
    );
  });
  it("should be able to calculate asset needed from zero supply", async () => {
    let amount = ethers.utils.parseEther("200");
    let estimate = await curve.viewAssetsReturned(
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
    expect(toETHNumber(estimate)).to.be.approximately(calculatedRes, precision);
  });
  it("should be able to calculate asset needed", async () => {
    let amount = ethers.utils.parseEther("585.786437626904952");
    let estimate = await curve.viewAssetsReturned(
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
    expect(toETHNumber(estimate)).to.be.approximately(
      calculatedRes,
      precision * 30000
    );
    amount = ethers.utils.parseEther("1171.572875253809903");

    estimate = await curve.viewAssetsReturned(
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
    expect(toETHNumber(estimate)).to.be.approximately(
      calculatedRes,
      precision * 100000
    );
  });
  it("should be able to calculate asset needed with a max of 999999999999999000000000000000000 supply should work", async () => {
    let amount = one;

    let estimate = await curve.viewAssetsReturned(
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
    expect(toETHNumber(estimate)).to.be.approximately(
      calculatedRes,
      0.000000000001
    );
  });

  it("initReconfigure() should work", async () => {
    const encodedValueSet = ethers.utils.defaultAbiCoder.encode(
      ["uint32"],
      [targetReserveWeight.toString()]
    );
    await curve.initReconfigure(hubId, encodedValueSet);
    const detail = await curve.getCurveDetails(hubId);

    const targetBaseY = ethers.utils
      .parseEther(baseY.toString())
      .mul(reserveWeight)
      .div(targetReserveWeight);

    expect(detail[3]).to.equal(targetReserveWeight);
    expect(detail[2]).to.equal(targetBaseY);
  });
  it("viewTargetMeTokensMinted() from zero should work", async () => {
    const detail = await curve.getCurveDetails(hubId);
    let amount = one.mul(2);

    let estimate = await curve.viewTargetMeTokensMinted(amount, hubId, 0, 0);
    const targetBaseY = ethers.utils
      .parseEther(baseY.toString())
      .mul(reserveWeight)
      .div(targetReserveWeight);
    const calculatedRes = calculateTokenReturnedFromZero(
      2,
      toETHNumber(targetBaseY),
      targetReserveWeight / MAX_WEIGHT
    );

    expect(toETHNumber(estimate)).to.be.approximately(
      calculatedRes,
      precision * 100
    );
  });
  it("viewTargetMeTokensMinted() should work", async () => {
    let amount = one.mul(2);

    let estimate = await curve.viewTargetMeTokensMinted(
      amount,
      hubId,
      one.mul(2000),
      one.mul(2)
    );
    const calculatedRes = calculateTokenReturned(
      2,
      2000,
      2,
      targetReserveWeight / MAX_WEIGHT
    );
    expect(toETHNumber(estimate)).to.be.approximately(calculatedRes, precision);
  });
  it("viewTargetAssetsReturned()  to zero supply should work", async () => {
    let amount = ethers.utils.parseEther("2000");
    let estimate = await curve.viewTargetAssetsReturned(
      amount,
      hubId,
      one.mul(2000),
      one.mul(2)
    );

    const calculatedRes = calculateCollateralReturned(
      2000,
      2000,
      2,
      targetReserveWeight
    );
    expect(toETHNumber(estimate)).to.be.approximately(calculatedRes, precision);
  });
  it("viewAssetsReturned() should work", async () => {
    let amount = ethers.utils.parseEther("1944.930817973436691629");
    let estimate = await curve.viewTargetAssetsReturned(
      amount,
      hubId,
      ethers.utils.parseEther("3944.930817973436691629"),
      one.mul(4)
    );
    let calculatedRes = calculateCollateralReturned(
      1944.930817973436691629,
      3944.930817973436691629,
      4,
      targetReserveWeight / MAX_WEIGHT
    );
    expect(toETHNumber(estimate)).to.be.approximately(calculatedRes, precision);

    amount = one.mul(1000);

    estimate = await curve.viewTargetAssetsReturned(
      amount,
      hubId,
      one.mul(2000),
      one.mul(2)
    );
    calculatedRes = calculateCollateralReturned(
      1000,
      2000,
      2,
      targetReserveWeight / MAX_WEIGHT
    );
    expect(toETHNumber(estimate)).to.be.approximately(calculatedRes, precision);
  });
};
