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
import { MigrationRegistry } from "../../../artifacts/types/MigrationRegistry";
import { addHubSetup, hubSetup } from "../../utils/hubSetup";
import { ContractFunctionVisibility } from "hardhat/internal/hardhat-network/stack-traces/model";
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
  let hub: Hub;
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
  /*  const bancorABDK = await deploy<BancorABDK>("BancorABDK");
  const bancorPower = await deploy<BancorPower>("BancorPower"); */

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
    hub,
    curveRegistry,
    tokenAddr,
    migrationRegistry,
    vaultRegistry,
    foundry,
    account0,
    account1,
    account2,
    meTokenRegistry,
  } = await hubSetup(encodedCurveDetails1, encodedVaultArgs, 5000));

  let hubArgs: [
    Hub,
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

  let curve = {
    signers: [account0, account1, account2],
    curve: bancorABDK,
    baseY: toETHNumber(baseY1),
    reserveWeight: reserveWeight1,
    MAX_WEIGHT: MAX_WEIGHT,
    targetReserveWeight: targetReserveWeight1,
    hubId: hubDetails.hubId,
    calculateCollateralReturned: calculateCollateralReturned,
    calculateTokenReturned: calculateTokenReturned,
    calculateTokenReturnedFromZero: calculateTokenReturnedFromZero,
    precision: 0.000000000001,
  };

  curves.push(curve);

  /*   // Second ABDK Curve
  hubArgs[7] = encodedCurveDetails2;
  hubDetails = await addHubSetup(...hubArgs);

  curve.hubId = hubDetails.hubId;
  curve.baseY = toETHNumber(baseY2);
  curve.reserveWeight = reserveWeight2;
  curve.targetReserveWeight = targetReserveWeight2;
  curves.push(curve);

  // Third ABDK curve
  hubArgs[7] = encodedCurveDetails3;
  hubDetails = await addHubSetup(...hubArgs);

  curve.hubId = hubDetails.hubId;
  curve.baseY = toETHNumber(baseY3);
  curve.reserveWeight = reserveWeight3;
  curve.targetReserveWeight = targetReserveWeight3;
  curves.push(curve);

  // Fourth ABDK curve
  hubArgs[7] = encodedCurveDetails4;
  hubDetails = await addHubSetup(...hubArgs);

  curve.hubId = hubDetails.hubId;
  curve.baseY = toETHNumber(baseY4);
  curve.reserveWeight = reserveWeight4;
  curve.targetReserveWeight = targetReserveWeight4;
  curves.push(curve);

  // fifth ABDK curve
  hubArgs[7] = encodedCurveDetails5;
  hubDetails = await addHubSetup(...hubArgs);

  curve.hubId = hubDetails.hubId;
  curve.baseY = toETHNumber(baseY5);
  curve.reserveWeight = reserveWeight5;
  curve.targetReserveWeight = targetReserveWeight5;
  curves.push(curve);

  // sixth ABDK curve
  hubArgs[7] = encodedCurveDetails6;
  hubDetails = await addHubSetup(...hubArgs);

  curve.hubId = hubDetails.hubId;
  curve.baseY = toETHNumber(baseY6);
  curve.reserveWeight = reserveWeight6;
  curve.targetReserveWeight = targetReserveWeight6;
  curves.push(curve);

  // Bancor Power
  hubArgs[-2] = bancorPower;

  // First Power curve
  hubArgs[7] = encodedCurveDetails1;
  hubDetails = await addHubSetup(...hubArgs);

  curve.hubId = hubDetails.hubId;
  curve.baseY = toETHNumber(baseY1);
  curve.reserveWeight = reserveWeight1;
  curve.targetReserveWeight = targetReserveWeight1;
  curves.push(curve);

  // Second Power curve
  hubArgs[7] = encodedCurveDetails2;
  hubDetails = await addHubSetup(...hubArgs);

  curve.hubId = hubDetails.hubId;
  curve.baseY = toETHNumber(baseY2);
  curve.reserveWeight = reserveWeight2;
  curve.targetReserveWeight = targetReserveWeight2;
  curves.push(curve);

  // third power curve
  hubArgs[7] = encodedCurveDetails3;
  hubDetails = await addHubSetup(...hubArgs);

  curve.hubId = hubDetails.hubId;
  curve.baseY = toETHNumber(baseY3);
  curve.reserveWeight = reserveWeight3;
  curve.targetReserveWeight = targetReserveWeight3;
  curves.push(curve);

  // fourth power curve
  hubArgs[7] = encodedCurveDetails4;
  hubDetails = await addHubSetup(...hubArgs);

  curve.hubId = hubDetails.hubId;
  curve.baseY = toETHNumber(baseY4);
  curve.reserveWeight = reserveWeight4;
  curve.targetReserveWeight = targetReserveWeight4;
  curves.push(curve);

  // fifth power curve
  hubArgs[7] = encodedCurveDetails5;
  hubDetails = await addHubSetup(...hubArgs);

  curve.hubId = hubDetails.hubId;
  curve.baseY = toETHNumber(baseY5);
  curve.reserveWeight = reserveWeight5;
  curve.targetReserveWeight = targetReserveWeight5;
  curves.push(curve);

  // sixth power curve
  hubArgs[7] = encodedCurveDetails6;
  hubDetails = await addHubSetup(...hubArgs);

  curve.hubId = hubDetails.hubId;
  curve.baseY = toETHNumber(baseY6);
  curve.reserveWeight = reserveWeight6;
  curve.targetReserveWeight = targetReserveWeight6;
  curves.push(curve);
 */
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
