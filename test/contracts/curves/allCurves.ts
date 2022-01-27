import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, getNamedAccounts } from "hardhat";
import { CurveRegistry } from "../../../artifacts/types/CurveRegistry";
import { ERC20 } from "../../../artifacts/types/ERC20";
import { Foundry } from "../../../artifacts/types/Foundry";
import { HubFacet } from "../../../artifacts/types/HubFacet";
import { MeTokenFactory } from "../../../artifacts/types/MeTokenFactory";
import { MeTokenRegistry } from "../../../artifacts/types/MeTokenRegistry";
import { WeightedAverage } from "../../../artifacts/types/WeightedAverage";
import { VaultRegistry } from "../../../artifacts/types/VaultRegistry";
import {
  calculateCollateralReturned,
  calculateTokenReturned,
  calculateTokenReturnedFromZero,
  deploy,
  getCalculationFuncsForBancorCurves,
  getCalculationFuncsForStepwiseCurves,
  toETHNumber,
} from "../../utils/helpers";
import { MigrationRegistry } from "../../../artifacts/types/MigrationRegistry";
import { addHubSetup, hubSetup } from "../../utils/hubSetup";
import { BancorABDK } from "../../../artifacts/types/BancorABDK";
import { StepwiseCurveABDK } from "../../../artifacts/types/StepwiseCurveABDK";
import { curvesTestsHelper } from "./helper/curvesTestsHelper";
import { BancorPower } from "../../../artifacts/types/BancorPower";
import { ICurve } from "../../../artifacts/types/ICurve";
import { Diamond } from "../../../artifacts/types";

