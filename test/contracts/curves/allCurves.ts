import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, getNamedAccounts } from "hardhat";
import {
  getCalculationFuncsForBancorCurves,
  toETHNumber,
} from "../../utils/helpers";
import { addHubSetup, hubSetup } from "../../utils/hubSetup";
import {
  Diamond,
  HubFacet,
  VaultRegistry,
  ICurveFacet,
} from "../../../artifacts/types";
import { BigNumber } from "ethers";
import { expect } from "chai";

const setup = async () => {
  let curves = new Array();
  let DAI: string;
  let vaultRegistry: VaultRegistry;
  let hub: HubFacet;
  let diamond: Diamond;
  let account0: SignerWithAddress;
  let account1: SignerWithAddress;
  let account2: SignerWithAddress;
  const one = ethers.utils.parseEther("1");
  const MAX_WEIGHT = 1000000;

  let tokenAddr: string;

  let encodedVaultArgs: string;

  // Setting up curve info to test

  let baseY1 = one.mul(1000);
  let reserveWeight1 = MAX_WEIGHT / 2;
  let targetReserveWeight1 = MAX_WEIGHT - 20000;

  let baseY2 = one.mul(100);
  let reserveWeight2 = MAX_WEIGHT / 10;
  let targetReserveWeight2 = reserveWeight2 + 20000;

  let baseY3 = one.mul(1);
  let reserveWeight3 = 100000;
  let targetReserveWeight3 = reserveWeight3 + 10000;

  let baseY4 = one.mul(1);
  let reserveWeight4 = 100000;
  let targetReserveWeight4 = reserveWeight4 + 10000;

  let baseY5 = one.mul(1);
  let reserveWeight5 = 500000;
  let targetReserveWeight5 = 333333;

  let baseY6 = one.mul(1);
  let reserveWeight6 = 250000;
  let targetReserveWeight6 = 333333;

  let baseY7 = one.mul(1000);
  let reserveWeight7 = MAX_WEIGHT;
  let targetReserveWeight7 = MAX_WEIGHT - 20000;

  // Create and register first hub we also link the curve of type "bancorCurve" to this hub (hubID = 1)
  let curve: ICurveFacet;
  before(async () => {
    ({ DAI } = await getNamedAccounts());
    encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(["address"], [DAI]);

    ({
      curve,
      tokenAddr,
      hub,
      diamond,
      vaultRegistry,
      account0,
      account1,
      account2,
    } = await hubSetup(baseY1, reserveWeight1, encodedVaultArgs, 5000));
    let addArgs: [
      string,
      HubFacet,
      Diamond,
      VaultRegistry,
      BigNumber,
      number,
      string,
      number,
      string
    ] = [
      tokenAddr,
      hub,
      diamond,
      vaultRegistry,
      baseY1,
      reserveWeight1,
      encodedVaultArgs,
      5000,
      account0.address,
    ];

    // we create a new curve of type "BancorCurve" and register it to a new hub (hubID = 2)
    // along with encoded info for the curve and the vault
    let hubInfo = await addHubSetup(...addArgs);
    let testCurve = {
      signers: [account0, account1, account2],
      curve,
      hub,
      precision: 0.000000000001,
    };
    curves.push({
      ...testCurve,
      hubId: hubInfo.hubId,
      targetReserveWeight: targetReserveWeight1,
      ...getCalculationFuncsForBancorCurves(
        baseY1,
        reserveWeight1,
        targetReserveWeight1,
        MAX_WEIGHT
      ),
    });

    // Second Bancor curve
    addArgs[4] = baseY2;
    addArgs[5] = reserveWeight2;
    // we register a new hub with the same curve deployed before but with new encoded curve info
    hubInfo = await addHubSetup(...addArgs);
    curves.push({
      ...testCurve,
      hubId: hubInfo.hubId,
      targetReserveWeight: targetReserveWeight2,
      ...getCalculationFuncsForBancorCurves(
        baseY2,
        reserveWeight2,
        targetReserveWeight2,
        MAX_WEIGHT
      ),
    });

    // Third Bancor curve
    addArgs[4] = baseY3;
    addArgs[5] = reserveWeight3;
    // we register a new hub with the same curve deployed before but with new encoded curve info
    hubInfo = await addHubSetup(...addArgs);
    curves.push({
      ...testCurve,
      hubId: hubInfo.hubId,
      targetReserveWeight: targetReserveWeight3,
      ...getCalculationFuncsForBancorCurves(
        baseY3,
        reserveWeight3,
        targetReserveWeight3,
        MAX_WEIGHT
      ),
    });
    // Fourth ABDK curve
    addArgs[4] = baseY4;
    addArgs[5] = reserveWeight4;
    // we register a new hub with the same curve deployed before but with new encoded curve details
    hubInfo = await addHubSetup(...addArgs);
    curves.push({
      ...testCurve,
      hubId: hubInfo.hubId,
      targetReserveWeight: targetReserveWeight4,
      ...getCalculationFuncsForBancorCurves(
        baseY4,
        reserveWeight4,
        targetReserveWeight4,
        MAX_WEIGHT
      ),
    });
    // fifth ABDK curve
    addArgs[4] = baseY5;
    addArgs[5] = reserveWeight5;
    // we register a new hub with the same curve deployed before but with new encoded curve details
    hubInfo = await addHubSetup(...addArgs);
    curves.push({
      ...testCurve,
      hubId: hubInfo.hubId,
      targetReserveWeight: targetReserveWeight5,
      ...getCalculationFuncsForBancorCurves(
        baseY5,
        reserveWeight5,
        targetReserveWeight5,
        MAX_WEIGHT
      ),
    });
    // sixth ABDK curve
    addArgs[4] = baseY6;
    addArgs[5] = reserveWeight6;
    // we register a new hub with the same curve deployed before but with new encoded curve details
    hubInfo = await addHubSetup(...addArgs);
    curves.push({
      ...testCurve,
      hubId: hubInfo.hubId,
      targetReserveWeight: targetReserveWeight6,
      ...getCalculationFuncsForBancorCurves(
        baseY6,
        reserveWeight6,
        targetReserveWeight6,
        MAX_WEIGHT
      ),
    });

    // seventh ABDK curve
    addArgs[4] = baseY7;
    addArgs[5] = reserveWeight7;
    // we register a new hub with the same curve deployed before but with new encoded curve details
    hubInfo = await addHubSetup(...addArgs);
    curves.push({
      ...testCurve,
      hubId: hubInfo.hubId,
      targetReserveWeight: targetReserveWeight7,
      ...getCalculationFuncsForBancorCurves(
        baseY7,
        reserveWeight7,
        targetReserveWeight7,
        MAX_WEIGHT
      ),
    });
  });
  describe(`${curves.length} Curves should work`, async () => {
    const one = ethers.utils.parseEther("1");
    describe("Curve n°1", () => {
      it("Reverts w/ invalid parameters", async () => {
        await expect(
          curves[0].hub.initUpdate(curves[0].hubId, 0, 0)
        ).to.be.revertedWith("Nothing to update");
      });

      it("Reverts when same reserveWeight", async () => {
        const curveInfo = await curves[0].curve.getCurveInfo(curves[0].hubId);
        const tx = curves[0].hub.initUpdate(
          curves[0].hubId,
          0,
          curveInfo.reserveWeight
        );
        await expect(tx).to.be.revertedWith("targetWeight!=Weight");
      });

      it("Reverts w/ incorrect encodedCurveInfo", async () => {
        await expect(
          curves[0].hub.initUpdate(curves[0].hubId, 0, curves[0].hub.address)
        ).to.be.reverted;
      });
      it("Reverts w/ invalid encodedCurveInfo", async () => {
        // param must be > 0
        await expect(
          curves[0].hub.initUpdate(
            curves[0].hubId,
            0,
            ethers.constants.MaxUint256
          )
        ).to.be.reverted;
      });

      it("viewMeTokensMinted() should fail in some conditions", async () => {
        await expect(
          curves[0].curve.viewMeTokensMinted(1, curves[0].hubId, 1, 0)
        ).to.be.revertedWith("!valid"); // fails as balancePooled = 0
      });

      it("viewMeTokensMinted() from 0 supply should work", async () => {
        const etherAmount = 20;
        let amount = one.mul(etherAmount);
        let estimate = await curves[0].curve.viewMeTokensMinted(
          amount,
          curves[0].hubId,
          0,
          0
        );
        const calculatedReturn = curves[0].calculateTokenReturnedFromZero(
          etherAmount,
          0,
          0
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedReturn,
          curves[0].precision
        );
      });
      it("viewMeTokensMinted() for 0 assetsDeposited should return 0", async () => {
        expect(
          await curves[0].curve.viewMeTokensMinted(0, curves[0].hubId, 0, 0)
        ).to.equal(0);
        expect(
          await curves[0].curve.viewMeTokensMinted(0, curves[0].hubId, 1, 1)
        ).to.equal(0);
      });
      it("viewMeTokensMinted from non-zero supply should work", async () => {
        const amountNum = 2;
        let amount = one.mul(amountNum);

        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 1000;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[0].curve.viewMeTokensMinted(
          balancedPooled,
          curves[0].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        let estimate = await curves[0].curve.viewMeTokensMinted(
          amount,
          curves[0].hubId,
          supply,
          balancedPooled
        );
        let calculatedRes = curves[0].calculateTokenReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );

        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[0].precision //* 3
        );

        // we need to have the right balancedPooled for supply
        balancedPooledNum = 10000000;
        balancedPooled = one.mul(balancedPooledNum);
        supply = await curves[0].curve.viewMeTokensMinted(
          balancedPooled,
          curves[0].hubId,
          0,
          0
        );
        supplyNum = toETHNumber(supply);

        // balancedPooled = one.mul(4);
        estimate = await curves[0].curve.viewMeTokensMinted(
          amount,
          curves[0].hubId,
          supply,
          balancedPooled
        );
        calculatedRes = curves[0].calculateTokenReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[0].precision // *4
        );
      });

      it("viewMeTokensMinted() from 999999999999999 supply should work", async () => {
        let amount = one.mul(999999999999999);
        let estimate = await curves[0].curve.viewMeTokensMinted(
          amount,
          curves[0].hubId,
          0,
          0
        );
        const calculatedRes = curves[0].calculateTokenReturnedFromZero(
          999999999999999,
          0,
          0
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[0].precision // *4
        );
      });

      it("viewAssetsReturned() should fail in some conditions", async () => {
        await expect(
          curves[0].curve.viewAssetsReturned(1, curves[0].hubId, 0, 1)
        ).to.be.revertedWith("!valid"); // fails as supply = 0
        await expect(
          curves[0].curve.viewAssetsReturned(1, curves[0].hubId, 1, 0)
        ).to.be.revertedWith("!valid"); // fails as balancePooled = 0
      });

      it("viewAssetsReturned() from 0 supply should work", async () => {
        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 7568;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[0].curve.viewMeTokensMinted(
          balancedPooled,
          curves[0].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        const amountNum = supplyNum / 2;
        let amount = ethers.utils.parseEther(amountNum.toFixed(18));
        let estimate = await curves[0].curve.viewAssetsReturned(
          amount,
          curves[0].hubId,
          supply,
          balancedPooled
        );
        const calculatedRes = curves[0].calculateCollateralReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[0].precision
        );
      });
      it("viewMeTokensMinted should be linked to balance pooled", async () => {
        const amountNum = 2;
        let amount = one.mul(amountNum);

        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 1000;
        let balancedPooled = one.mul(balancedPooledNum);
        let supplyOne = await curves[0].curve.viewMeTokensMinted(
          balancedPooled,
          curves[0].hubId,
          0,
          0
        );

        // we need to have the right balancedPooled for supply
        balancedPooledNum = 10000000;
        balancedPooled = one.mul(balancedPooledNum);
        let supplyTwo = await curves[0].curve.viewMeTokensMinted(
          balancedPooled,
          curves[0].hubId,
          0,
          0
        );
        expect(supplyOne).to.not.equal(supplyTwo);
      });
      it("viewAssetsReturned() should be linked to balance pooled", async () => {
        // we need to have the right balancedPooled for supply
        let amount = 2;
        let balancedPooledNum = 600000;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[0].curve.viewMeTokensMinted(
          balancedPooled,
          curves[0].hubId,
          0,
          0
        );

        let estimateOne = await curves[0].curve.viewAssetsReturned(
          amount,
          curves[0].hubId,
          supply,
          balancedPooled
        );
        // amount = 9999999999;
        balancedPooledNum = 6;
        balancedPooled = one.mul(balancedPooledNum);
        //  supply = await curves[0].curve.viewMeTokensMinted(balancedPooled, curves[0].hubId, 0, 0);

        let estimateTwo = await curves[0].curve.viewAssetsReturned(
          amount,
          curves[0].hubId,
          supply,
          balancedPooled
        );
        expect(estimateOne).to.not.equal(estimateTwo);
      });

      it("viewAssetsReturned() from non-zero supply should work", async () => {
        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 600000;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[0].curve.viewMeTokensMinted(
          balancedPooled,
          curves[0].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        let amountNum = supplyNum / 700;
        let amount = ethers.utils.parseEther(amountNum.toFixed(18));
        let estimate = await curves[0].curve.viewAssetsReturned(
          amount,
          curves[0].hubId,
          supply,
          balancedPooled
        );
        let calculatedRes = curves[0].calculateCollateralReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[0].precision * 30000
        );

        amountNum = supplyNum - supplyNum / 100;

        amount = ethers.utils.parseEther(amountNum.toFixed(18));
        // we need to have the right balancedPooled for supply
        balancedPooledNum = 400000000;
        balancedPooled = one.mul(balancedPooledNum);
        supply = await curves[0].curve.viewMeTokensMinted(
          balancedPooled,
          curves[0].hubId,
          0,
          0
        );
        supplyNum = toETHNumber(supply);
        estimate = await curves[0].curve.viewAssetsReturned(
          amount,
          curves[0].hubId,
          supply,
          balancedPooled
        );
        calculatedRes = curves[0].calculateCollateralReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[0].precision * 100000
        );
      });
      it("viewAssetsReturned() from 999999999999999000000000000000000 supply should work", async () => {
        let amount = one;
        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 999999999999999;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[0].curve.viewMeTokensMinted(
          balancedPooled,
          curves[0].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        let estimate = await curves[0].curve.viewAssetsReturned(
          amount,
          curves[0].hubId,
          supply,
          balancedPooled
        );
        const calculatedRes = curves[0].calculateCollateralReturned(
          1,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(calculatedRes, 0.2);
      });

      it("initReconfigure() should work", async () => {
        await curves[0].hub.initUpdate(
          curves[0].hubId,
          0,
          curves[0].targetReserveWeight
        );

        const info = await curves[0].curve.getCurveInfo(curves[0].hubId);
        curves[0].verifyCurveInfo([
          info[0],
          BigNumber.from(info[2]),
          info[1],

          BigNumber.from(info[3]),
        ]);
      });
      it("viewTargetMeTokensMinted() from 0 supply should work", async () => {
        let amount = one.mul(2);
        let estimate = await curves[0].curve.viewTargetMeTokensMinted(
          amount,
          curves[0].hubId,
          0,
          0
        );
        const calculatedRes = curves[0].calculateTargetTokenReturnedFromZero(
          2,
          0,
          0
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[0].precision * 100
        );
      });
      it("viewTargetMeTokensMinted() from non-zero supply should work", async () => {
        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 2;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[0].curve.viewTargetMeTokensMinted(
          balancedPooled,
          curves[0].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        const amountNum = supplyNum / 2;
        let amount = ethers.utils.parseEther(amountNum.toFixed(18));
        let estimate = await curves[0].curve.viewTargetMeTokensMinted(
          amount,
          curves[0].hubId,
          supply,
          balancedPooled
        );
        const calculatedRes = curves[0].calculateTargetTokenReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[0].precision
        );
      });
      it("viewTargetAssetsReturned() to 0 supply should work", async () => {
        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 2;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[0].curve.viewTargetMeTokensMinted(
          balancedPooled,
          curves[0].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        let estimate = await curves[0].curve.viewTargetAssetsReturned(
          supply,
          curves[0].hubId,
          supply,
          balancedPooled
        );
        const calculatedRes = curves[0].calculateTargetCollateralReturned(
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
        const supply = await curves[0].curve.viewTargetMeTokensMinted(
          balancedPooled,
          curves[0].hubId,
          0,
          0
        );
        const supplyNum = toETHNumber(supply);

        const amountNum = supplyNum / 2;
        let amount = ethers.utils.parseEther(amountNum.toFixed(18));
        let estimate = await curves[0].curve.viewTargetAssetsReturned(
          amount,
          curves[0].hubId,
          supply,
          balancedPooled
        );
        let calculatedRes = curves[0].calculateTargetCollateralReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[0].precision
        );
        const amountNum2 = supplyNum - supplyNum / 1000;
        let amount2 = ethers.utils.parseEther(amountNum2.toFixed(18));
        estimate = await curves[0].curve.viewTargetAssetsReturned(
          amount2,
          curves[0].hubId,
          supply,
          balancedPooled
        );
        calculatedRes = curves[0].calculateTargetCollateralReturned(
          amountNum2,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[0].precision
        );
      });
    });
    describe("Curve n°2", () => {
      it("Reverts w/ invalid parameters", async () => {
        await expect(
          curves[1].hub.initUpdate(curves[1].hubId, 0, 0)
        ).to.be.revertedWith("Nothing to update");
      });

      it("Reverts when same reserveWeight", async () => {
        const curveInfo = await curves[1].curve.getCurveInfo(curves[1].hubId);
        const tx = curves[1].hub.initUpdate(
          curves[1].hubId,
          0,
          curveInfo.reserveWeight
        );
        await expect(tx).to.be.revertedWith("targetWeight!=Weight");
      });

      it("Reverts w/ incorrect encodedCurveInfo", async () => {
        await expect(
          curves[1].hub.initUpdate(curves[1].hubId, 0, curves[1].hub.address)
        ).to.be.reverted;
      });
      it("Reverts w/ invalid encodedCurveInfo", async () => {
        // param must be > 0
        await expect(
          curves[1].hub.initUpdate(
            curves[1].hubId,
            0,
            ethers.constants.MaxUint256
          )
        ).to.be.reverted;
      });

      it("viewMeTokensMinted() should fail in some conditions", async () => {
        await expect(
          curves[1].curve.viewMeTokensMinted(1, curves[1].hubId, 1, 0)
        ).to.be.revertedWith("!valid"); // fails as balancePooled = 0
      });

      it("viewMeTokensMinted() from 0 supply should work", async () => {
        const etherAmount = 20;
        let amount = one.mul(etherAmount);
        let estimate = await curves[1].curve.viewMeTokensMinted(
          amount,
          curves[1].hubId,
          0,
          0
        );
        const calculatedReturn = curves[1].calculateTokenReturnedFromZero(
          etherAmount,
          0,
          0
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedReturn,
          curves[1].precision
        );
      });
      it("viewMeTokensMinted() for 0 assetsDeposited should return 0", async () => {
        expect(
          await curves[1].curve.viewMeTokensMinted(0, curves[1].hubId, 0, 0)
        ).to.equal(0);
        expect(
          await curves[1].curve.viewMeTokensMinted(0, curves[1].hubId, 1, 1)
        ).to.equal(0);
      });
      it("viewMeTokensMinted from non-zero supply should work", async () => {
        const amountNum = 2;
        let amount = one.mul(amountNum);

        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 1000;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[1].curve.viewMeTokensMinted(
          balancedPooled,
          curves[1].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        let estimate = await curves[1].curve.viewMeTokensMinted(
          amount,
          curves[1].hubId,
          supply,
          balancedPooled
        );
        let calculatedRes = curves[1].calculateTokenReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );

        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[1].precision //* 3
        );

        // we need to have the right balancedPooled for supply
        balancedPooledNum = 10000000;
        balancedPooled = one.mul(balancedPooledNum);
        supply = await curves[1].curve.viewMeTokensMinted(
          balancedPooled,
          curves[1].hubId,
          0,
          0
        );
        supplyNum = toETHNumber(supply);

        // balancedPooled = one.mul(4);
        estimate = await curves[1].curve.viewMeTokensMinted(
          amount,
          curves[1].hubId,
          supply,
          balancedPooled
        );
        calculatedRes = curves[1].calculateTokenReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[1].precision // *4
        );
      });

      it("viewMeTokensMinted() from 999999999999999 supply should work", async () => {
        let amount = one.mul(999999999999999);
        let estimate = await curves[1].curve.viewMeTokensMinted(
          amount,
          curves[1].hubId,
          0,
          0
        );
        const calculatedRes = curves[1].calculateTokenReturnedFromZero(
          999999999999999,
          0,
          0
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[1].precision // *4
        );
      });

      it("viewAssetsReturned() should fail in some conditions", async () => {
        await expect(
          curves[1].curve.viewAssetsReturned(1, curves[1].hubId, 0, 1)
        ).to.be.revertedWith("!valid"); // fails as supply = 0
        await expect(
          curves[1].curve.viewAssetsReturned(1, curves[1].hubId, 1, 0)
        ).to.be.revertedWith("!valid"); // fails as balancePooled = 0
      });

      it("viewAssetsReturned() from 0 supply should work", async () => {
        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 7568;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[1].curve.viewMeTokensMinted(
          balancedPooled,
          curves[1].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        const amountNum = supplyNum / 2;
        let amount = ethers.utils.parseEther(amountNum.toFixed(18));
        let estimate = await curves[1].curve.viewAssetsReturned(
          amount,
          curves[1].hubId,
          supply,
          balancedPooled
        );
        const calculatedRes = curves[1].calculateCollateralReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[1].precision
        );
      });
      it("viewMeTokensMinted should be linked to balance pooled", async () => {
        const amountNum = 2;
        let amount = one.mul(amountNum);

        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 1000;
        let balancedPooled = one.mul(balancedPooledNum);
        let supplyOne = await curves[1].curve.viewMeTokensMinted(
          balancedPooled,
          curves[1].hubId,
          0,
          0
        );

        // we need to have the right balancedPooled for supply
        balancedPooledNum = 10000000;
        balancedPooled = one.mul(balancedPooledNum);
        let supplyTwo = await curves[1].curve.viewMeTokensMinted(
          balancedPooled,
          curves[1].hubId,
          0,
          0
        );
        expect(supplyOne).to.not.equal(supplyTwo);
      });
      it("viewAssetsReturned() should be linked to balance pooled", async () => {
        // we need to have the right balancedPooled for supply
        let amount = 2;
        let balancedPooledNum = 600000;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[1].curve.viewMeTokensMinted(
          balancedPooled,
          curves[1].hubId,
          0,
          0
        );

        let estimateOne = await curves[1].curve.viewAssetsReturned(
          amount,
          curves[1].hubId,
          supply,
          balancedPooled
        );
        // amount = 9999999999;
        balancedPooledNum = 6;
        balancedPooled = one.mul(balancedPooledNum);
        //  supply = await curves[1].curve.viewMeTokensMinted(balancedPooled, curves[1].hubId, 0, 0);

        let estimateTwo = await curves[1].curve.viewAssetsReturned(
          amount,
          curves[1].hubId,
          supply,
          balancedPooled
        );
        expect(estimateOne).to.not.equal(estimateTwo);
      });

      it("viewAssetsReturned() from non-zero supply should work", async () => {
        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 600000;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[1].curve.viewMeTokensMinted(
          balancedPooled,
          curves[1].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        let amountNum = supplyNum / 700;
        let amount = ethers.utils.parseEther(amountNum.toFixed(18));
        let estimate = await curves[1].curve.viewAssetsReturned(
          amount,
          curves[1].hubId,
          supply,
          balancedPooled
        );
        let calculatedRes = curves[1].calculateCollateralReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[1].precision * 30000
        );

        amountNum = supplyNum - supplyNum / 100;

        amount = ethers.utils.parseEther(amountNum.toFixed(18));
        // we need to have the right balancedPooled for supply
        balancedPooledNum = 400000000;
        balancedPooled = one.mul(balancedPooledNum);
        supply = await curves[1].curve.viewMeTokensMinted(
          balancedPooled,
          curves[1].hubId,
          0,
          0
        );
        supplyNum = toETHNumber(supply);
        estimate = await curves[1].curve.viewAssetsReturned(
          amount,
          curves[1].hubId,
          supply,
          balancedPooled
        );
        calculatedRes = curves[1].calculateCollateralReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[1].precision * 100000
        );
      });
      it("viewAssetsReturned() from 999999999999999000000000000000000 supply should work", async () => {
        let amount = one;
        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 999999999999999;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[1].curve.viewMeTokensMinted(
          balancedPooled,
          curves[1].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        let estimate = await curves[1].curve.viewAssetsReturned(
          amount,
          curves[1].hubId,
          supply,
          balancedPooled
        );
        const calculatedRes = curves[1].calculateCollateralReturned(
          1,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(calculatedRes, 0.2);
      });

      it("initReconfigure() should work", async () => {
        await curves[1].hub.initUpdate(
          curves[1].hubId,
          0,
          curves[1].targetReserveWeight
        );

        const info = await curves[1].curve.getCurveInfo(curves[1].hubId);
        curves[1].verifyCurveInfo([
          info[0],
          BigNumber.from(info[2]),
          info[1],

          BigNumber.from(info[3]),
        ]);
      });
      it("viewTargetMeTokensMinted() from 0 supply should work", async () => {
        let amount = one.mul(2);
        let estimate = await curves[1].curve.viewTargetMeTokensMinted(
          amount,
          curves[1].hubId,
          0,
          0
        );
        const calculatedRes = curves[1].calculateTargetTokenReturnedFromZero(
          2,
          0,
          0
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[1].precision * 100
        );
      });
      it("viewTargetMeTokensMinted() from non-zero supply should work", async () => {
        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 2;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[1].curve.viewTargetMeTokensMinted(
          balancedPooled,
          curves[1].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        const amountNum = supplyNum / 2;
        let amount = ethers.utils.parseEther(amountNum.toFixed(18));
        let estimate = await curves[1].curve.viewTargetMeTokensMinted(
          amount,
          curves[1].hubId,
          supply,
          balancedPooled
        );
        const calculatedRes = curves[1].calculateTargetTokenReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[1].precision
        );
      });
      it("viewTargetAssetsReturned() to 0 supply should work", async () => {
        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 2;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[1].curve.viewTargetMeTokensMinted(
          balancedPooled,
          curves[1].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        let estimate = await curves[1].curve.viewTargetAssetsReturned(
          supply,
          curves[1].hubId,
          supply,
          balancedPooled
        );
        const calculatedRes = curves[1].calculateTargetCollateralReturned(
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
        const supply = await curves[1].curve.viewTargetMeTokensMinted(
          balancedPooled,
          curves[1].hubId,
          0,
          0
        );
        const supplyNum = toETHNumber(supply);

        const amountNum = supplyNum / 2;
        let amount = ethers.utils.parseEther(amountNum.toFixed(18));
        let estimate = await curves[1].curve.viewTargetAssetsReturned(
          amount,
          curves[1].hubId,
          supply,
          balancedPooled
        );
        let calculatedRes = curves[1].calculateTargetCollateralReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[1].precision
        );
        const amountNum2 = supplyNum - supplyNum / 1000;
        let amount2 = ethers.utils.parseEther(amountNum2.toFixed(18));
        estimate = await curves[1].curve.viewTargetAssetsReturned(
          amount2,
          curves[1].hubId,
          supply,
          balancedPooled
        );
        calculatedRes = curves[1].calculateTargetCollateralReturned(
          amountNum2,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[1].precision
        );
      });
    });
    describe("Curve n°3", () => {
      it("Reverts w/ invalid parameters", async () => {
        await expect(
          curves[2].hub.initUpdate(curves[2].hubId, 0, 0)
        ).to.be.revertedWith("Nothing to update");
      });

      it("Reverts when same reserveWeight", async () => {
        const curveInfo = await curves[2].curve.getCurveInfo(curves[2].hubId);
        const tx = curves[2].hub.initUpdate(
          curves[2].hubId,
          0,
          curveInfo.reserveWeight
        );
        await expect(tx).to.be.revertedWith("targetWeight!=Weight");
      });

      it("Reverts w/ incorrect encodedCurveInfo", async () => {
        await expect(
          curves[2].hub.initUpdate(curves[2].hubId, 0, curves[2].hub.address)
        ).to.be.reverted;
      });
      it("Reverts w/ invalid encodedCurveInfo", async () => {
        // param must be > 0
        await expect(
          curves[2].hub.initUpdate(
            curves[2].hubId,
            0,
            ethers.constants.MaxUint256
          )
        ).to.be.reverted;
      });

      it("viewMeTokensMinted() should fail in some conditions", async () => {
        await expect(
          curves[2].curve.viewMeTokensMinted(1, curves[2].hubId, 1, 0)
        ).to.be.revertedWith("!valid"); // fails as balancePooled = 0
      });

      it("viewMeTokensMinted() from 0 supply should work", async () => {
        const etherAmount = 20;
        let amount = one.mul(etherAmount);
        let estimate = await curves[2].curve.viewMeTokensMinted(
          amount,
          curves[2].hubId,
          0,
          0
        );
        const calculatedReturn = curves[2].calculateTokenReturnedFromZero(
          etherAmount,
          0,
          0
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedReturn,
          curves[2].precision
        );
      });
      it("viewMeTokensMinted() for 0 assetsDeposited should return 0", async () => {
        expect(
          await curves[2].curve.viewMeTokensMinted(0, curves[2].hubId, 0, 0)
        ).to.equal(0);
        expect(
          await curves[2].curve.viewMeTokensMinted(0, curves[2].hubId, 1, 1)
        ).to.equal(0);
      });
      it("viewMeTokensMinted from non-zero supply should work", async () => {
        const amountNum = 2;
        let amount = one.mul(amountNum);

        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 1000;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[2].curve.viewMeTokensMinted(
          balancedPooled,
          curves[2].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        let estimate = await curves[2].curve.viewMeTokensMinted(
          amount,
          curves[2].hubId,
          supply,
          balancedPooled
        );
        let calculatedRes = curves[2].calculateTokenReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );

        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[2].precision //* 3
        );

        // we need to have the right balancedPooled for supply
        balancedPooledNum = 10000000;
        balancedPooled = one.mul(balancedPooledNum);
        supply = await curves[2].curve.viewMeTokensMinted(
          balancedPooled,
          curves[2].hubId,
          0,
          0
        );
        supplyNum = toETHNumber(supply);

        // balancedPooled = one.mul(4);
        estimate = await curves[2].curve.viewMeTokensMinted(
          amount,
          curves[2].hubId,
          supply,
          balancedPooled
        );
        calculatedRes = curves[2].calculateTokenReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[2].precision // *4
        );
      });

      it("viewMeTokensMinted() from 999999999999999 supply should work", async () => {
        let amount = one.mul(999999999999999);
        let estimate = await curves[2].curve.viewMeTokensMinted(
          amount,
          curves[2].hubId,
          0,
          0
        );
        const calculatedRes = curves[2].calculateTokenReturnedFromZero(
          999999999999999,
          0,
          0
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[2].precision // *4
        );
      });

      it("viewAssetsReturned() should fail in some conditions", async () => {
        await expect(
          curves[2].curve.viewAssetsReturned(1, curves[2].hubId, 0, 1)
        ).to.be.revertedWith("!valid"); // fails as supply = 0
        await expect(
          curves[2].curve.viewAssetsReturned(1, curves[2].hubId, 1, 0)
        ).to.be.revertedWith("!valid"); // fails as balancePooled = 0
      });

      it("viewAssetsReturned() from 0 supply should work", async () => {
        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 7568;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[2].curve.viewMeTokensMinted(
          balancedPooled,
          curves[2].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        const amountNum = supplyNum / 2;
        let amount = ethers.utils.parseEther(amountNum.toFixed(18));
        let estimate = await curves[2].curve.viewAssetsReturned(
          amount,
          curves[2].hubId,
          supply,
          balancedPooled
        );
        const calculatedRes = curves[2].calculateCollateralReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[2].precision
        );
      });
      it("viewMeTokensMinted should be linked to balance pooled", async () => {
        const amountNum = 2;
        let amount = one.mul(amountNum);

        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 1000;
        let balancedPooled = one.mul(balancedPooledNum);
        let supplyOne = await curves[2].curve.viewMeTokensMinted(
          balancedPooled,
          curves[2].hubId,
          0,
          0
        );

        // we need to have the right balancedPooled for supply
        balancedPooledNum = 10000000;
        balancedPooled = one.mul(balancedPooledNum);
        let supplyTwo = await curves[2].curve.viewMeTokensMinted(
          balancedPooled,
          curves[2].hubId,
          0,
          0
        );
        expect(supplyOne).to.not.equal(supplyTwo);
      });
      it("viewAssetsReturned() should be linked to balance pooled", async () => {
        // we need to have the right balancedPooled for supply
        let amount = 2;
        let balancedPooledNum = 600000;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[2].curve.viewMeTokensMinted(
          balancedPooled,
          curves[2].hubId,
          0,
          0
        );

        let estimateOne = await curves[2].curve.viewAssetsReturned(
          amount,
          curves[2].hubId,
          supply,
          balancedPooled
        );
        // amount = 9999999999;
        balancedPooledNum = 6;
        balancedPooled = one.mul(balancedPooledNum);
        //  supply = await curves[2].curve.viewMeTokensMinted(balancedPooled, curves[2].hubId, 0, 0);

        let estimateTwo = await curves[2].curve.viewAssetsReturned(
          amount,
          curves[2].hubId,
          supply,
          balancedPooled
        );
        expect(estimateOne).to.not.equal(estimateTwo);
      });

      it("viewAssetsReturned() from non-zero supply should work", async () => {
        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 600000;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[2].curve.viewMeTokensMinted(
          balancedPooled,
          curves[2].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        let amountNum = supplyNum / 700;
        let amount = ethers.utils.parseEther(amountNum.toFixed(18));
        let estimate = await curves[2].curve.viewAssetsReturned(
          amount,
          curves[2].hubId,
          supply,
          balancedPooled
        );
        let calculatedRes = curves[2].calculateCollateralReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[2].precision * 30000
        );

        amountNum = supplyNum - supplyNum / 100;

        amount = ethers.utils.parseEther(amountNum.toFixed(18));
        // we need to have the right balancedPooled for supply
        balancedPooledNum = 400000000;
        balancedPooled = one.mul(balancedPooledNum);
        supply = await curves[2].curve.viewMeTokensMinted(
          balancedPooled,
          curves[2].hubId,
          0,
          0
        );
        supplyNum = toETHNumber(supply);
        estimate = await curves[2].curve.viewAssetsReturned(
          amount,
          curves[2].hubId,
          supply,
          balancedPooled
        );
        calculatedRes = curves[2].calculateCollateralReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[2].precision * 100000
        );
      });
      it("viewAssetsReturned() from 999999999999999000000000000000000 supply should work", async () => {
        let amount = one;
        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 999999999999999;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[2].curve.viewMeTokensMinted(
          balancedPooled,
          curves[2].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        let estimate = await curves[2].curve.viewAssetsReturned(
          amount,
          curves[2].hubId,
          supply,
          balancedPooled
        );
        const calculatedRes = curves[2].calculateCollateralReturned(
          1,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(calculatedRes, 0.2);
      });

      it("initReconfigure() should work", async () => {
        await curves[2].hub.initUpdate(
          curves[2].hubId,
          0,
          curves[2].targetReserveWeight
        );

        const info = await curves[2].curve.getCurveInfo(curves[2].hubId);
        curves[2].verifyCurveInfo([
          info[0],
          BigNumber.from(info[2]),
          info[1],

          BigNumber.from(info[3]),
        ]);
      });
      it("viewTargetMeTokensMinted() from 0 supply should work", async () => {
        let amount = one.mul(2);
        let estimate = await curves[2].curve.viewTargetMeTokensMinted(
          amount,
          curves[2].hubId,
          0,
          0
        );
        const calculatedRes = curves[2].calculateTargetTokenReturnedFromZero(
          2,
          0,
          0
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[2].precision * 100
        );
      });
      it("viewTargetMeTokensMinted() from non-zero supply should work", async () => {
        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 2;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[2].curve.viewTargetMeTokensMinted(
          balancedPooled,
          curves[2].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        const amountNum = supplyNum / 2;
        let amount = ethers.utils.parseEther(amountNum.toFixed(18));
        let estimate = await curves[2].curve.viewTargetMeTokensMinted(
          amount,
          curves[2].hubId,
          supply,
          balancedPooled
        );
        const calculatedRes = curves[2].calculateTargetTokenReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[2].precision
        );
      });
      it("viewTargetAssetsReturned() to 0 supply should work", async () => {
        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 2;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[2].curve.viewTargetMeTokensMinted(
          balancedPooled,
          curves[2].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        let estimate = await curves[2].curve.viewTargetAssetsReturned(
          supply,
          curves[2].hubId,
          supply,
          balancedPooled
        );
        const calculatedRes = curves[2].calculateTargetCollateralReturned(
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
        const supply = await curves[2].curve.viewTargetMeTokensMinted(
          balancedPooled,
          curves[2].hubId,
          0,
          0
        );
        const supplyNum = toETHNumber(supply);

        const amountNum = supplyNum / 2;
        let amount = ethers.utils.parseEther(amountNum.toFixed(18));
        let estimate = await curves[2].curve.viewTargetAssetsReturned(
          amount,
          curves[2].hubId,
          supply,
          balancedPooled
        );
        let calculatedRes = curves[2].calculateTargetCollateralReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[2].precision
        );
        const amountNum2 = supplyNum - supplyNum / 1000;
        let amount2 = ethers.utils.parseEther(amountNum2.toFixed(18));
        estimate = await curves[2].curve.viewTargetAssetsReturned(
          amount2,
          curves[2].hubId,
          supply,
          balancedPooled
        );
        calculatedRes = curves[2].calculateTargetCollateralReturned(
          amountNum2,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[2].precision
        );
      });
    });
    describe("Curve n°4", () => {
      it("Reverts w/ invalid parameters", async () => {
        await expect(
          curves[3].hub.initUpdate(curves[3].hubId, 0, 0)
        ).to.be.revertedWith("Nothing to update");
      });

      it("Reverts when same reserveWeight", async () => {
        const curveInfo = await curves[3].curve.getCurveInfo(curves[3].hubId);
        const tx = curves[3].hub.initUpdate(
          curves[3].hubId,
          0,
          curveInfo.reserveWeight
        );
        await expect(tx).to.be.revertedWith("targetWeight!=Weight");
      });

      it("Reverts w/ incorrect encodedCurveInfo", async () => {
        await expect(
          curves[3].hub.initUpdate(curves[3].hubId, 0, curves[3].hub.address)
        ).to.be.reverted;
      });
      it("Reverts w/ invalid encodedCurveInfo", async () => {
        // param must be > 0
        await expect(
          curves[3].hub.initUpdate(
            curves[3].hubId,
            0,
            ethers.constants.MaxUint256
          )
        ).to.be.reverted;
      });

      it("viewMeTokensMinted() should fail in some conditions", async () => {
        await expect(
          curves[3].curve.viewMeTokensMinted(1, curves[3].hubId, 1, 0)
        ).to.be.revertedWith("!valid"); // fails as balancePooled = 0
      });

      it("viewMeTokensMinted() from 0 supply should work", async () => {
        const etherAmount = 20;
        let amount = one.mul(etherAmount);
        let estimate = await curves[3].curve.viewMeTokensMinted(
          amount,
          curves[3].hubId,
          0,
          0
        );
        const calculatedReturn = curves[3].calculateTokenReturnedFromZero(
          etherAmount,
          0,
          0
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedReturn,
          curves[3].precision
        );
      });
      it("viewMeTokensMinted() for 0 assetsDeposited should return 0", async () => {
        expect(
          await curves[3].curve.viewMeTokensMinted(0, curves[3].hubId, 0, 0)
        ).to.equal(0);
        expect(
          await curves[3].curve.viewMeTokensMinted(0, curves[3].hubId, 1, 1)
        ).to.equal(0);
      });
      it("viewMeTokensMinted from non-zero supply should work", async () => {
        const amountNum = 2;
        let amount = one.mul(amountNum);

        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 1000;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[3].curve.viewMeTokensMinted(
          balancedPooled,
          curves[3].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        let estimate = await curves[3].curve.viewMeTokensMinted(
          amount,
          curves[3].hubId,
          supply,
          balancedPooled
        );
        let calculatedRes = curves[3].calculateTokenReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );

        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[3].precision //* 3
        );

        // we need to have the right balancedPooled for supply
        balancedPooledNum = 10000000;
        balancedPooled = one.mul(balancedPooledNum);
        supply = await curves[3].curve.viewMeTokensMinted(
          balancedPooled,
          curves[3].hubId,
          0,
          0
        );
        supplyNum = toETHNumber(supply);

        // balancedPooled = one.mul(4);
        estimate = await curves[3].curve.viewMeTokensMinted(
          amount,
          curves[3].hubId,
          supply,
          balancedPooled
        );
        calculatedRes = curves[3].calculateTokenReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[3].precision // *4
        );
      });

      it("viewMeTokensMinted() from 999999999999999 supply should work", async () => {
        let amount = one.mul(999999999999999);
        let estimate = await curves[3].curve.viewMeTokensMinted(
          amount,
          curves[3].hubId,
          0,
          0
        );
        const calculatedRes = curves[3].calculateTokenReturnedFromZero(
          999999999999999,
          0,
          0
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[3].precision // *4
        );
      });

      it("viewAssetsReturned() should fail in some conditions", async () => {
        await expect(
          curves[3].curve.viewAssetsReturned(1, curves[3].hubId, 0, 1)
        ).to.be.revertedWith("!valid"); // fails as supply = 0
        await expect(
          curves[3].curve.viewAssetsReturned(1, curves[3].hubId, 1, 0)
        ).to.be.revertedWith("!valid"); // fails as balancePooled = 0
      });

      it("viewAssetsReturned() from 0 supply should work", async () => {
        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 7568;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[3].curve.viewMeTokensMinted(
          balancedPooled,
          curves[3].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        const amountNum = supplyNum / 2;
        let amount = ethers.utils.parseEther(amountNum.toFixed(18));
        let estimate = await curves[3].curve.viewAssetsReturned(
          amount,
          curves[3].hubId,
          supply,
          balancedPooled
        );
        const calculatedRes = curves[3].calculateCollateralReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[3].precision
        );
      });
      it("viewMeTokensMinted should be linked to balance pooled", async () => {
        const amountNum = 2;
        let amount = one.mul(amountNum);

        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 1000;
        let balancedPooled = one.mul(balancedPooledNum);
        let supplyOne = await curves[3].curve.viewMeTokensMinted(
          balancedPooled,
          curves[3].hubId,
          0,
          0
        );

        // we need to have the right balancedPooled for supply
        balancedPooledNum = 10000000;
        balancedPooled = one.mul(balancedPooledNum);
        let supplyTwo = await curves[3].curve.viewMeTokensMinted(
          balancedPooled,
          curves[3].hubId,
          0,
          0
        );
        expect(supplyOne).to.not.equal(supplyTwo);
      });
      it("viewAssetsReturned() should be linked to balance pooled", async () => {
        // we need to have the right balancedPooled for supply
        let amount = 2;
        let balancedPooledNum = 600000;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[3].curve.viewMeTokensMinted(
          balancedPooled,
          curves[3].hubId,
          0,
          0
        );

        let estimateOne = await curves[3].curve.viewAssetsReturned(
          amount,
          curves[3].hubId,
          supply,
          balancedPooled
        );
        // amount = 9999999999;
        balancedPooledNum = 6;
        balancedPooled = one.mul(balancedPooledNum);
        //  supply = await curves[3].curve.viewMeTokensMinted(balancedPooled, curves[3].hubId, 0, 0);

        let estimateTwo = await curves[3].curve.viewAssetsReturned(
          amount,
          curves[3].hubId,
          supply,
          balancedPooled
        );
        expect(estimateOne).to.not.equal(estimateTwo);
      });

      it("viewAssetsReturned() from non-zero supply should work", async () => {
        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 600000;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[3].curve.viewMeTokensMinted(
          balancedPooled,
          curves[3].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        let amountNum = supplyNum / 700;
        let amount = ethers.utils.parseEther(amountNum.toFixed(18));
        let estimate = await curves[3].curve.viewAssetsReturned(
          amount,
          curves[3].hubId,
          supply,
          balancedPooled
        );
        let calculatedRes = curves[3].calculateCollateralReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[3].precision * 30000
        );

        amountNum = supplyNum - supplyNum / 100;

        amount = ethers.utils.parseEther(amountNum.toFixed(18));
        // we need to have the right balancedPooled for supply
        balancedPooledNum = 400000000;
        balancedPooled = one.mul(balancedPooledNum);
        supply = await curves[3].curve.viewMeTokensMinted(
          balancedPooled,
          curves[3].hubId,
          0,
          0
        );
        supplyNum = toETHNumber(supply);
        estimate = await curves[3].curve.viewAssetsReturned(
          amount,
          curves[3].hubId,
          supply,
          balancedPooled
        );
        calculatedRes = curves[3].calculateCollateralReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[3].precision * 100000
        );
      });
      it("viewAssetsReturned() from 999999999999999000000000000000000 supply should work", async () => {
        let amount = one;
        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 999999999999999;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[3].curve.viewMeTokensMinted(
          balancedPooled,
          curves[3].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        let estimate = await curves[3].curve.viewAssetsReturned(
          amount,
          curves[3].hubId,
          supply,
          balancedPooled
        );
        const calculatedRes = curves[3].calculateCollateralReturned(
          1,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(calculatedRes, 0.2);
      });

      it("initReconfigure() should work", async () => {
        await curves[3].hub.initUpdate(
          curves[3].hubId,
          0,
          curves[3].targetReserveWeight
        );

        const info = await curves[3].curve.getCurveInfo(curves[3].hubId);
        curves[3].verifyCurveInfo([
          info[0],
          BigNumber.from(info[2]),
          info[1],

          BigNumber.from(info[3]),
        ]);
      });
      it("viewTargetMeTokensMinted() from 0 supply should work", async () => {
        let amount = one.mul(2);
        let estimate = await curves[3].curve.viewTargetMeTokensMinted(
          amount,
          curves[3].hubId,
          0,
          0
        );
        const calculatedRes = curves[3].calculateTargetTokenReturnedFromZero(
          2,
          0,
          0
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[3].precision * 100
        );
      });
      it("viewTargetMeTokensMinted() from non-zero supply should work", async () => {
        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 2;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[3].curve.viewTargetMeTokensMinted(
          balancedPooled,
          curves[3].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        const amountNum = supplyNum / 2;
        let amount = ethers.utils.parseEther(amountNum.toFixed(18));
        let estimate = await curves[3].curve.viewTargetMeTokensMinted(
          amount,
          curves[3].hubId,
          supply,
          balancedPooled
        );
        const calculatedRes = curves[3].calculateTargetTokenReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[3].precision
        );
      });
      it("viewTargetAssetsReturned() to 0 supply should work", async () => {
        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 2;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[3].curve.viewTargetMeTokensMinted(
          balancedPooled,
          curves[3].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        let estimate = await curves[3].curve.viewTargetAssetsReturned(
          supply,
          curves[3].hubId,
          supply,
          balancedPooled
        );
        const calculatedRes = curves[3].calculateTargetCollateralReturned(
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
        const supply = await curves[3].curve.viewTargetMeTokensMinted(
          balancedPooled,
          curves[3].hubId,
          0,
          0
        );
        const supplyNum = toETHNumber(supply);

        const amountNum = supplyNum / 2;
        let amount = ethers.utils.parseEther(amountNum.toFixed(18));
        let estimate = await curves[3].curve.viewTargetAssetsReturned(
          amount,
          curves[3].hubId,
          supply,
          balancedPooled
        );
        let calculatedRes = curves[3].calculateTargetCollateralReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[3].precision
        );
        const amountNum2 = supplyNum - supplyNum / 1000;
        let amount2 = ethers.utils.parseEther(amountNum2.toFixed(18));
        estimate = await curves[3].curve.viewTargetAssetsReturned(
          amount2,
          curves[3].hubId,
          supply,
          balancedPooled
        );
        calculatedRes = curves[3].calculateTargetCollateralReturned(
          amountNum2,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[3].precision
        );
      });
    });
    describe("Curve n°5", () => {
      it("Reverts w/ invalid parameters", async () => {
        await expect(
          curves[4].hub.initUpdate(curves[4].hubId, 0, 0)
        ).to.be.revertedWith("Nothing to update");
      });

      it("Reverts when same reserveWeight", async () => {
        const curveInfo = await curves[4].curve.getCurveInfo(curves[4].hubId);
        const tx = curves[4].hub.initUpdate(
          curves[4].hubId,
          0,
          curveInfo.reserveWeight
        );
        await expect(tx).to.be.revertedWith("targetWeight!=Weight");
      });

      it("Reverts w/ incorrect encodedCurveInfo", async () => {
        await expect(
          curves[4].hub.initUpdate(curves[4].hubId, 0, curves[4].hub.address)
        ).to.be.reverted;
      });
      it("Reverts w/ invalid encodedCurveInfo", async () => {
        // param must be > 0
        await expect(
          curves[4].hub.initUpdate(
            curves[4].hubId,
            0,
            ethers.constants.MaxUint256
          )
        ).to.be.reverted;
      });

      it("viewMeTokensMinted() should fail in some conditions", async () => {
        await expect(
          curves[4].curve.viewMeTokensMinted(1, curves[4].hubId, 1, 0)
        ).to.be.revertedWith("!valid"); // fails as balancePooled = 0
      });

      it("viewMeTokensMinted() from 0 supply should work", async () => {
        const etherAmount = 20;
        let amount = one.mul(etherAmount);
        let estimate = await curves[4].curve.viewMeTokensMinted(
          amount,
          curves[4].hubId,
          0,
          0
        );
        const calculatedReturn = curves[4].calculateTokenReturnedFromZero(
          etherAmount,
          0,
          0
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedReturn,
          curves[4].precision
        );
      });
      it("viewMeTokensMinted() for 0 assetsDeposited should return 0", async () => {
        expect(
          await curves[4].curve.viewMeTokensMinted(0, curves[4].hubId, 0, 0)
        ).to.equal(0);
        expect(
          await curves[4].curve.viewMeTokensMinted(0, curves[4].hubId, 1, 1)
        ).to.equal(0);
      });
      it("viewMeTokensMinted from non-zero supply should work", async () => {
        const amountNum = 2;
        let amount = one.mul(amountNum);

        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 1000;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[4].curve.viewMeTokensMinted(
          balancedPooled,
          curves[4].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        let estimate = await curves[4].curve.viewMeTokensMinted(
          amount,
          curves[4].hubId,
          supply,
          balancedPooled
        );
        let calculatedRes = curves[4].calculateTokenReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );

        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[4].precision //* 3
        );

        // we need to have the right balancedPooled for supply
        balancedPooledNum = 10000000;
        balancedPooled = one.mul(balancedPooledNum);
        supply = await curves[4].curve.viewMeTokensMinted(
          balancedPooled,
          curves[4].hubId,
          0,
          0
        );
        supplyNum = toETHNumber(supply);

        // balancedPooled = one.mul(4);
        estimate = await curves[4].curve.viewMeTokensMinted(
          amount,
          curves[4].hubId,
          supply,
          balancedPooled
        );
        calculatedRes = curves[4].calculateTokenReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[4].precision // *4
        );
      });

      it("viewMeTokensMinted() from 999999999999999 supply should work", async () => {
        let amount = one.mul(999999999999999);
        let estimate = await curves[4].curve.viewMeTokensMinted(
          amount,
          curves[4].hubId,
          0,
          0
        );
        const calculatedRes = curves[4].calculateTokenReturnedFromZero(
          999999999999999,
          0,
          0
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[4].precision // *4
        );
      });

      it("viewAssetsReturned() should fail in some conditions", async () => {
        await expect(
          curves[4].curve.viewAssetsReturned(1, curves[4].hubId, 0, 1)
        ).to.be.revertedWith("!valid"); // fails as supply = 0
        await expect(
          curves[4].curve.viewAssetsReturned(1, curves[4].hubId, 1, 0)
        ).to.be.revertedWith("!valid"); // fails as balancePooled = 0
      });

      it("viewAssetsReturned() from 0 supply should work", async () => {
        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 7568;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[4].curve.viewMeTokensMinted(
          balancedPooled,
          curves[4].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        const amountNum = supplyNum / 2;
        let amount = ethers.utils.parseEther(amountNum.toFixed(18));
        let estimate = await curves[4].curve.viewAssetsReturned(
          amount,
          curves[4].hubId,
          supply,
          balancedPooled
        );
        const calculatedRes = curves[4].calculateCollateralReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[4].precision
        );
      });
      it("viewMeTokensMinted should be linked to balance pooled", async () => {
        const amountNum = 2;
        let amount = one.mul(amountNum);

        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 1000;
        let balancedPooled = one.mul(balancedPooledNum);
        let supplyOne = await curves[4].curve.viewMeTokensMinted(
          balancedPooled,
          curves[4].hubId,
          0,
          0
        );

        // we need to have the right balancedPooled for supply
        balancedPooledNum = 10000000;
        balancedPooled = one.mul(balancedPooledNum);
        let supplyTwo = await curves[4].curve.viewMeTokensMinted(
          balancedPooled,
          curves[4].hubId,
          0,
          0
        );
        expect(supplyOne).to.not.equal(supplyTwo);
      });
      it("viewAssetsReturned() should be linked to balance pooled", async () => {
        // we need to have the right balancedPooled for supply
        let amount = 2;
        let balancedPooledNum = 600000;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[4].curve.viewMeTokensMinted(
          balancedPooled,
          curves[4].hubId,
          0,
          0
        );

        let estimateOne = await curves[4].curve.viewAssetsReturned(
          amount,
          curves[4].hubId,
          supply,
          balancedPooled
        );
        // amount = 9999999999;
        balancedPooledNum = 6;
        balancedPooled = one.mul(balancedPooledNum);
        //  supply = await curves[4].curve.viewMeTokensMinted(balancedPooled, curves[4].hubId, 0, 0);

        let estimateTwo = await curves[4].curve.viewAssetsReturned(
          amount,
          curves[4].hubId,
          supply,
          balancedPooled
        );
        expect(estimateOne).to.not.equal(estimateTwo);
      });

      it("viewAssetsReturned() from non-zero supply should work", async () => {
        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 600000;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[4].curve.viewMeTokensMinted(
          balancedPooled,
          curves[4].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        let amountNum = supplyNum / 700;
        let amount = ethers.utils.parseEther(amountNum.toFixed(18));
        let estimate = await curves[4].curve.viewAssetsReturned(
          amount,
          curves[4].hubId,
          supply,
          balancedPooled
        );
        let calculatedRes = curves[4].calculateCollateralReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[4].precision * 30000
        );

        amountNum = supplyNum - supplyNum / 100;

        amount = ethers.utils.parseEther(amountNum.toFixed(18));
        // we need to have the right balancedPooled for supply
        balancedPooledNum = 400000000;
        balancedPooled = one.mul(balancedPooledNum);
        supply = await curves[4].curve.viewMeTokensMinted(
          balancedPooled,
          curves[4].hubId,
          0,
          0
        );
        supplyNum = toETHNumber(supply);
        estimate = await curves[4].curve.viewAssetsReturned(
          amount,
          curves[4].hubId,
          supply,
          balancedPooled
        );
        calculatedRes = curves[4].calculateCollateralReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[4].precision * 100000
        );
      });
      it("viewAssetsReturned() from 999999999999999000000000000000000 supply should work", async () => {
        let amount = one;
        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 999999999999999;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[4].curve.viewMeTokensMinted(
          balancedPooled,
          curves[4].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        let estimate = await curves[4].curve.viewAssetsReturned(
          amount,
          curves[4].hubId,
          supply,
          balancedPooled
        );
        const calculatedRes = curves[4].calculateCollateralReturned(
          1,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(calculatedRes, 0.2);
      });

      it("initReconfigure() should work", async () => {
        await curves[4].hub.initUpdate(
          curves[4].hubId,
          0,
          curves[4].targetReserveWeight
        );

        const info = await curves[4].curve.getCurveInfo(curves[4].hubId);
        curves[4].verifyCurveInfo([
          info[0],
          BigNumber.from(info[2]),
          info[1],

          BigNumber.from(info[3]),
        ]);
      });
      it("viewTargetMeTokensMinted() from 0 supply should work", async () => {
        let amount = one.mul(2);
        let estimate = await curves[4].curve.viewTargetMeTokensMinted(
          amount,
          curves[4].hubId,
          0,
          0
        );
        const calculatedRes = curves[4].calculateTargetTokenReturnedFromZero(
          2,
          0,
          0
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[4].precision * 100
        );
      });
      it("viewTargetMeTokensMinted() from non-zero supply should work", async () => {
        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 2;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[4].curve.viewTargetMeTokensMinted(
          balancedPooled,
          curves[4].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        const amountNum = supplyNum / 2;
        let amount = ethers.utils.parseEther(amountNum.toFixed(18));
        let estimate = await curves[4].curve.viewTargetMeTokensMinted(
          amount,
          curves[4].hubId,
          supply,
          balancedPooled
        );
        const calculatedRes = curves[4].calculateTargetTokenReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[4].precision
        );
      });
      it("viewTargetAssetsReturned() to 0 supply should work", async () => {
        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 2;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[4].curve.viewTargetMeTokensMinted(
          balancedPooled,
          curves[4].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        let estimate = await curves[4].curve.viewTargetAssetsReturned(
          supply,
          curves[4].hubId,
          supply,
          balancedPooled
        );
        const calculatedRes = curves[4].calculateTargetCollateralReturned(
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
        const supply = await curves[4].curve.viewTargetMeTokensMinted(
          balancedPooled,
          curves[4].hubId,
          0,
          0
        );
        const supplyNum = toETHNumber(supply);

        const amountNum = supplyNum / 2;
        let amount = ethers.utils.parseEther(amountNum.toFixed(18));
        let estimate = await curves[4].curve.viewTargetAssetsReturned(
          amount,
          curves[4].hubId,
          supply,
          balancedPooled
        );
        let calculatedRes = curves[4].calculateTargetCollateralReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[4].precision
        );
        const amountNum2 = supplyNum - supplyNum / 1000;
        let amount2 = ethers.utils.parseEther(amountNum2.toFixed(18));
        estimate = await curves[4].curve.viewTargetAssetsReturned(
          amount2,
          curves[4].hubId,
          supply,
          balancedPooled
        );
        calculatedRes = curves[4].calculateTargetCollateralReturned(
          amountNum2,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[4].precision
        );
      });
    });
    describe("Curve n°6", () => {
      it("Reverts w/ invalid parameters", async () => {
        await expect(
          curves[5].hub.initUpdate(curves[5].hubId, 0, 0)
        ).to.be.revertedWith("Nothing to update");
      });

      it("Reverts when same reserveWeight", async () => {
        const curveInfo = await curves[5].curve.getCurveInfo(curves[5].hubId);
        const tx = curves[5].hub.initUpdate(
          curves[5].hubId,
          0,
          curveInfo.reserveWeight
        );
        await expect(tx).to.be.revertedWith("targetWeight!=Weight");
      });

      it("Reverts w/ incorrect encodedCurveInfo", async () => {
        await expect(
          curves[5].hub.initUpdate(curves[5].hubId, 0, curves[5].hub.address)
        ).to.be.reverted;
      });
      it("Reverts w/ invalid encodedCurveInfo", async () => {
        // param must be > 0
        await expect(
          curves[5].hub.initUpdate(
            curves[5].hubId,
            0,
            ethers.constants.MaxUint256
          )
        ).to.be.reverted;
      });

      it("viewMeTokensMinted() should fail in some conditions", async () => {
        await expect(
          curves[5].curve.viewMeTokensMinted(1, curves[5].hubId, 1, 0)
        ).to.be.revertedWith("!valid"); // fails as balancePooled = 0
      });

      it("viewMeTokensMinted() from 0 supply should work", async () => {
        const etherAmount = 20;
        let amount = one.mul(etherAmount);
        let estimate = await curves[5].curve.viewMeTokensMinted(
          amount,
          curves[5].hubId,
          0,
          0
        );
        const calculatedReturn = curves[5].calculateTokenReturnedFromZero(
          etherAmount,
          0,
          0
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedReturn,
          curves[5].precision
        );
      });
      it("viewMeTokensMinted() for 0 assetsDeposited should return 0", async () => {
        expect(
          await curves[5].curve.viewMeTokensMinted(0, curves[5].hubId, 0, 0)
        ).to.equal(0);
        expect(
          await curves[5].curve.viewMeTokensMinted(0, curves[5].hubId, 1, 1)
        ).to.equal(0);
      });
      it("viewMeTokensMinted from non-zero supply should work", async () => {
        const amountNum = 2;
        let amount = one.mul(amountNum);

        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 1000;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[5].curve.viewMeTokensMinted(
          balancedPooled,
          curves[5].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        let estimate = await curves[5].curve.viewMeTokensMinted(
          amount,
          curves[5].hubId,
          supply,
          balancedPooled
        );
        let calculatedRes = curves[5].calculateTokenReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );

        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[5].precision //* 3
        );

        // we need to have the right balancedPooled for supply
        balancedPooledNum = 10000000;
        balancedPooled = one.mul(balancedPooledNum);
        supply = await curves[5].curve.viewMeTokensMinted(
          balancedPooled,
          curves[5].hubId,
          0,
          0
        );
        supplyNum = toETHNumber(supply);

        // balancedPooled = one.mul(4);
        estimate = await curves[5].curve.viewMeTokensMinted(
          amount,
          curves[5].hubId,
          supply,
          balancedPooled
        );
        calculatedRes = curves[5].calculateTokenReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[5].precision // *4
        );
      });

      it("viewMeTokensMinted() from 999999999999999 supply should work", async () => {
        let amount = one.mul(999999999999999);
        let estimate = await curves[5].curve.viewMeTokensMinted(
          amount,
          curves[5].hubId,
          0,
          0
        );
        const calculatedRes = curves[5].calculateTokenReturnedFromZero(
          999999999999999,
          0,
          0
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[5].precision // *4
        );
      });

      it("viewAssetsReturned() should fail in some conditions", async () => {
        await expect(
          curves[5].curve.viewAssetsReturned(1, curves[5].hubId, 0, 1)
        ).to.be.revertedWith("!valid"); // fails as supply = 0
        await expect(
          curves[5].curve.viewAssetsReturned(1, curves[5].hubId, 1, 0)
        ).to.be.revertedWith("!valid"); // fails as balancePooled = 0
      });

      it("viewAssetsReturned() from 0 supply should work", async () => {
        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 7568;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[5].curve.viewMeTokensMinted(
          balancedPooled,
          curves[5].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        const amountNum = supplyNum / 2;
        let amount = ethers.utils.parseEther(amountNum.toFixed(18));
        let estimate = await curves[5].curve.viewAssetsReturned(
          amount,
          curves[5].hubId,
          supply,
          balancedPooled
        );
        const calculatedRes = curves[5].calculateCollateralReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[5].precision
        );
      });
      it("viewMeTokensMinted should be linked to balance pooled", async () => {
        const amountNum = 2;
        let amount = one.mul(amountNum);

        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 1000;
        let balancedPooled = one.mul(balancedPooledNum);
        let supplyOne = await curves[5].curve.viewMeTokensMinted(
          balancedPooled,
          curves[5].hubId,
          0,
          0
        );

        // we need to have the right balancedPooled for supply
        balancedPooledNum = 10000000;
        balancedPooled = one.mul(balancedPooledNum);
        let supplyTwo = await curves[5].curve.viewMeTokensMinted(
          balancedPooled,
          curves[5].hubId,
          0,
          0
        );
        expect(supplyOne).to.not.equal(supplyTwo);
      });
      it("viewAssetsReturned() should be linked to balance pooled", async () => {
        // we need to have the right balancedPooled for supply
        let amount = 2;
        let balancedPooledNum = 600000;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[5].curve.viewMeTokensMinted(
          balancedPooled,
          curves[5].hubId,
          0,
          0
        );

        let estimateOne = await curves[5].curve.viewAssetsReturned(
          amount,
          curves[5].hubId,
          supply,
          balancedPooled
        );
        // amount = 9999999999;
        balancedPooledNum = 6;
        balancedPooled = one.mul(balancedPooledNum);
        //  supply = await curves[5].curve.viewMeTokensMinted(balancedPooled, curves[5].hubId, 0, 0);

        let estimateTwo = await curves[5].curve.viewAssetsReturned(
          amount,
          curves[5].hubId,
          supply,
          balancedPooled
        );
        expect(estimateOne).to.not.equal(estimateTwo);
      });

      it("viewAssetsReturned() from non-zero supply should work", async () => {
        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 600000;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[5].curve.viewMeTokensMinted(
          balancedPooled,
          curves[5].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        let amountNum = supplyNum / 700;
        let amount = ethers.utils.parseEther(amountNum.toFixed(18));
        let estimate = await curves[5].curve.viewAssetsReturned(
          amount,
          curves[5].hubId,
          supply,
          balancedPooled
        );
        let calculatedRes = curves[5].calculateCollateralReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[5].precision * 30000
        );

        amountNum = supplyNum - supplyNum / 100;

        amount = ethers.utils.parseEther(amountNum.toFixed(18));
        // we need to have the right balancedPooled for supply
        balancedPooledNum = 400000000;
        balancedPooled = one.mul(balancedPooledNum);
        supply = await curves[5].curve.viewMeTokensMinted(
          balancedPooled,
          curves[5].hubId,
          0,
          0
        );
        supplyNum = toETHNumber(supply);
        estimate = await curves[5].curve.viewAssetsReturned(
          amount,
          curves[5].hubId,
          supply,
          balancedPooled
        );
        calculatedRes = curves[5].calculateCollateralReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[5].precision * 100000
        );
      });
      it("viewAssetsReturned() from 999999999999999000000000000000000 supply should work", async () => {
        let amount = one;
        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 999999999999999;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[5].curve.viewMeTokensMinted(
          balancedPooled,
          curves[5].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        let estimate = await curves[5].curve.viewAssetsReturned(
          amount,
          curves[5].hubId,
          supply,
          balancedPooled
        );
        const calculatedRes = curves[5].calculateCollateralReturned(
          1,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(calculatedRes, 0.2);
      });

      it("initReconfigure() should work", async () => {
        await curves[5].hub.initUpdate(
          curves[5].hubId,
          0,
          curves[5].targetReserveWeight
        );

        const info = await curves[5].curve.getCurveInfo(curves[5].hubId);
        curves[5].verifyCurveInfo([
          info[0],
          BigNumber.from(info[2]),
          info[1],

          BigNumber.from(info[3]),
        ]);
      });
      it("viewTargetMeTokensMinted() from 0 supply should work", async () => {
        let amount = one.mul(2);
        let estimate = await curves[5].curve.viewTargetMeTokensMinted(
          amount,
          curves[5].hubId,
          0,
          0
        );
        const calculatedRes = curves[5].calculateTargetTokenReturnedFromZero(
          2,
          0,
          0
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[5].precision * 100
        );
      });
      it("viewTargetMeTokensMinted() from non-zero supply should work", async () => {
        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 2;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[5].curve.viewTargetMeTokensMinted(
          balancedPooled,
          curves[5].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        const amountNum = supplyNum / 2;
        let amount = ethers.utils.parseEther(amountNum.toFixed(18));
        let estimate = await curves[5].curve.viewTargetMeTokensMinted(
          amount,
          curves[5].hubId,
          supply,
          balancedPooled
        );
        const calculatedRes = curves[5].calculateTargetTokenReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[5].precision
        );
      });
      it("viewTargetAssetsReturned() to 0 supply should work", async () => {
        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 2;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[5].curve.viewTargetMeTokensMinted(
          balancedPooled,
          curves[5].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        let estimate = await curves[5].curve.viewTargetAssetsReturned(
          supply,
          curves[5].hubId,
          supply,
          balancedPooled
        );
        const calculatedRes = curves[5].calculateTargetCollateralReturned(
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
        const supply = await curves[5].curve.viewTargetMeTokensMinted(
          balancedPooled,
          curves[5].hubId,
          0,
          0
        );
        const supplyNum = toETHNumber(supply);

        const amountNum = supplyNum / 2;
        let amount = ethers.utils.parseEther(amountNum.toFixed(18));
        let estimate = await curves[5].curve.viewTargetAssetsReturned(
          amount,
          curves[5].hubId,
          supply,
          balancedPooled
        );
        let calculatedRes = curves[5].calculateTargetCollateralReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[5].precision
        );
        const amountNum2 = supplyNum - supplyNum / 1000;
        let amount2 = ethers.utils.parseEther(amountNum2.toFixed(18));
        estimate = await curves[5].curve.viewTargetAssetsReturned(
          amount2,
          curves[5].hubId,
          supply,
          balancedPooled
        );
        calculatedRes = curves[5].calculateTargetCollateralReturned(
          amountNum2,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[5].precision
        );
      });
    });
    describe("Curve n°7", () => {
      it("Reverts w/ invalid parameters", async () => {
        await expect(
          curves[6].hub.initUpdate(curves[6].hubId, 0, 0)
        ).to.be.revertedWith("Nothing to update");
      });

      it("Reverts when same reserveWeight", async () => {
        const curveInfo = await curves[6].curve.getCurveInfo(curves[6].hubId);
        const tx = curves[6].hub.initUpdate(
          curves[6].hubId,
          0,
          curveInfo.reserveWeight
        );
        await expect(tx).to.be.revertedWith("targetWeight!=Weight");
      });

      it("Reverts w/ incorrect encodedCurveInfo", async () => {
        await expect(
          curves[6].hub.initUpdate(curves[6].hubId, 0, curves[6].hub.address)
        ).to.be.reverted;
      });
      it("Reverts w/ invalid encodedCurveInfo", async () => {
        // param must be > 0
        await expect(
          curves[6].hub.initUpdate(
            curves[6].hubId,
            0,
            ethers.constants.MaxUint256
          )
        ).to.be.reverted;
      });

      it("viewMeTokensMinted() should fail in some conditions", async () => {
        await expect(
          curves[6].curve.viewMeTokensMinted(1, curves[6].hubId, 1, 0)
        ).to.be.revertedWith("!valid"); // fails as balancePooled = 0
      });

      it("viewMeTokensMinted() from 0 supply should work", async () => {
        const etherAmount = 20;
        let amount = one.mul(etherAmount);
        let estimate = await curves[6].curve.viewMeTokensMinted(
          amount,
          curves[6].hubId,
          0,
          0
        );
        const calculatedReturn = curves[6].calculateTokenReturnedFromZero(
          etherAmount,
          0,
          0
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedReturn,
          curves[6].precision
        );
      });
      it("viewMeTokensMinted() for 0 assetsDeposited should return 0", async () => {
        expect(
          await curves[6].curve.viewMeTokensMinted(0, curves[6].hubId, 0, 0)
        ).to.equal(0);
        expect(
          await curves[6].curve.viewMeTokensMinted(0, curves[6].hubId, 1, 1)
        ).to.equal(0);
      });
      it("viewMeTokensMinted from non-zero supply should work", async () => {
        const amountNum = 2;
        let amount = one.mul(amountNum);

        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 1000;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[6].curve.viewMeTokensMinted(
          balancedPooled,
          curves[6].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        let estimate = await curves[6].curve.viewMeTokensMinted(
          amount,
          curves[6].hubId,
          supply,
          balancedPooled
        );
        let calculatedRes = curves[6].calculateTokenReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );

        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[6].precision //* 3
        );

        // we need to have the right balancedPooled for supply
        balancedPooledNum = 10000000;
        balancedPooled = one.mul(balancedPooledNum);
        supply = await curves[6].curve.viewMeTokensMinted(
          balancedPooled,
          curves[6].hubId,
          0,
          0
        );
        supplyNum = toETHNumber(supply);

        // balancedPooled = one.mul(4);
        estimate = await curves[6].curve.viewMeTokensMinted(
          amount,
          curves[6].hubId,
          supply,
          balancedPooled
        );
        calculatedRes = curves[6].calculateTokenReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[6].precision // *4
        );
      });

      it("viewMeTokensMinted() from 999999999999999 supply should work", async () => {
        let amount = one.mul(999999999999999);
        let estimate = await curves[6].curve.viewMeTokensMinted(
          amount,
          curves[6].hubId,
          0,
          0
        );
        const calculatedRes = curves[6].calculateTokenReturnedFromZero(
          999999999999999,
          0,
          0
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[6].precision // *4
        );
      });

      it("viewAssetsReturned() should fail in some conditions", async () => {
        await expect(
          curves[6].curve.viewAssetsReturned(1, curves[6].hubId, 0, 1)
        ).to.be.revertedWith("!valid"); // fails as supply = 0
        await expect(
          curves[6].curve.viewAssetsReturned(1, curves[6].hubId, 1, 0)
        ).to.be.revertedWith("!valid"); // fails as balancePooled = 0
      });

      it("viewAssetsReturned() from 0 supply should work", async () => {
        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 7568;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[6].curve.viewMeTokensMinted(
          balancedPooled,
          curves[6].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        const amountNum = supplyNum / 2;
        let amount = ethers.utils.parseEther(amountNum.toFixed(18));
        let estimate = await curves[6].curve.viewAssetsReturned(
          amount,
          curves[6].hubId,
          supply,
          balancedPooled
        );
        const calculatedRes = curves[6].calculateCollateralReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[6].precision
        );
      });
      it("viewMeTokensMinted should be linked to balance pooled", async () => {
        const amountNum = 2;
        let amount = one.mul(amountNum);

        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 1000;
        let balancedPooled = one.mul(balancedPooledNum);
        let supplyOne = await curves[6].curve.viewMeTokensMinted(
          balancedPooled,
          curves[6].hubId,
          0,
          0
        );

        // we need to have the right balancedPooled for supply
        balancedPooledNum = 10000000;
        balancedPooled = one.mul(balancedPooledNum);
        let supplyTwo = await curves[6].curve.viewMeTokensMinted(
          balancedPooled,
          curves[6].hubId,
          0,
          0
        );
        expect(supplyOne).to.not.equal(supplyTwo);
      });
      it("viewAssetsReturned() should be linked to balance pooled", async () => {
        // we need to have the right balancedPooled for supply
        let amount = 2;
        let balancedPooledNum = 600000;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[6].curve.viewMeTokensMinted(
          balancedPooled,
          curves[6].hubId,
          0,
          0
        );

        let estimateOne = await curves[6].curve.viewAssetsReturned(
          amount,
          curves[6].hubId,
          supply,
          balancedPooled
        );
        // amount = 9999999999;
        balancedPooledNum = 6;
        balancedPooled = one.mul(balancedPooledNum);
        //  supply = await curves[6].curve.viewMeTokensMinted(balancedPooled, curves[6].hubId, 0, 0);

        let estimateTwo = await curves[6].curve.viewAssetsReturned(
          amount,
          curves[6].hubId,
          supply,
          balancedPooled
        );
        expect(estimateOne).to.not.equal(estimateTwo);
      });

      it("viewAssetsReturned() from non-zero supply should work", async () => {
        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 600000;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[6].curve.viewMeTokensMinted(
          balancedPooled,
          curves[6].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        let amountNum = supplyNum / 700;
        let amount = ethers.utils.parseEther(amountNum.toFixed(18));
        let estimate = await curves[6].curve.viewAssetsReturned(
          amount,
          curves[6].hubId,
          supply,
          balancedPooled
        );
        let calculatedRes = curves[6].calculateCollateralReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[6].precision * 30000
        );

        amountNum = supplyNum - supplyNum / 100;

        amount = ethers.utils.parseEther(amountNum.toFixed(18));
        // we need to have the right balancedPooled for supply
        balancedPooledNum = 400000000;
        balancedPooled = one.mul(balancedPooledNum);
        supply = await curves[6].curve.viewMeTokensMinted(
          balancedPooled,
          curves[6].hubId,
          0,
          0
        );
        supplyNum = toETHNumber(supply);
        estimate = await curves[6].curve.viewAssetsReturned(
          amount,
          curves[6].hubId,
          supply,
          balancedPooled
        );
        calculatedRes = curves[6].calculateCollateralReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[6].precision * 100000
        );
      });
      it("viewAssetsReturned() from 999999999999999000000000000000000 supply should work", async () => {
        let amount = one;
        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 999999999999999;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[6].curve.viewMeTokensMinted(
          balancedPooled,
          curves[6].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        let estimate = await curves[6].curve.viewAssetsReturned(
          amount,
          curves[6].hubId,
          supply,
          balancedPooled
        );
        const calculatedRes = curves[6].calculateCollateralReturned(
          1,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(calculatedRes, 0.2);
      });

      it("initReconfigure() should work", async () => {
        await curves[6].hub.initUpdate(
          curves[6].hubId,
          0,
          curves[6].targetReserveWeight
        );

        const info = await curves[6].curve.getCurveInfo(curves[6].hubId);
        curves[6].verifyCurveInfo([
          info[0],
          BigNumber.from(info[2]),
          info[1],

          BigNumber.from(info[3]),
        ]);
      });
      it("viewTargetMeTokensMinted() from 0 supply should work", async () => {
        let amount = one.mul(2);
        let estimate = await curves[6].curve.viewTargetMeTokensMinted(
          amount,
          curves[6].hubId,
          0,
          0
        );
        const calculatedRes = curves[6].calculateTargetTokenReturnedFromZero(
          2,
          0,
          0
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[6].precision * 100
        );
      });
      it("viewTargetMeTokensMinted() from non-zero supply should work", async () => {
        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 2;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[6].curve.viewTargetMeTokensMinted(
          balancedPooled,
          curves[6].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        const amountNum = supplyNum / 2;
        let amount = ethers.utils.parseEther(amountNum.toFixed(18));
        let estimate = await curves[6].curve.viewTargetMeTokensMinted(
          amount,
          curves[6].hubId,
          supply,
          balancedPooled
        );
        const calculatedRes = curves[6].calculateTargetTokenReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[6].precision
        );
      });
      it("viewTargetAssetsReturned() to 0 supply should work", async () => {
        // we need to have the right balancedPooled for supply
        let balancedPooledNum = 2;
        let balancedPooled = one.mul(balancedPooledNum);
        let supply = await curves[6].curve.viewTargetMeTokensMinted(
          balancedPooled,
          curves[6].hubId,
          0,
          0
        );
        let supplyNum = toETHNumber(supply);
        let estimate = await curves[6].curve.viewTargetAssetsReturned(
          supply,
          curves[6].hubId,
          supply,
          balancedPooled
        );
        const calculatedRes = curves[6].calculateTargetCollateralReturned(
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
        const supply = await curves[6].curve.viewTargetMeTokensMinted(
          balancedPooled,
          curves[6].hubId,
          0,
          0
        );
        const supplyNum = toETHNumber(supply);

        const amountNum = supplyNum / 2;
        let amount = ethers.utils.parseEther(amountNum.toFixed(18));
        let estimate = await curves[6].curve.viewTargetAssetsReturned(
          amount,
          curves[6].hubId,
          supply,
          balancedPooled
        );
        let calculatedRes = curves[6].calculateTargetCollateralReturned(
          amountNum,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[6].precision
        );
        const amountNum2 = supplyNum - supplyNum / 1000;
        let amount2 = ethers.utils.parseEther(amountNum2.toFixed(18));
        estimate = await curves[6].curve.viewTargetAssetsReturned(
          amount2,
          curves[6].hubId,
          supply,
          balancedPooled
        );
        calculatedRes = curves[6].calculateTargetCollateralReturned(
          amountNum2,
          supplyNum,
          balancedPooledNum
        );
        expect(toETHNumber(estimate)).to.be.approximately(
          calculatedRes,
          curves[6].precision
        );
      });
    });
  });
};

setup().then(() => {
  run();
});
