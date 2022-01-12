import { ethers, getNamedAccounts } from "hardhat";
import { WeightedAverage } from "../../artifacts/types/WeightedAverage";
import { MeTokenRegistry } from "../../artifacts/types/MeTokenRegistry";
import { MeTokenFactory } from "../../artifacts/types/MeTokenFactory";
import { CurveRegistry } from "../../artifacts/types/CurveRegistry";
import { VaultRegistry } from "../../artifacts/types/VaultRegistry";
import { MigrationRegistry } from "../../artifacts/types/MigrationRegistry";
import { SingleAssetVault } from "../../artifacts/types/SingleAssetVault";
import { Foundry } from "../../artifacts/types/Foundry";
import { DiamondCutFacet } from "../../artifacts/types/DiamondCutFacet";
import { Diamond } from "../../artifacts/types/Diamond";
import { DiamondInit } from "../../artifacts/types/DiamondInit";
import { HubFacet } from "../../artifacts/types/HubFacet";
import { DiamondLoupeFacet } from "../../artifacts/types/DiamondLoupeFacet";
import { OwnershipFacet } from "../../artifacts/types/OwnershipFacet";
import { getSelectors } from "../../scripts/libraries/helpers";
import { ERC20 } from "../../artifacts/types/ERC20";
import { deploy, getContractAt } from "./helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { impersonate } from "./hardhatNode";
import { Signer } from "ethers";
import { ICurve } from "../../artifacts/types/ICurve";
import { Fees } from "../../artifacts/types/Fees";
import { expect } from "chai";

export async function hubSetup(
  encodedCurveDetails: string,
  encodedVaultArgs: string,
  refundRatio: number,
  curve: ICurve,
  fees?: number[],
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
  hub: HubFacet;
  token: ERC20;
  fee: Fees;
  account0: SignerWithAddress;
  account1: SignerWithAddress;
  account2: SignerWithAddress;
  account3: SignerWithAddress;
  tokenHolder: Signer;
  tokenWhale: string;
}> {
  const {
    tokenAddr,
    weightedAverage,
    meTokenRegistry,
    meTokenFactory,
    curveRegistry,
    vaultRegistry,
    migrationRegistry,
    singleAssetVault,
    foundry,
    fee,
    hub,
    token,
    account0,
    account1,
    account2,
    account3,
    tokenHolder,
    tokenWhale,
  } = await hubSetupWithoutRegister(curve, fees, erc20Address, erc20Whale);

  await hub.register(
    account0.address,
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
    fee,
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
export async function hubSetupWithoutRegister(
  curve: ICurve,
  fees?: number[],
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
  hub: HubFacet;
  token: ERC20;
  fee: Fees;
  account0: SignerWithAddress;
  account1: SignerWithAddress;
  account2: SignerWithAddress;
  account3: SignerWithAddress;
  tokenHolder: Signer;
  tokenWhale: string;
}> {
  let tokenAddr: string;
  let weightedAverage: WeightedAverage;
  let meTokenRegistry: MeTokenRegistry;
  let meTokenFactory: MeTokenFactory;
  let curveRegistry: CurveRegistry;
  let vaultRegistry: VaultRegistry;
  let migrationRegistry: MigrationRegistry;
  let singleAssetVault: SingleAssetVault;
  let foundry: Foundry;
  let fee: Fees;
  let hub: HubFacet;
  let token: ERC20;
  let account0: SignerWithAddress;
  let account1: SignerWithAddress;
  let account2: SignerWithAddress;
  let account3: SignerWithAddress;
  let tokenHolder: Signer;
  let tokenWhale: string;

  if (!erc20Address || !erc20Whale) {
    let DAI;
    let DAIWhale;
    ({ DAI, DAIWhale } = await getNamedAccounts());
    tokenWhale = DAIWhale;
    tokenAddr = DAI;
  } else {
    tokenAddr = erc20Address;
    tokenWhale = erc20Whale;
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

  meTokenFactory = await deploy<MeTokenFactory>("MeTokenFactory");

  //
  // NOTE: start diamond deploy
  //

  const diamondCutFacet = await deploy<DiamondCutFacet>("DiamondCutFacet");
  const diamond = await deploy<Diamond>(
    "Diamond",
    undefined,
    account0.address,
    diamondCutFacet.address
  );
  const diamondInit = await deploy<DiamondInit>("DiamondInit");

  // Deploying facets
  const hubFacet = await deploy<HubFacet>("HubFacet");
  hub = hubFacet;
  const diamondLoupeFacet = await deploy<DiamondLoupeFacet>(
    "DiamondLoupeFacet"
  );
  const ownershipFacet = await deploy<OwnershipFacet>("OwnershipFacet");
  const facets = [hubFacet, diamondLoupeFacet, ownershipFacet];
  const cut = [];
  const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 };
  for (const facet of facets) {
    cut.push({
      facetAddress: facet.address,
      action: FacetCutAction.Add,
      functionSelectors: getSelectors(facet),
    });
  }
  const diamondCut = await ethers.getContractAt("IDiamondCut", diamond.address);

  //
  // NOTE: end diamond deploy
  //

  meTokenRegistry = await deploy<MeTokenRegistry>(
    "MeTokenRegistry",
    undefined,
    foundry.address,
    hub.address,
    meTokenFactory.address,
    migrationRegistry.address
  );
  fee = await deploy<Fees>("Fees");
  let feeInitialization = fees;
  if (!feeInitialization) {
    feeInitialization = [0, 0, 0, 0, 0, 0];
  }
  await fee.initialize(
    feeInitialization[0],
    feeInitialization[1],
    feeInitialization[2],
    feeInitialization[3],
    feeInitialization[4],
    feeInitialization[5]
  );
  await foundry.initialize(hub.address, fee.address, meTokenRegistry.address);

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
    fee,
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

export async function addHubSetup(
  hub: HubFacet,
  foundry: Foundry,
  meTokenRegistry: MeTokenRegistry,
  curveRegistry: CurveRegistry,
  tokenAddr: string,
  migrationRegistry: MigrationRegistry,
  vaultRegistry: VaultRegistry,
  encodedCurveDetails: string,
  encodedVaultArgs: string,
  refundRatio: number,
  curve: ICurve,
  daoAddress?: string
): Promise<{
  hubId: number;
}> {
  let singleAssetVault: SingleAssetVault;
  let account0: SignerWithAddress;
  const isCurveApproved = await curveRegistry.isApproved(curve.address);
  if (!isCurveApproved) {
    await curveRegistry.approve(curve.address);
  }
  const isCurveApprovedAfter = await curveRegistry.isApproved(curve.address);
  expect(isCurveApprovedAfter).to.be.true;
  let dao = daoAddress;
  [account0] = await ethers.getSigners();
  if (!dao) {
    dao = account0.address;
  }

  singleAssetVault = await deploy<SingleAssetVault>(
    "SingleAssetVault",
    undefined, //no libs
    dao, // DAO
    foundry.address, // foundry
    hub.address, // hub
    meTokenRegistry.address, //IMeTokenRegistry
    migrationRegistry.address //IMigrationRegistry
  );

  await vaultRegistry.approve(singleAssetVault.address);

  await hub.register(
    account0.address,
    tokenAddr,
    singleAssetVault.address,
    curve.address,
    refundRatio, //refund ratio
    encodedCurveDetails,
    encodedVaultArgs
  );
  const hubId = (await hub.count()).toNumber();
  return {
    hubId,
  };
}
