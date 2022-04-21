import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { toETHNumber } from "../../../utils/helpers";
import { HubFacet, ICurveFacet } from "../../../../artifacts/types";

export const curvesTestsHelper = async ({
  curve,
  targetReserveWeight,
  hubId,
  hub,
  precision,
  calculateTokenReturned,
  calculateTargetTokenReturned,
  calculateTokenReturnedFromZero,
  calculateCollateralReturned,
  calculateTargetCollateralReturned,
  calculateTargetTokenReturnedFromZero,
  verifyCurveInfo,
}: {
  curve: ICurveFacet;
  targetReserveWeight: number;
  hubId: number;
  hub: HubFacet;
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
  calculateTokenReturnedFromZero: (
    depositAmount: number,
    balancePooled: number,
    meTokenSupply: number
  ) => number;
  calculateTargetTokenReturnedFromZero: (
    depositAmount: number,
    balancePooled: number,
    meTokenSupply: number
  ) => number;
  verifyCurveInfo: (info: [BigNumber, BigNumber, BigNumber, BigNumber]) => void;
}) => {
  const one = ethers.utils.parseEther("1");
  it("Reverts w/ invalid parameters", async () => {
    await expect(hub.initUpdate(hubId, 0, 0)).to.be.revertedWith(
      "Nothing to update"
    );
  });

  it("Reverts when same reserveWeight", async () => {
    const curveInfo = await curve.getCurveInfo(hubId);
    const tx = hub.initUpdate(hubId, 0, curveInfo.reserveWeight);
    await expect(tx).to.be.revertedWith("targetWeight!=Weight");
  });

  it("Reverts w/ incorrect encodedCurveInfo", async () => {
    await expect(hub.initUpdate(hubId, 0, hub.address)).to.be.reverted;
  });
  it("Reverts w/ invalid encodedCurveInfo", async () => {
    // param must be > 0
    await expect(hub.initUpdate(hubId, 0, ethers.constants.MaxUint256)).to.be
      .reverted;
  });

  it("viewMeTokensMinted() from 0 supply should work", async () => {
    const etherAmount = 20;
    let amount = one.mul(etherAmount);
    let estimate = await curve.viewMeTokensMinted(amount, hubId, 0, 0);
    const calculatedReturn = calculateTokenReturnedFromZero(etherAmount, 0, 0);
    expect(toETHNumber(estimate)).to.be.approximately(
      calculatedReturn,
      precision
    );
  });
  it("viewMeTokensMinted from non-zero supply should work", async () => {
    const amountNum = 2;
    let amount = one.mul(amountNum);

    // we need to have the right balancedPooled for supply
    let balancedPooledNum = 1000;
    let balancedPooled = one.mul(balancedPooledNum);
    let supply = await curve.viewMeTokensMinted(balancedPooled, hubId, 0, 0);
    let supplyNum = toETHNumber(supply);
    let estimate = await curve.viewMeTokensMinted(
      amount,
      hubId,
      supply,
      balancedPooled
    );
    let calculatedRes = calculateTokenReturned(
      amountNum,
      supplyNum,
      balancedPooledNum
    );

    expect(toETHNumber(estimate)).to.be.approximately(
      calculatedRes,
      precision //* 3
    );

    // we need to have the right balancedPooled for supply
    balancedPooledNum = 10000000;
    balancedPooled = one.mul(balancedPooledNum);
    supply = await curve.viewMeTokensMinted(balancedPooled, hubId, 0, 0);
    supplyNum = toETHNumber(supply);

    // balancedPooled = one.mul(4);
    estimate = await curve.viewMeTokensMinted(
      amount,
      hubId,
      supply,
      balancedPooled
    );
    calculatedRes = calculateTokenReturned(
      amountNum,
      supplyNum,
      balancedPooledNum
    );
    expect(toETHNumber(estimate)).to.be.approximately(
      calculatedRes,
      precision // *4
    );
  });
  it("viewMeTokensMinted() from 999999999999999 supply should work", async () => {
    let amount = one.mul(999999999999999);
    let estimate = await curve.viewMeTokensMinted(amount, hubId, 0, 0);
    const calculatedRes = calculateTokenReturnedFromZero(999999999999999, 0, 0);
    expect(toETHNumber(estimate)).to.be.approximately(
      calculatedRes,
      precision // *4
    );
  });
  it("viewAssetsReturned() from 0 supply should work", async () => {
    // we need to have the right balancedPooled for supply
    let balancedPooledNum = 7568;
    let balancedPooled = one.mul(balancedPooledNum);
    let supply = await curve.viewMeTokensMinted(balancedPooled, hubId, 0, 0);
    let supplyNum = toETHNumber(supply);
    const amountNum = supplyNum / 2;
    let amount = ethers.utils.parseEther(amountNum.toFixed(18));
    let estimate = await curve.viewAssetsReturned(
      amount,
      hubId,
      supply,
      balancedPooled
    );
    const calculatedRes = calculateCollateralReturned(
      amountNum,
      supplyNum,
      balancedPooledNum
    );
    expect(toETHNumber(estimate)).to.be.approximately(calculatedRes, precision);
  });
  it("viewAssetsReturned() from non-zero supply should work", async () => {
    // we need to have the right balancedPooled for supply
    let balancedPooledNum = 600000;
    let balancedPooled = one.mul(balancedPooledNum);
    let supply = await curve.viewMeTokensMinted(balancedPooled, hubId, 0, 0);
    let supplyNum = toETHNumber(supply);
    let amountNum = supplyNum / 700;
    let amount = ethers.utils.parseEther(amountNum.toFixed(18));
    let estimate = await curve.viewAssetsReturned(
      amount,
      hubId,
      supply,
      balancedPooled
    );
    let calculatedRes = calculateCollateralReturned(
      amountNum,
      supplyNum,
      balancedPooledNum
    );
    expect(toETHNumber(estimate)).to.be.approximately(
      calculatedRes,
      precision * 30000
    );

    amountNum = supplyNum - supplyNum / 100;

    amount = ethers.utils.parseEther(amountNum.toFixed(18));
    // we need to have the right balancedPooled for supply
    balancedPooledNum = 400000000;
    balancedPooled = one.mul(balancedPooledNum);
    supply = await curve.viewMeTokensMinted(balancedPooled, hubId, 0, 0);
    supplyNum = toETHNumber(supply);
    estimate = await curve.viewAssetsReturned(
      amount,
      hubId,
      supply,
      balancedPooled
    );
    calculatedRes = calculateCollateralReturned(
      amountNum,
      supplyNum,
      balancedPooledNum
    );
    expect(toETHNumber(estimate)).to.be.approximately(
      calculatedRes,
      precision * 100000
    );
  });
  it("viewAssetsReturned() from 999999999999999000000000000000000 supply should work", async () => {
    let amount = one;
    // we need to have the right balancedPooled for supply
    let balancedPooledNum = 999999999999999;
    let balancedPooled = one.mul(balancedPooledNum);
    let supply = await curve.viewMeTokensMinted(balancedPooled, hubId, 0, 0);
    let supplyNum = toETHNumber(supply);
    let estimate = await curve.viewAssetsReturned(
      amount,
      hubId,
      supply,
      balancedPooled
    );
    const calculatedRes = calculateCollateralReturned(
      1,
      supplyNum,
      balancedPooledNum
    );
    expect(toETHNumber(estimate)).to.be.approximately(calculatedRes, 0.2);
  });

  it("initReconfigure() should work", async () => {
    await hub.initUpdate(hubId, 0, targetReserveWeight);

    const info = await curve.getCurveInfo(hubId);
    verifyCurveInfo([
      info[0],
      BigNumber.from(info[2]),
      info[1],

      BigNumber.from(info[3]),
    ]);
  });
  it("viewTargetMeTokensMinted() from 0 supply should work", async () => {
    let amount = one.mul(2);
    let estimate = await curve.viewTargetMeTokensMinted(amount, hubId, 0, 0);
    const calculatedRes = calculateTargetTokenReturnedFromZero(2, 0, 0);
    expect(toETHNumber(estimate)).to.be.approximately(
      calculatedRes,
      precision * 100
    );
  });
  it("viewTargetMeTokensMinted() from non-zero supply should work", async () => {
    // we need to have the right balancedPooled for supply
    let balancedPooledNum = 2;
    let balancedPooled = one.mul(balancedPooledNum);
    let supply = await curve.viewTargetMeTokensMinted(
      balancedPooled,
      hubId,
      0,
      0
    );
    let supplyNum = toETHNumber(supply);
    const amountNum = supplyNum / 2;
    let amount = ethers.utils.parseEther(amountNum.toFixed(18));
    let estimate = await curve.viewTargetMeTokensMinted(
      amount,
      hubId,
      supply,
      balancedPooled
    );
    const calculatedRes = calculateTargetTokenReturned(
      amountNum,
      supplyNum,
      balancedPooledNum
    );
    expect(toETHNumber(estimate)).to.be.approximately(calculatedRes, precision);
  });
  it("viewTargetAssetsReturned() to 0 supply should work", async () => {
    // we need to have the right balancedPooled for supply
    let balancedPooledNum = 2;
    let balancedPooled = one.mul(balancedPooledNum);
    let supply = await curve.viewTargetMeTokensMinted(
      balancedPooled,
      hubId,
      0,
      0
    );
    let supplyNum = toETHNumber(supply);
    let estimate = await curve.viewTargetAssetsReturned(
      supply,
      hubId,
      supply,
      balancedPooled
    );
    const calculatedRes = calculateTargetCollateralReturned(
      supplyNum,
      supplyNum,
      balancedPooledNum
    );
    expect(toETHNumber(estimate)).to.be.equal(calculatedRes);
  });
  it("viewTargetAssetsReturned() should work", async () => {
    // we need to have the right balancedPooled for supply
    const balancedPooledNum = 4;
    const balancedPooled = one.mul(balancedPooledNum);
    const supply = await curve.viewTargetMeTokensMinted(
      balancedPooled,
      hubId,
      0,
      0
    );
    const supplyNum = toETHNumber(supply);

    const amountNum = supplyNum / 2;
    let amount = ethers.utils.parseEther(amountNum.toFixed(18));
    let estimate = await curve.viewTargetAssetsReturned(
      amount,
      hubId,
      supply,
      balancedPooled
    );
    let calculatedRes = calculateTargetCollateralReturned(
      amountNum,
      supplyNum,
      balancedPooledNum
    );
    expect(toETHNumber(estimate)).to.be.approximately(calculatedRes, precision);
    const amountNum2 = supplyNum - supplyNum / 1000;
    let amount2 = ethers.utils.parseEther(amountNum2.toFixed(18));
    estimate = await curve.viewTargetAssetsReturned(
      amount2,
      hubId,
      supply,
      balancedPooled
    );
    calculatedRes = calculateTargetCollateralReturned(
      amountNum2,
      supplyNum,
      balancedPooledNum
    );
    expect(toETHNumber(estimate)).to.be.approximately(calculatedRes, precision);
  });
};
