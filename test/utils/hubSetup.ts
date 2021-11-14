import { ethers, getNamedAccounts } from "hardhat";
import { WeightedAverage } from "../../artifacts/types/WeightedAverage";
import { MeTokenRegistry } from "../../artifacts/types/MeTokenRegistry";
import { MeTokenFactory } from "../../artifacts/types/MeTokenFactory";
import { CurveRegistry } from "../../artifacts/types/CurveRegistry";
import { VaultRegistry } from "../../artifacts/types/VaultRegistry";
import { MigrationRegistry } from "../../artifacts/types/MigrationRegistry";
import { SingleAssetVault } from "../../artifacts/types/SingleAssetVault";
import { Foundry } from "../../artifacts/types/Foundry";
import { Hub } from "../../artifacts/types/Hub";
import { ERC20 } from "../../artifacts/types/ERC20";
import { deploy, getContractAt } from "./helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { impersonate } from "./hardhatNode";
import { Signer } from "ethers";
import { ICurve } from "../../artifacts/types/ICurve";

let tokenAddr: string;
let weightedAverage: WeightedAverage;
let meTokenRegistry: MeTokenRegistry;
let meTokenFactory: MeTokenFactory;
let curveRegistry: CurveRegistry;
let vaultRegistry: VaultRegistry;
let migrationRegistry: MigrationRegistry;
let singleAssetVault: SingleAssetVault;
let foundry: Foundry;
let hub: Hub;
let token: ERC20;
let account0: SignerWithAddress;
let account1: SignerWithAddress;
let account2: SignerWithAddress;
let account3: SignerWithAddress;
let tokenHolder: Signer;
let tokenWhale: string;
export default async function hubSetup(
  encodedCurveDetails: string,
  encodedVaultArgs: string,
  refundRatio: number,
  curve: ICurve,
  erc20Address?: string,
  erc20Whale?: string
): Promise<{
  tokenAddr: string;
  weightedAverage: WeightedAverage;
  meTokenRegistry: MeTokenRegistry;
  meTokenFactory: MeTokenFactory;
  curveRegistry: CurveRegistry;
  vaultRegistry: VaultRegistry;
  migrationRegistry: MigrationRegistry;
  singleAssetVault: SingleAssetVault;
  foundry: Foundry;
  hub: Hub;
  token: ERC20;
  account0: SignerWithAddress;
  account1: SignerWithAddress;
  account2: SignerWithAddress;
  account3: SignerWithAddress;
  tokenHolder: Signer;
  tokenWhale: string;
}> {
  if (!erc20Address || !erc20Whale) {
    let DAI;
    let DAIWhale;
    ({ DAI, DAIWhale } = await getNamedAccounts());
    tokenWhale = DAIWhale;
    tokenAddr = DAI;
  }
  [account0, account1, account2, account3] = await ethers.getSigners();
  token = await getContractAt<ERC20>("ERC20", tokenAddr);
  tokenHolder = await impersonate(tokenWhale);
  token
    .connect(tokenHolder)
    .transfer(account1.address, ethers.utils.parseEther("1000"));
  weightedAverage = await deploy<WeightedAverage>("WeightedAverage");

  curveRegistry = await deploy<CurveRegistry>("CurveRegistry");
  vaultRegistry = await deploy<VaultRegistry>("VaultRegistry");
  migrationRegistry = await deploy<MigrationRegistry>("MigrationRegistry");

  foundry = await deploy<Foundry>("Foundry", {
    WeightedAverage: weightedAverage.address,
  });

  hub = await deploy<Hub>("Hub");
  meTokenFactory = await deploy<MeTokenFactory>("MeTokenFactory");
  meTokenRegistry = await deploy<MeTokenRegistry>(
    "MeTokenRegistry",
    undefined,
    foundry.address,
    hub.address,
    meTokenFactory.address,
    migrationRegistry.address
  );
  singleAssetVault = await deploy<SingleAssetVault>(
    "SingleAssetVault",
    undefined, //no libs
    account0.address, // DAO
    foundry.address, // foundry
    hub.address, // hub
    meTokenRegistry.address, //IMeTokenRegistry
    migrationRegistry.address //IMigrationRegistry
  );
  await curveRegistry.approve(curve.address);
  await vaultRegistry.approve(singleAssetVault.address);
  await hub.initialize(
    foundry.address,
    vaultRegistry.address,
    curveRegistry.address
  );

  await hub.register(
    tokenAddr,
    singleAssetVault.address,
    curve.address,
    refundRatio, //refund ratio
    encodedCurveDetails,
    encodedVaultArgs
  );
  return {
    tokenAddr,
    weightedAverage,
    meTokenRegistry,
    meTokenFactory,
    curveRegistry,
    vaultRegistry,
    migrationRegistry,
    singleAssetVault,
    foundry,
    hub,
    token,
    account0,
    account1,
    account2,
    account3,
    tokenHolder,
    tokenWhale,
  };
}