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
  toETHNumber,
} from "../../utils/helpers";
import { MigrationRegistry } from "../../../artifacts/types/MigrationRegistry";
import { addHubSetup, hubSetup } from "../../utils/hubSetup";
import { BancorABDK } from "../../../artifacts/types/BancorABDK";
import { curvesTestsHelper } from "./helper/curvesTestsHelper";
import { BancorPower } from "../../../artifacts/types/BancorPower";
import { ICurve } from "../../../artifacts/types/ICurve";

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

  const weightedAverage = await deploy<WeightedAverage>("WeightedAverage");
  foundry = await deploy<Foundry>("Foundry", {
    WeightedAverage: weightedAverage.address,
  });
  hub = await deploy<Hub>("Hub");
  const bancorABDK = await deploy<BancorABDK>(
    "BancorABDK",
    undefined,
    hub.address,
    foundry.address
  );

  const newBancorABDK = await deploy<BancorABDK>(
    "BancorABDK",
    undefined,
    hub.address,
    foundry.address
  );

  const bancorPower = await deploy<BancorPower>(
    "BancorPower",
    undefined,
    hub.address,
    foundry.address
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

  // Create hub and register first hub
  ({
    token,
    curveRegistry,
    tokenAddr,
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
    hub,
    foundry,
    bancorABDK
  ));

  let hubArgs: [
    HubFacet,
    Foundry,
    MeTokenRegistry,
    CurveRegistry,
    string,
    MigrationRegistry,
    VaultRegistry,
    string,
    string,
    number,
    ICurve,
    string
  ] = [
    hub,
    foundry,
    meTokenRegistry,
    curveRegistry,
    tokenAddr,
    migrationRegistry,
    vaultRegistry,
    encodedCurveDetails1,
    encodedVaultArgs,
    5000,
    bancorABDK,
    account0.address,
  ];
  let hubDetails = await addHubSetup(...hubArgs);
  await curveRegistry.approve(newBancorABDK.address);
  let curve = {
    signers: [account0, account1, account2],
    curve: bancorABDK,
    newCurve: newBancorABDK,
    baseY: toETHNumber(baseY1),
    reserveWeight: reserveWeight1,
    MAX_WEIGHT: MAX_WEIGHT,
    targetReserveWeight: targetReserveWeight1,
    hubId: hubDetails.hubId,
    hub,
    calculateCollateralReturned: calculateCollateralReturned,
    calculateTokenReturned: calculateTokenReturned,
    calculateTokenReturnedFromZero: calculateTokenReturnedFromZero,
    precision: 0.000000000001,
  };

  curves.push(curve);

  // Second ABDK Curve
  hubArgs[7] = encodedCurveDetails2;
  hubDetails = await addHubSetup(...hubArgs);
  curves.push({
    ...curve,
    hubId: hubDetails.hubId,
    baseY: toETHNumber(baseY2),
    reserveWeight: reserveWeight2,
    targetReserveWeight: targetReserveWeight2,
  });

  // Third ABDK curve
  hubArgs[7] = encodedCurveDetails3;
  hubDetails = await addHubSetup(...hubArgs);
  curves.push({
    ...curve,
    hubId: hubDetails.hubId,
    baseY: toETHNumber(baseY3),
    reserveWeight: reserveWeight3,
    targetReserveWeight: targetReserveWeight3,
  });

  // Fourth ABDK curve
  hubArgs[7] = encodedCurveDetails4;
  hubDetails = await addHubSetup(...hubArgs);
  curves.push({
    ...curve,
    hubId: hubDetails.hubId,
    baseY: toETHNumber(baseY4),
    reserveWeight: reserveWeight4,
    targetReserveWeight: targetReserveWeight4,
  });

  // fifth ABDK curve
  hubArgs[7] = encodedCurveDetails5;
  hubDetails = await addHubSetup(...hubArgs);
  curves.push({
    ...curve,
    hubId: hubDetails.hubId,
    baseY: toETHNumber(baseY5),
    reserveWeight: reserveWeight5,
    targetReserveWeight: targetReserveWeight5,
  });

  // sixth ABDK curve
  hubArgs[7] = encodedCurveDetails6;
  hubDetails = await addHubSetup(...hubArgs);
  curves.push({
    ...curve,
    hubId: hubDetails.hubId,
    baseY: toETHNumber(baseY6),
    reserveWeight: reserveWeight6,
    targetReserveWeight: targetReserveWeight6,
  });

  // Bancor Power
  hubArgs[-2] = bancorPower;

  // First Power curve
  hubArgs[7] = encodedCurveDetails1;
  hubDetails = await addHubSetup(...hubArgs);
  curves.push({
    ...curve,
    hubId: hubDetails.hubId,
    baseY: toETHNumber(baseY1),
    reserveWeight: reserveWeight1,
    targetReserveWeight: targetReserveWeight1,
  });

  // Second Power curve
  hubArgs[7] = encodedCurveDetails2;
  hubDetails = await addHubSetup(...hubArgs);
  curves.push({
    ...curve,
    hubId: hubDetails.hubId,
    baseY: toETHNumber(baseY2),
    reserveWeight: reserveWeight2,
    targetReserveWeight: targetReserveWeight2,
  });

  // third power curve
  hubArgs[7] = encodedCurveDetails3;
  hubDetails = await addHubSetup(...hubArgs);
  curves.push({
    ...curve,
    hubId: hubDetails.hubId,
    baseY: toETHNumber(baseY3),
    reserveWeight: reserveWeight3,
    targetReserveWeight: targetReserveWeight3,
  });

  // fourth power curve
  hubArgs[7] = encodedCurveDetails4;
  hubDetails = await addHubSetup(...hubArgs);
  curves.push({
    ...curve,
    hubId: hubDetails.hubId,
    baseY: toETHNumber(baseY4),
    reserveWeight: reserveWeight4,
    targetReserveWeight: targetReserveWeight4,
  });

  // fifth power curve
  hubArgs[7] = encodedCurveDetails5;
  hubDetails = await addHubSetup(...hubArgs);
  curves.push({
    ...curve,
    hubId: hubDetails.hubId,
    baseY: toETHNumber(baseY5),
    reserveWeight: reserveWeight5,
    targetReserveWeight: targetReserveWeight5,
  });

  // sixth power curve
  hubArgs[7] = encodedCurveDetails6;
  hubDetails = await addHubSetup(...hubArgs);
  curves.push({
    ...curve,
    hubId: hubDetails.hubId,
    baseY: toETHNumber(baseY6),
    reserveWeight: reserveWeight6,
    targetReserveWeight: targetReserveWeight6,
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
