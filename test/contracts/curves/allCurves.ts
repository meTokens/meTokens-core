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

describe("All curves", () => {
  before("setup curves instance", async () => {});
});
const setup = async () => {
  let DAI: string;
  let meTokenRegistry: MeTokenRegistry;
  let bancorABDK: BancorABDK;
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
  let baseY: BigNumber;
  const MAX_WEIGHT = 1000000;
  let reserveWeight = MAX_WEIGHT / 2;
  let hubId = 1;
  let token;
  let tokenAddr: string;
  baseY = one.mul(1000);

  ({ DAI } = await getNamedAccounts());

  let encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint32"],
    [baseY, reserveWeight]
  );
  let encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
    ["address"],
    [DAI]
  );
  bancorABDK = await deploy<BancorABDK>("BancorABDK");

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
  } = await hubSetup(encodedCurveDetails, encodedVaultArgs, 5000, bancorABDK));
  dai = token;
  let targetReserveWeight = MAX_WEIGHT - 20000;
  const curve1 = {
    signers: [account0, account1, account2],
    curve: bancorABDK,
    baseY: toETHNumber(baseY),
    reserveWeight: reserveWeight,
    MAX_WEIGHT,
    targetReserveWeight,
    hubId,
    calculateCollateralReturned,
    calculateTokenReturned,
    calculateTokenReturnedFromZero,
    precision: 0.000000000001,
  };

  // Second Curve

  const bancorABDK2 = await deploy<BancorABDK>("BancorABDK");

  baseY = one.mul(100);
  reserveWeight = MAX_WEIGHT / 10;
  targetReserveWeight = reserveWeight + 20000;
  encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint32"],
    [baseY, reserveWeight]
  );
  const hub2 = await addHubSetup(
    hub,
    foundry,
    meTokenRegistry,
    curveRegistry,
    tokenAddr,
    migrationRegistry,
    vaultRegistry,
    encodedCurveDetails,
    encodedVaultArgs,
    5000,
    bancorABDK2,
    account0.address
  );

  const curve2 = {
    signers: [account0, account1, account2],
    curve: bancorABDK2,
    baseY: toETHNumber(baseY),
    reserveWeight,
    MAX_WEIGHT,
    targetReserveWeight,
    hubId: hub2.hubId,
    calculateCollateralReturned,
    calculateTokenReturned,
    calculateTokenReturnedFromZero,
    precision: 0.000000000001,
  };

  // third curve
  const bancorABDK3 = await deploy<BancorABDK>("BancorABDK");

  baseY = one.mul(1);
  reserveWeight = 100000;
  targetReserveWeight = reserveWeight + 10000;
  encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint32"],
    [baseY, reserveWeight]
  );
  const hub3 = await addHubSetup(
    hub,
    foundry,
    meTokenRegistry,
    curveRegistry,
    tokenAddr,
    migrationRegistry,
    vaultRegistry,
    encodedCurveDetails,
    encodedVaultArgs,
    5000,
    bancorABDK3,
    account0.address
  );

  const curve3 = {
    signers: [account0, account1, account2],
    curve: bancorABDK3,
    baseY: toETHNumber(baseY),
    reserveWeight,
    MAX_WEIGHT,
    targetReserveWeight,
    hubId: hub3.hubId,
    calculateCollateralReturned,
    calculateTokenReturned,
    calculateTokenReturnedFromZero,
    precision: 0.000000000001,
  };

  // fourth curve
  const bancorABDK4 = await deploy<BancorABDK>("BancorABDK");

  baseY = one.mul(1);
  reserveWeight = 100000;
  targetReserveWeight = reserveWeight - 20000;
  encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint32"],
    [baseY, reserveWeight]
  );
  const hub4 = await addHubSetup(
    hub,
    foundry,
    meTokenRegistry,
    curveRegistry,
    tokenAddr,
    migrationRegistry,
    vaultRegistry,
    encodedCurveDetails,
    encodedVaultArgs,
    5000,
    bancorABDK4,
    account0.address
  );

  const curve4 = {
    signers: [account0, account1, account2],
    curve: bancorABDK4,
    baseY: toETHNumber(baseY),
    reserveWeight,
    MAX_WEIGHT,
    targetReserveWeight,
    hubId: hub4.hubId,
    calculateCollateralReturned,
    calculateTokenReturned,
    calculateTokenReturnedFromZero,
    precision: 0.000000000001,
  };

  // fifth curve
  const bancorABDK5 = await deploy<BancorABDK>("BancorABDK");

  baseY = one.mul(1);
  reserveWeight = 500000;
  targetReserveWeight = 333333;
  encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint32"],
    [baseY, reserveWeight]
  );
  const hub5 = await addHubSetup(
    hub,
    foundry,
    meTokenRegistry,
    curveRegistry,
    tokenAddr,
    migrationRegistry,
    vaultRegistry,
    encodedCurveDetails,
    encodedVaultArgs,
    5000,
    bancorABDK5,
    account0.address
  );

  const curve5 = {
    signers: [account0, account1, account2],
    curve: bancorABDK5,
    baseY: toETHNumber(baseY),
    reserveWeight,
    MAX_WEIGHT,
    targetReserveWeight,
    hubId: hub5.hubId,
    calculateCollateralReturned,
    calculateTokenReturned,
    calculateTokenReturnedFromZero,
    precision: 0.000000000001,
  };

  // sixth curve
  const bancorABDK6 = await deploy<BancorABDK>("BancorABDK");

  baseY = one.mul(1);
  reserveWeight = 500000;
  targetReserveWeight = 333333;
  encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint32"],
    [baseY, reserveWeight]
  );
  const hub6 = await addHubSetup(
    hub,
    foundry,
    meTokenRegistry,
    curveRegistry,
    tokenAddr,
    migrationRegistry,
    vaultRegistry,
    encodedCurveDetails,
    encodedVaultArgs,
    5000,
    bancorABDK6,
    account0.address
  );

  const curve6 = {
    signers: [account0, account1, account2],
    curve: bancorABDK6,
    baseY: toETHNumber(baseY),
    reserveWeight,
    MAX_WEIGHT,
    targetReserveWeight,
    hubId: hub6.hubId,
    calculateCollateralReturned,
    calculateTokenReturned,
    calculateTokenReturnedFromZero,
    precision: 0.000000000001,
  };

  // Curve Power
  const bancorp1 = await deploy<BancorPower>("BancorPower");

  baseY = one.mul(1000);
  reserveWeight = MAX_WEIGHT / 2;
  targetReserveWeight = reserveWeight - 20000;
  encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint32"],
    [baseY, reserveWeight]
  );
  const hubp1 = await addHubSetup(
    hub,
    foundry,
    meTokenRegistry,
    curveRegistry,
    tokenAddr,
    migrationRegistry,
    vaultRegistry,
    encodedCurveDetails,
    encodedVaultArgs,
    5000,
    bancorp1,
    account0.address
  );

  const curvep1 = {
    signers: [account0, account1, account2],
    curve: bancorp1,
    baseY: toETHNumber(baseY),
    reserveWeight,
    MAX_WEIGHT,
    targetReserveWeight,
    hubId: hubp1.hubId,
    calculateCollateralReturned,
    calculateTokenReturned,
    calculateTokenReturnedFromZero,
    precision: 0.000000000001,
  };

  // power 2
  const bancorp2 = await deploy<BancorPower>("BancorPower");

  baseY = one.mul(100);
  reserveWeight = MAX_WEIGHT / 10;
  targetReserveWeight = reserveWeight + 20000;
  encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint32"],
    [baseY, reserveWeight]
  );
  const hubp2 = await addHubSetup(
    hub,
    foundry,
    meTokenRegistry,
    curveRegistry,
    tokenAddr,
    migrationRegistry,
    vaultRegistry,
    encodedCurveDetails,
    encodedVaultArgs,
    5000,
    bancorp2,
    account0.address
  );

  const curvep2 = {
    signers: [account0, account1, account2],
    curve: bancorp2,
    baseY: toETHNumber(baseY),
    reserveWeight,
    MAX_WEIGHT,
    targetReserveWeight,
    hubId: hubp2.hubId,
    calculateCollateralReturned,
    calculateTokenReturned,
    calculateTokenReturnedFromZero,
    precision: 0.000000000001,
  };

  // third curve
  const bancorp3 = await deploy<BancorPower>("BancorPower");

  baseY = one.mul(1);
  reserveWeight = 100000;
  targetReserveWeight = reserveWeight + 10000;
  encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint32"],
    [baseY, reserveWeight]
  );
  const hubp3 = await addHubSetup(
    hub,
    foundry,
    meTokenRegistry,
    curveRegistry,
    tokenAddr,
    migrationRegistry,
    vaultRegistry,
    encodedCurveDetails,
    encodedVaultArgs,
    5000,
    bancorp3,
    account0.address
  );

  const curvep3 = {
    signers: [account0, account1, account2],
    curve: bancorp3,
    baseY: toETHNumber(baseY),
    reserveWeight,
    MAX_WEIGHT,
    targetReserveWeight,
    hubId: hubp3.hubId,
    calculateCollateralReturned,
    calculateTokenReturned,
    calculateTokenReturnedFromZero,
    precision: 0.000000000001,
  };

  // fourth curve
  const bancorp4 = await deploy<BancorPower>("BancorPower");

  baseY = one.mul(1);
  reserveWeight = 100000;
  targetReserveWeight = reserveWeight - 20000;
  encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint32"],
    [baseY, reserveWeight]
  );
  const hubp4 = await addHubSetup(
    hub,
    foundry,
    meTokenRegistry,
    curveRegistry,
    tokenAddr,
    migrationRegistry,
    vaultRegistry,
    encodedCurveDetails,
    encodedVaultArgs,
    5000,
    bancorp4,
    account0.address
  );

  const curvep4 = {
    signers: [account0, account1, account2],
    curve: bancorp4,
    baseY: toETHNumber(baseY),
    reserveWeight,
    MAX_WEIGHT,
    targetReserveWeight,
    hubId: hubp4.hubId,
    calculateCollateralReturned,
    calculateTokenReturned,
    calculateTokenReturnedFromZero,
    precision: 0.000000000001,
  };

  // fifth curve
  const bancorp5 = await deploy<BancorPower>("BancorPower");

  baseY = one.mul(1);
  reserveWeight = 500000;
  targetReserveWeight = 333333;
  encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint32"],
    [baseY, reserveWeight]
  );
  const hubp5 = await addHubSetup(
    hub,
    foundry,
    meTokenRegistry,
    curveRegistry,
    tokenAddr,
    migrationRegistry,
    vaultRegistry,
    encodedCurveDetails,
    encodedVaultArgs,
    5000,
    bancorp5,
    account0.address
  );

  const curvep5 = {
    signers: [account0, account1, account2],
    curve: bancorp5,
    baseY: toETHNumber(baseY),
    reserveWeight,
    MAX_WEIGHT,
    targetReserveWeight,
    hubId: hubp5.hubId,
    calculateCollateralReturned,
    calculateTokenReturned,
    calculateTokenReturnedFromZero,
    precision: 0.000000000001,
  };

  // sixth curve
  const bancorp6 = await deploy<BancorPower>("BancorPower");

  baseY = one.mul(1);
  reserveWeight = 500000;
  targetReserveWeight = 333333;
  encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint32"],
    [baseY, reserveWeight]
  );
  const hubp6 = await addHubSetup(
    hub,
    foundry,
    meTokenRegistry,
    curveRegistry,
    tokenAddr,
    migrationRegistry,
    vaultRegistry,
    encodedCurveDetails,
    encodedVaultArgs,
    5000,
    bancorp6,
    account0.address
  );

  const curvep6 = {
    signers: [account0, account1, account2],
    curve: bancorp6,
    baseY: toETHNumber(baseY),
    reserveWeight,
    MAX_WEIGHT,
    targetReserveWeight,
    hubId: hubp6.hubId,
    calculateCollateralReturned,
    calculateTokenReturned,
    calculateTokenReturnedFromZero,
    precision: 0.000000000001,
  };

  return [
    curve1,
    curve2,
    curve3,
    curve4,
    curve5,
    curve6,
    curvep1,
    curvep2,
    curvep3,
    curvep4,
    curvep5,
    curvep6,
  ];
};
setup().then((tests) => {
  describe(`${tests.length} Curves should work`, async () => {
    tests.forEach((args) => {
      curvesTestsHelper(args);
    });
  });
  run();
});
