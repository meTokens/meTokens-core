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
import { expect } from "chai";
import { MigrationRegistry } from "../../../artifacts/types/MigrationRegistry";
import { addHubSetup, hubSetup } from "../../utils/hubSetup";
import { ContractFunctionVisibility } from "hardhat/internal/hardhat-network/stack-traces/model";
import { BancorZeroCurve } from "../../../artifacts/types/BancorZeroCurve";
import { curvesTestsHelper } from "./helper/curvesTestsHelper";

describe("All curves", () => {
  before("setup curves instance", async () => {});
});
const setup = async () => {
  let DAI: string;
  let weightedAverage: WeightedAverage;
  let meTokenRegistry: MeTokenRegistry;
  let meTokenFactory: MeTokenFactory;
  let bancorZeroCurve: BancorZeroCurve;
  let curveRegistry: CurveRegistry;
  let vaultRegistry: VaultRegistry;
  let migrationRegistry: MigrationRegistry;
  let singleAssetVault: SingleAssetVault;
  let foundry: Foundry;
  let hub: Hub;
  let dai: ERC20;
  let account0: SignerWithAddress;
  let account1: SignerWithAddress;
  let account2: SignerWithAddress;
  let daiHolder: Signer;
  let DAIWhale: string;
  const decimals = 18;
  const one = ethers.utils.parseEther("1");
  let baseY: BigNumber;
  const MAX_WEIGHT = 1000000;
  let reserveWeight = MAX_WEIGHT / 2;
  let hubId = 1;
  let token;

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
  bancorZeroCurve = await deploy<BancorZeroCurve>("BancorZeroCurve");

  ({
    token,
    hub,
    curveRegistry,
    migrationRegistry,
    vaultRegistry,
    foundry,
    account0,
    account1,
    account2,
    meTokenRegistry,
  } = await hubSetup(
    encodedCurveDetails,
    encodedVaultArgs,
    5000,
    bancorZeroCurve
  ));
  dai = token;
  let targetReserveWeight = MAX_WEIGHT - 20000;
  const firstCurve = {
    signers: [account0, account1, account2],
    curve: bancorZeroCurve,
    baseY: toETHNumber(baseY),
    reserveWeight: reserveWeight,
    MAX_WEIGHT,
    targetReserveWeight,
    hubId,
    calculateCollateralReturned,
    calculateTokenReturned,
    calculateTokenReturnedFromZero,
    precision: 0.00000000000000000001,
  };

  // Second Curve

  const secondBancorZeroCurve = await deploy<BancorZeroCurve>(
    "BancorZeroCurve"
  );

  baseY = one.mul(100);
  reserveWeight = MAX_WEIGHT / 10;
  targetReserveWeight = reserveWeight + 20000;
  encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint32"],
    [baseY, reserveWeight]
  );
  const sndHub = await addHubSetup(
    hub,
    foundry,
    meTokenRegistry,
    migrationRegistry,
    vaultRegistry,
    encodedCurveDetails,
    encodedVaultArgs,
    5000,
    secondBancorZeroCurve,
    account0.address
  );

  const sndCurve = {
    signers: [account0, account1, account2],
    curve: secondBancorZeroCurve,
    baseY: toETHNumber(baseY),
    reserveWeight,
    MAX_WEIGHT,
    targetReserveWeight,
    hubId: sndHub.hubId,
    calculateCollateralReturned,
    calculateTokenReturned,
    calculateTokenReturnedFromZero,
    precision: 0.00000000000000000001,
  };
  // third curve
  const thirdBancorZeroCurve = await deploy<BancorZeroCurve>("BancorZeroCurve");

  baseY = one.mul(1);
  reserveWeight = 150000;
  targetReserveWeight = reserveWeight + 10000;
  encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint32"],
    [baseY, reserveWeight]
  );
  const thirdHub = await addHubSetup(
    hub,
    foundry,
    meTokenRegistry,
    migrationRegistry,
    vaultRegistry,
    encodedCurveDetails,
    encodedVaultArgs,
    5000,
    thirdBancorZeroCurve,
    account0.address
  );

  const thirdCurve = {
    signers: [account0, account1, account2],
    curve: thirdBancorZeroCurve,
    baseY: toETHNumber(baseY),
    reserveWeight,
    MAX_WEIGHT,
    targetReserveWeight,
    hubId: thirdHub.hubId,
    calculateCollateralReturned,
    calculateTokenReturned,
    calculateTokenReturnedFromZero,
    precision: 0.00000000000000000001,
  };
  return [firstCurve, sndCurve, thirdCurve];
};
setup().then((tests) => {
  describe(`${tests.length} Curves should work`, async () => {
    tests.forEach((args) => {
      curvesTestsHelper(args);
    });
  });
  run();
});
