import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { Hub } from "../../../../artifacts/types/Hub";
import { ICurve } from "../../../../artifacts/types/ICurve";
import { toETHNumber } from "../../../utils/helpers";

export const curvesTestsHelper = async ({
  signers,
  curve,
  newCurve,
  encodedReconfigureValueSet,
  hubId,
  hub,
  precision,
  calculateTokenReturned,
  calculateTargetTokenReturned,
  calculateTokenReturnedFromZero,
  calculateCollateralReturned,
  calculateTargetCollateralReturned,
  calculateTargetTokenReturnedFromZero,
  verifyCurveDetails,
}: {
  signers: SignerWithAddress[];
  curve: ICurve;
  newCurve: ICurve;
  encodedReconfigureValueSet: string;
  hubId: number;
  hub: Hub;
  precision: number;
  calculateTargetTokenReturned: (
    collateralAmount: number,
    meTokenSupply: number,
    balancePooled: number
  ) => number;
  calculateTokenReturned: (
    collateralAmount: number,
    meTokenSupply: number,
    balancePooled: number
  ) => number;
  calculateTargetCollateralReturned: (
    meTokenBurned: number,
    meTokenSupply: number,
    balancePooled: number
  ) => number;
  calculateCollateralReturned: (
    meTokenBurned: number,
    meTokenSupply: number,
    balancePooled: number
  ) => number;
  calculateTokenReturnedFromZero: (depositAmount: number) => number;
  calculateTargetTokenReturnedFromZero: (depositAmount: number) => number;
  verifyCurveDetails: (
    detail: [BigNumber, BigNumber, BigNumber, BigNumber]
  ) => void;
}) => {
  const one = ethers.utils.parseEther("1");

  it("Reverts w/ invalid parameters", async () => {
    await expect(
      hub.initUpdate(hubId, curve.address, 0, ethers.constants.HashZero)
    ).to.be.revertedWith("targetCurve==curve");
  });
  it("Reverts if initReconfigure not called by hub ", async () => {
    await expect(
      curve.initReconfigure(hubId, ethers.constants.HashZero)
    ).to.be.revertedWith("!hub");
  });
  it("Reverts if register not called by hub ", async () => {
    await expect(
      curve.register(hubId, ethers.constants.HashZero)
    ).to.be.revertedWith("!hub");
  });
  it("Reverts w/ incorrect encodedDetails", async () => {
    await expect(
      hub.initUpdate(hubId, newCurve.address, 0, ethers.utils.toUtf8Bytes("a"))
    ).to.be.reverted;
  });
  it("Reverts w/ invalid encodedDetails", async () => {
    let encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint32"],
      [0, 500000]
    );
    // first param must be > 0
    await expect(
      hub.initUpdate(hubId, newCurve.address, 0, encodedCurveDetails)
    ).to.be.reverted;

    // second param must be > 0
    encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint32"],
      [100, 0]
    );
    await expect(
      hub.initUpdate(hubId, newCurve.address, 0, encodedCurveDetails)
    ).to.be.reverted;
  });

  it("should be able to calculate Mint Return from zero", async () => {
    const etherAmount = 20;
    let amount = one.mul(etherAmount);

    let estimate = await curve.viewMeTokensMinted(amount, hubId, 0, 0);
    const calculatedReturn = calculateTokenReturnedFromZero(etherAmount);
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
    let calculatedRes = calculateTokenReturned(2, 2000, 2);
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
    calculatedRes = calculateTokenReturned(2, 2828.427124746190097603, 4);
    expect(toETHNumber(estimate)).to.be.approximately(
      calculatedRes,
      precision // *4
    );
  });
  it("should be able to calculate Mint Return with a max of 1414213562 supply should work", async () => {
    let amount = one.mul(999999999999999);
    let estimate = await curve.viewMeTokensMinted(amount, hubId, 0, 0);
    const calculatedRes = calculateTokenReturnedFromZero(999999999999999);
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
    const calculatedRes = calculateCollateralReturned(200, 200, 20);
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
      2
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
    calculatedRes = calculateCollateralReturned(1171.572875253809903, 4000, 8);
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
      999999999999999
    );
    expect(toETHNumber(estimate)).to.be.approximately(
      calculatedRes,
      0.000000000001
    );
  });

  it("initReconfigure() should work", async () => {
    await hub.initUpdate(
      hubId,
      ethers.constants.AddressZero,
      0,
      encodedReconfigureValueSet
    );

    const detail = await curve.getDetails(hubId);
    verifyCurveDetails(detail);
  });
  it("viewTargetMeTokensMinted() from zero should work", async () => {
    const detail = await curve.getDetails(hubId);
    let amount = one.mul(2);

    let estimate = await curve.viewTargetMeTokensMinted(amount, hubId, 0, 0);

    const calculatedRes = calculateTargetTokenReturnedFromZero(2);

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
    const calculatedRes = calculateTargetTokenReturned(2, 2000, 2);
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

    const calculatedRes = calculateTargetCollateralReturned(2000, 2000, 2);
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
    let calculatedRes = calculateTargetCollateralReturned(
      1944.930817973436691629,
      3944.930817973436691629,
      4
    );
    expect(toETHNumber(estimate)).to.be.approximately(calculatedRes, precision);

    amount = one.mul(1000);

    estimate = await curve.viewTargetAssetsReturned(
      amount,
      hubId,
      one.mul(2000),
      one.mul(2)
    );
    calculatedRes = calculateTargetCollateralReturned(1000, 2000, 2);
    expect(toETHNumber(estimate)).to.be.approximately(calculatedRes, precision);
  });
};