describe("All curves", () => {
  before("setup curves instance", async () => {});
});
const setup = async () => {
  let curves = new Array();
  let DAI: string;
  let meTokenRegistry: MeTokenRegistry;
  let curveRegistry: CurveRegistry;
  let vaultRegistry: VaultRegistry;
  let migrationRegistry: MigrationRegistry;
  let foundry: Foundry;
  let hub: HubFacet;
  let diamond: Diamond;
  let dai: ERC20;
  let account0: SignerWithAddress;
  let account1: SignerWithAddress;
  let account2: SignerWithAddress;
  const one = ethers.utils.parseEther("1");
  const MAX_WEIGHT = 1000000;

  let token;
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
  let encodedCurveDetails1 = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint32"],
    [baseY1, reserveWeight1]
  );

  let baseY2 = one.mul(100);
  let reserveWeight2 = MAX_WEIGHT / 10;
  let targetReserveWeight2 = reserveWeight2 + 20000;
  let encodedCurveDetails2 = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint32"],
    [baseY2, reserveWeight2]
  );

  let baseY3 = one.mul(1);
  let reserveWeight3 = 100000;
  let targetReserveWeight3 = reserveWeight3 + 10000;
  let encodedCurveDetails3 = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint32"],
    [baseY3, reserveWeight3]
  );

  let baseY4 = one.mul(1);
  let reserveWeight4 = 100000;
  let targetReserveWeight4 = reserveWeight4 + 10000;
  let encodedCurveDetails4 = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint32"],
    [baseY4, reserveWeight4]
  );

  let baseY5 = one.mul(1);
  let reserveWeight5 = 500000;
  let targetReserveWeight5 = 333333;
  let encodedCurveDetails5 = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint32"],
    [baseY5, reserveWeight5]
  );

  let baseY6 = one.mul(1);
  let reserveWeight6 = 250000;
  let targetReserveWeight6 = 333333;
  let encodedCurveDetails6 = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint32"],
    [baseY6, reserveWeight6]
  );
  // Create and register first hub we also link the hubCurve of type "bancorABDK" to this hub (hubID = 1)
  let hubCurve: ICurve;
  ({
    token,
    hubCurve,
    curveRegistry,
    tokenAddr,
    hub,
    foundry,
    diamond,
    migrationRegistry,
    vaultRegistry,
    account0,
    account1,
    account2,
    meTokenRegistry,
  } = await hubSetup(
    encodedCurveDetails1,
    encodedVaultArgs,
    5000,
    "bancorABDK"
  ));
  let addArgs: [
    string,
    HubFacet,
    Diamond,
    Foundry,
    string,
    MeTokenRegistry,
    CurveRegistry,
    MigrationRegistry,
    VaultRegistry,
    string,
    string,
    number,
    string,
    ICurve | undefined
  ] = [
    tokenAddr,
    hub,
    diamond,
    foundry,
    "bancorABDK",
    meTokenRegistry,
    curveRegistry,
    migrationRegistry,
    vaultRegistry,
    encodedCurveDetails1,
    encodedVaultArgs,
    5000,
    account0.address,
    undefined,
  ];

  // we create a new curve of type "bancorABDK" and register it to a new hub (hubID = 2)
  // along with encoded details for the curve and the vault
  let hubDetails = await addHubSetup(...addArgs);

  let curve = {
    signers: [account0, account1, account2],
    curve: hubDetails.hubCurve,
    newCurve: hubCurve,
    baseY: toETHNumber(baseY1),
    reserveWeight: reserveWeight1,
    MAX_WEIGHT: MAX_WEIGHT,
    targetReserveWeight: targetReserveWeight1,
    hubId: hubDetails.hubId,
    hub,
    precision: 0.000000000001,
  };

  curves.push({
    ...testCurve,
    hubId: hubDetails.hubId,
    encodedReconfigureValueSet: ethers.utils.defaultAbiCoder.encode(
      ["uint32"],
      [targetReserveWeight1.toString()]
    ),
    ...getCalculationFuncsForBancorCurves(
      baseY1,
      reserveWeight1,
      targetReserveWeight1,
      MAX_WEIGHT
    ),
  });

  // Second ABDK Curve

  addArgs[13] = hubDetails.hubCurve;
  addArgs[9] = encodedCurveDetails2;
  // we register a new hub with the same curve deployed before but with new encoded curve details
  hubDetails = await addHubSetup(...addArgs);
  curves.push({
    ...testCurve,
    hubId: hubDetails.hubId,
    ...getCalculationFuncsForBancorCurves(
      baseY2,
      reserveWeight2,
      targetReserveWeight2,
      MAX_WEIGHT
    ),
    encodedReconfigureValueSet: ethers.utils.defaultAbiCoder.encode(
      ["uint32"],
      [targetReserveWeight2.toString()]
    ),
  });

  // Third ABDK curve
  addArgs[9] = encodedCurveDetails3;
  // we register a new hub with the same curve deployed before but with new encoded curve details
  hubDetails = await addHubSetup(...addArgs);
  curves.push({
    ...testCurve,
    hubId: hubDetails.hubId,
    ...getCalculationFuncsForBancorCurves(
      baseY3,
      reserveWeight3,
      targetReserveWeight3,
      MAX_WEIGHT
    ),
    encodedReconfigureValueSet: ethers.utils.defaultAbiCoder.encode(
      ["uint32"],
      [targetReserveWeight3.toString()]
    ),
  });

  // Fourth ABDK curve
  addArgs[9] = encodedCurveDetails4;
  // we register a new hub with the same curve deployed before but with new encoded curve details
  hubDetails = await addHubSetup(...addArgs);
  curves.push({
    ...testCurve,
    hubId: hubDetails.hubId,
    ...getCalculationFuncsForBancorCurves(
      baseY4,
      reserveWeight4,
      targetReserveWeight4,
      MAX_WEIGHT
    ),
    encodedReconfigureValueSet: ethers.utils.defaultAbiCoder.encode(
      ["uint32"],
      [targetReserveWeight4.toString()]
    ),
  });

  // fifth ABDK curve
  addArgs[9] = encodedCurveDetails5;
  // we register a new hub with the same curve deployed before but with new encoded curve details
  hubDetails = await addHubSetup(...addArgs);
  curves.push({
    ...testCurve,
    hubId: hubDetails.hubId,
    ...getCalculationFuncsForBancorCurves(
      baseY5,
      reserveWeight5,
      targetReserveWeight5,
      MAX_WEIGHT
    ),
    encodedReconfigureValueSet: ethers.utils.defaultAbiCoder.encode(
      ["uint32"],
      [targetReserveWeight5.toString()]
    ),
  });

  // sixth ABDK curve
  addArgs[9] = encodedCurveDetails6;
  // we register a new hub with the same curve deployed before but with new encoded curve details
  hubDetails = await addHubSetup(...addArgs);
  curves.push({
    ...testCurve,
    hubId: hubDetails.hubId,
    ...getCalculationFuncsForBancorCurves(
      baseY6,
      reserveWeight6,
      targetReserveWeight6,
      MAX_WEIGHT
    ),
    encodedReconfigureValueSet: ethers.utils.defaultAbiCoder.encode(
      ["uint32"],
      [targetReserveWeight6.toString()]
    ),
  });

  // Bancor Power
  addArgs[4] = "BancorPower";

  // First Power curve
  addArgs[9] = encodedCurveDetails1;
  // we create a new curve of type "BancorPower" and register it to the hub
  // along with encoded details for this curve
  hubDetails = await addHubSetup(...addArgs);
  // we set this new curve as the default curve
  curve = { ...curve, curve: hubDetails.hubCurve };
  // stepwise ABDK curves

  testCurve.curve = stepwiseCurveABDK as unknown as ICurve;
  hubArgs[10] = stepwiseCurveABDK as unknown as ICurve;

  // First stepwise curve
  let stepX = 4;
  let stepY = 2;

  hubArgs[7] = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint256"],
    [one.mul(stepX), one.mul(stepY)]
  );

  let targetStepX = 8;
  let targetStepY = 15;

  hubDetails = await addHubSetup(...hubArgs);

  curves.push({
    ...testCurve,
    hubId: hubDetails.hubId,
    ...getCalculationFuncsForStepwiseCurves(
      stepX,
      stepY,
      targetStepX,
      targetStepY
    ),
    encodedReconfigureValueSet: ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint256"],
      [one.mul(targetStepX).toString(), one.mul(targetStepY).toString()]
    ),
  });

  // Second Power curve
  addArgs[13] = curve.curve;
  addArgs[9] = encodedCurveDetails2;
  // we register a new hub with the same curve deployed before but with new encoded curve details
  hubDetails = await addHubSetup(...addArgs);
  // Second stepwise curve
  stepX = 5;
  stepY = 6;
  hubArgs[7] = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint256"],
    [one.mul(stepX), one.mul(stepY)]
  );

  targetStepX = 4;
  targetStepY = 2;

  hubDetails = await addHubSetup(...hubArgs);

  curves.push({
    ...testCurve,
    hubId: hubDetails.hubId,
    ...getCalculationFuncsForStepwiseCurves(
      stepX,
      stepY,
      targetStepX,
      targetStepY
    ),
    encodedReconfigureValueSet: ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint256"],
      [one.mul(targetStepX).toString(), one.mul(targetStepY).toString()]
    ),
  });

  // third power curve
  addArgs[9] = encodedCurveDetails3;
  // we register a new hub with the same curve deployed before but with new encoded curve details
  hubDetails = await addHubSetup(...addArgs);
  // third stepwise curve
  stepX = 4568;
  stepY = 600;
  hubArgs[7] = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint256"],
    [one.mul(stepX), one.mul(stepY)]
  );

  targetStepX = 40000;
  targetStepY = 2;

  hubDetails = await addHubSetup(...hubArgs);

  curves.push({
    ...testCurve,
    hubId: hubDetails.hubId,
    ...getCalculationFuncsForStepwiseCurves(
      stepX,
      stepY,
      targetStepX,
      targetStepY
    ),
    encodedReconfigureValueSet: ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint256"],
      [one.mul(targetStepX).toString(), one.mul(targetStepY).toString()]
    ),
  });

  // fourth power curve
  addArgs[9] = encodedCurveDetails4;
  // we register a new hub with the same curve deployed before but with new encoded curve details
  hubDetails = await addHubSetup(...addArgs);
  // fourth stepwise curve
  stepX = 468;
  stepY = 60;
  hubArgs[7] = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint256"],
    [one.mul(stepX), one.mul(stepY)]
  );

  targetStepX = 12345;
  targetStepY = 256;

  hubDetails = await addHubSetup(...hubArgs);

  curves.push({
    ...testCurve,
    hubId: hubDetails.hubId,
    ...getCalculationFuncsForStepwiseCurves(
      stepX,
      stepY,
      targetStepX,
      targetStepY
    ),
    encodedReconfigureValueSet: ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint256"],
      [one.mul(targetStepX).toString(), one.mul(targetStepY).toString()]
    ),
  });

  // fifth power curve
  addArgs[9] = encodedCurveDetails5;
  // we register a new hub with the same curve deployed before but with new encoded curve details
  hubDetails = await addHubSetup(...addArgs);
  // fifth stepwise curve
  stepX = 468;
  stepY = 600;
  hubArgs[7] = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint256"],
    [one.mul(stepX), one.mul(stepY)]
  );

  targetStepX = 12345;
  targetStepY = 956;

  hubDetails = await addHubSetup(...hubArgs);

  curves.push({
    ...testCurve,
    hubId: hubDetails.hubId,
    ...getCalculationFuncsForStepwiseCurves(
      stepX,
      stepY,
      targetStepX,
      targetStepY
    ),
    encodedReconfigureValueSet: ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint256"],
      [one.mul(targetStepX).toString(), one.mul(targetStepY).toString()]
    ),
  });

  // sixth power curve
  addArgs[9] = encodedCurveDetails6;
  // we register a new hub with the same curve deployed before but with new encoded curve details
  hubDetails = await addHubSetup(...addArgs);
  // sixth stepwise curve
  stepX = 12345000000000;
  stepY = 956;
  hubArgs[7] = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint256"],
    [one.mul(stepX), one.mul(stepY)]
  );

  targetStepX = 12345000000001;
  targetStepY = 957;

  hubDetails = await addHubSetup(...hubArgs);

  curves.push({
    ...testCurve,
    hubId: hubDetails.hubId,
    ...getCalculationFuncsForStepwiseCurves(
      stepX,
      stepY,
      targetStepX,
      targetStepY
    ),
    encodedReconfigureValueSet: ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint256"],
      [one.mul(targetStepX).toString(), one.mul(targetStepY).toString()]
    ),
  });

  return curves;
};
setup().then((tests) => {
  describe(`${tests.length} Curves should work`, async () => {
    tests.forEach((args) => {
      curvesTestsHelper(args);
    });
  });
  run();
});
