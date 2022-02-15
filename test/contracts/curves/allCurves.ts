import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, getNamedAccounts } from "hardhat";
import { CurveRegistry } from "../../../artifacts/types/CurveRegistry";
import { ERC20 } from "../../../artifacts/types/ERC20";
import { FoundryFacet } from "../../../artifacts/types/FoundryFacet";
import { HubFacet } from "../../../artifacts/types/HubFacet";
import { MeTokenRegistryFacet } from "../../../artifacts/types/MeTokenRegistryFacet";
import { WeightedAverage } from "../../../artifacts/types/WeightedAverage";
import { VaultRegistry } from "../../../artifacts/types/VaultRegistry";
import {
  calculateCollateralReturned,
  calculateTokenReturned,
  calculateTokenReturnedFromZero,
  deploy,
  getCalculationFuncsForBancorCurves,
  toETHNumber,
} from "../../utils/helpers";
import { MigrationRegistry } from "../../../artifacts/types/MigrationRegistry";
import { addHubSetup, hubSetup } from "../../utils/hubSetup";
import { curvesTestsHelper } from "./helper/curvesTestsHelper";
import { ICurve } from "../../../artifacts/types/ICurve";
import { Diamond } from "../../../artifacts/types";

/* describe("All curves", () => {
  before("setup curves instance", async () => {});
}); */
const setup = async () => {
  let curves = new Array();
  let DAI: string;
  let meTokenRegistry: MeTokenRegistryFacet;
  let curveRegistry: CurveRegistry;
  let vaultRegistry: VaultRegistry;
  let migrationRegistry: MigrationRegistry;
  let foundry: FoundryFacet;
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
  // Create and register first hub we also link the curve of type "bancorABDK" to this hub (hubID = 1)
  let curve: ICurve;
  ({
    token,
    curve,
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
    FoundryFacet,
    string,
    MeTokenRegistryFacet,
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
  let testCurve = {
    signers: [account0, account1, account2],
    curve: hubDetails.curve,
    newCurve: curve,
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

  addArgs[13] = hubDetails.curve;
  addArgs[9] = encodedCurveDetails2;
  // we register a new hub with the same curve deployed before but with new encoded curve details
  hubDetails = await addHubSetup(...addArgs);

  curves.push({
    ...testCurve,
    hubId: hubDetails.hubId,
    encodedReconfigureValueSet: ethers.utils.defaultAbiCoder.encode(
      ["uint32"],
      [targetReserveWeight2.toString()]
    ),
    ...getCalculationFuncsForBancorCurves(
      baseY2,
      reserveWeight2,
      targetReserveWeight2,
      MAX_WEIGHT
    ),
  });

  // Third ABDK curve
  addArgs[9] = encodedCurveDetails3;
  // we register a new hub with the same curve deployed before but with new encoded curve details
  hubDetails = await addHubSetup(...addArgs);
  curves.push({
    ...testCurve,
    hubId: hubDetails.hubId,
    encodedReconfigureValueSet: ethers.utils.defaultAbiCoder.encode(
      ["uint32"],
      [targetReserveWeight3.toString()]
    ),
    ...getCalculationFuncsForBancorCurves(
      baseY3,
      reserveWeight3,
      targetReserveWeight3,
      MAX_WEIGHT
    ),
  });
  // Fourth ABDK curve
  addArgs[9] = encodedCurveDetails4;
  // we register a new hub with the same curve deployed before but with new encoded curve details
  hubDetails = await addHubSetup(...addArgs);
  curves.push({
    ...testCurve,
    hubId: hubDetails.hubId,
    encodedReconfigureValueSet: ethers.utils.defaultAbiCoder.encode(
      ["uint32"],
      [targetReserveWeight4.toString()]
    ),
    ...getCalculationFuncsForBancorCurves(
      baseY4,
      reserveWeight4,
      targetReserveWeight4,
      MAX_WEIGHT
    ),
  });
  // fifth ABDK curve
  addArgs[9] = encodedCurveDetails5;
  // we register a new hub with the same curve deployed before but with new encoded curve details
  hubDetails = await addHubSetup(...addArgs);
  curves.push({
    ...testCurve,
    hubId: hubDetails.hubId,
    encodedReconfigureValueSet: ethers.utils.defaultAbiCoder.encode(
      ["uint32"],
      [targetReserveWeight5.toString()]
    ),
    ...getCalculationFuncsForBancorCurves(
      baseY5,
      reserveWeight5,
      targetReserveWeight5,
      MAX_WEIGHT
    ),
  });
  // sixth ABDK curve
  addArgs[9] = encodedCurveDetails6;
  // we register a new hub with the same curve deployed before but with new encoded curve details
  hubDetails = await addHubSetup(...addArgs);
  curves.push({
    ...testCurve,
    hubId: hubDetails.hubId,
    encodedReconfigureValueSet: ethers.utils.defaultAbiCoder.encode(
      ["uint32"],
      [targetReserveWeight6.toString()]
    ),
    ...getCalculationFuncsForBancorCurves(
      baseY6,
      reserveWeight6,
      targetReserveWeight6,
      MAX_WEIGHT
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
  testCurve = { ...testCurve, curve: hubDetails.curve };
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
  // Second Power curve
  addArgs[13] = testCurve.curve;
  addArgs[9] = encodedCurveDetails2;
  // we register a new hub with the same curve deployed before but with new encoded curve details
  hubDetails = await addHubSetup(...addArgs);
  curves.push({
    ...testCurve,
    hubId: hubDetails.hubId,
    encodedReconfigureValueSet: ethers.utils.defaultAbiCoder.encode(
      ["uint32"],
      [targetReserveWeight2.toString()]
    ),
    ...getCalculationFuncsForBancorCurves(
      baseY2,
      reserveWeight2,
      targetReserveWeight2,
      MAX_WEIGHT
    ),
  });
  // third power curve
  addArgs[9] = encodedCurveDetails3;
  // we register a new hub with the same curve deployed before but with new encoded curve details
  hubDetails = await addHubSetup(...addArgs);
  curves.push({
    ...testCurve,
    hubId: hubDetails.hubId,
    encodedReconfigureValueSet: ethers.utils.defaultAbiCoder.encode(
      ["uint32"],
      [targetReserveWeight3.toString()]
    ),
    ...getCalculationFuncsForBancorCurves(
      baseY3,
      reserveWeight3,
      targetReserveWeight3,
      MAX_WEIGHT
    ),
  });
  // fourth power curve
  addArgs[9] = encodedCurveDetails4;
  // we register a new hub with the same curve deployed before but with new encoded curve details
  hubDetails = await addHubSetup(...addArgs);
  curves.push({
    ...testCurve,
    hubId: hubDetails.hubId,
    encodedReconfigureValueSet: ethers.utils.defaultAbiCoder.encode(
      ["uint32"],
      [targetReserveWeight4.toString()]
    ),
    ...getCalculationFuncsForBancorCurves(
      baseY4,
      reserveWeight4,
      targetReserveWeight4,
      MAX_WEIGHT
    ),
  });
  // fifth power curve
  addArgs[9] = encodedCurveDetails5;
  // we register a new hub with the same curve deployed before but with new encoded curve details
  hubDetails = await addHubSetup(...addArgs);
  curves.push({
    ...testCurve,
    hubId: hubDetails.hubId,
    encodedReconfigureValueSet: ethers.utils.defaultAbiCoder.encode(
      ["uint32"],
      [targetReserveWeight5.toString()]
    ),
    ...getCalculationFuncsForBancorCurves(
      baseY5,
      reserveWeight5,
      targetReserveWeight5,
      MAX_WEIGHT
    ),
  });
  // sixth power curve
  addArgs[9] = encodedCurveDetails6;
  // we register a new hub with the same curve deployed before but with new encoded curve details
  hubDetails = await addHubSetup(...addArgs);
  curves.push({
    ...testCurve,
    hubId: hubDetails.hubId,
    encodedReconfigureValueSet: ethers.utils.defaultAbiCoder.encode(
      ["uint32"],
      [targetReserveWeight6.toString()]
    ),
    ...getCalculationFuncsForBancorCurves(
      baseY6,
      reserveWeight6,
      targetReserveWeight6,
      MAX_WEIGHT
    ),
  });
  return curves;
};
setup().then((tests) => {
  describe(`${tests.length} Curves should work`, async () => {
    before(async () => {
      console.log(`
      
    resetFork before
    
    `);
    });
    /*  const curvesTests = tests.map((args) => curvesTestsHelper(args));
    await Promise.all(curvesTests); */
    tests.forEach(async (args) => {
      await curvesTestsHelper(args);
    });
  });
  run();
});
