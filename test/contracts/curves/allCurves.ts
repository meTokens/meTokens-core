import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, getNamedAccounts } from "hardhat";
import { getCalculationFuncsForBancorCurves } from "../../utils/helpers";
import { addHubSetup, hubSetup } from "../../utils/hubSetup";
import { curvesTestsHelper } from "./helper/curvesTestsHelper";
import {
  Diamond,
  HubFacet,
  VaultRegistry,
  ICurveFacet,
} from "../../../artifacts/types";
import { BigNumber } from "ethers";

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

  ({ DAI } = await getNamedAccounts());
  let encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
    ["address"],
    [DAI]
  );

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

  // stepwise ABDK curves /* // First stepwise curve let stepX = 4; let stepY = 2; addArgs[3] = "StepwiseCurve"; addArgs[6] = ethers.utils.defaultAbiCoder.encode( ["uint256", "uint256"], [one.mul(stepX), one.mul(stepY)] ); addArgs[10] = undefined; let targetStepX = 8; let targetStepY = 15; hubInfo = await addHubSetup(...addArgs); const stepwiseCurve = await getCurve("StepwiseCurve", diamond.address); await curveRegistry.approve(stepwiseCurve.address); //testCurve.newCurve = stepwiseCurve as unknown as ICurve; //testCurve.curve = hubInfo.curve; curves.push({ ...testCurve, hubId: hubInfo.hubId, ...getCalculationFuncsForStepwiseCurves( stepX, stepY, targetStepX, targetStepY ), targetReserveWeight: ethers.utils.defaultAbiCoder.encode( ["uint256", "uint256"], [one.mul(targetStepX).toString(), one.mul(targetStepY).toString()] ), }); // Second stepwise curve stepX = 5; stepY = 6; addArgs[10] = hubInfo.curve; addArgs[6] = ethers.utils.defaultAbiCoder.encode( ["uint256", "uint256"], [one.mul(stepX), one.mul(stepY)] ); targetStepX = 4; targetStepY = 2; hubInfo = await addHubSetup(...addArgs); //testCurve.curve = hubInfo.curve; curves.push({ ...testCurve, hubId: hubInfo.hubId, ...getCalculationFuncsForStepwiseCurves( stepX, stepY, targetStepX, targetStepY ), targetReserveWeight: ethers.utils.defaultAbiCoder.encode( ["uint256", "uint256"], [one.mul(targetStepX).toString(), one.mul(targetStepY).toString()] ), }); // third stepwise curve stepX = 4568; stepY = 600; addArgs[6] = ethers.utils.defaultAbiCoder.encode( ["uint256", "uint256"], [one.mul(stepX), one.mul(stepY)] ); targetStepX = 40000; targetStepY = 2; hubInfo = await addHubSetup(...addArgs); //testCurve.curve = hubInfo.curve; curves.push({ ...testCurve, hubId: hubInfo.hubId, ...getCalculationFuncsForStepwiseCurves( stepX, stepY, targetStepX, targetStepY ), targetReserveWeight: ethers.utils.defaultAbiCoder.encode( ["uint256", "uint256"], [one.mul(targetStepX).toString(), one.mul(targetStepY).toString()] ), }); // fourth stepwise curve stepX = 468; stepY = 60; addArgs[6] = ethers.utils.defaultAbiCoder.encode( ["uint256", "uint256"], [one.mul(stepX), one.mul(stepY)] ); targetStepX = 12345; targetStepY = 256; hubInfo = await addHubSetup(...addArgs); curves.push({ ...testCurve, hubId: hubInfo.hubId, ...getCalculationFuncsForStepwiseCurves( stepX, stepY, targetStepX, targetStepY ), targetReserveWeight: ethers.utils.defaultAbiCoder.encode( ["uint256", "uint256"], [one.mul(targetStepX).toString(), one.mul(targetStepY).toString()] ), }); // fifth stepwise curve stepX = 468; stepY = 600; addArgs[6] = ethers.utils.defaultAbiCoder.encode( ["uint256", "uint256"], [one.mul(stepX), one.mul(stepY)] ); targetStepX = 12345; targetStepY = 956; hubInfo = await addHubSetup(...addArgs); curves.push({ ...testCurve, hubId: hubInfo.hubId, ...getCalculationFuncsForStepwiseCurves( stepX, stepY, targetStepX, targetStepY ), targetReserveWeight: ethers.utils.defaultAbiCoder.encode( ["uint256", "uint256"], [one.mul(targetStepX).toString(), one.mul(targetStepY).toString()] ), }); // sixth stepwise curve stepX = 12345000000000; stepY = 956; addArgs[6] = ethers.utils.defaultAbiCoder.encode( ["uint256", "uint256"], [one.mul(stepX), one.mul(stepY)] ); targetStepX = 12345000000001; targetStepY = 957; hubInfo = await addHubSetup(...addArgs); curves.push({ ...testCurve, hubId: hubInfo.hubId, ...getCalculationFuncsForStepwiseCurves( stepX, stepY, targetStepX, targetStepY ), targetReserveWeight: ethers.utils.defaultAbiCoder.encode( ["uint256", "uint256"], [one.mul(targetStepX).toString(), one.mul(targetStepY).toString()] ), }); */
  return curves;
};

setup().then((tests) => {
  tests.forEach(async (args, index) => {
    await curvesTestsHelper(args, index);
  });

  run();
});
