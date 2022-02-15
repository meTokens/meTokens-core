import { Contract } from "@ethersproject/contracts";
import { ethers, getNamedAccounts } from "hardhat";
import { WeightedAverage } from "../../artifacts/types/WeightedAverage";
import { BancorABDK } from "../../artifacts/types/BancorABDK";
import { MeTokenFactory } from "../../artifacts/types/MeTokenFactory";
import { CurveRegistry } from "../../artifacts/types/CurveRegistry";
import { VaultRegistry } from "../../artifacts/types/VaultRegistry";
import { MigrationRegistry } from "../../artifacts/types/MigrationRegistry";
import { SingleAssetVault } from "../../artifacts/types/SingleAssetVault";
import { DiamondCutFacet } from "../../artifacts/types/DiamondCutFacet";
import { Diamond } from "../../artifacts/types/Diamond";
import { DiamondInit } from "../../artifacts/types/DiamondInit";
import { HubFacet } from "../../artifacts/types/HubFacet";
import { FoundryFacet } from "../../artifacts/types/FoundryFacet";
import { FeesFacet } from "../../artifacts/types/FeesFacet";
import { MeTokenRegistryFacet } from "../../artifacts/types/MeTokenRegistryFacet";
import { DiamondLoupeFacet } from "../../artifacts/types/DiamondLoupeFacet";
import { OwnershipFacet } from "../../artifacts/types/OwnershipFacet";
import { getSelectors } from "../../scripts/libraries/helpers";
import { ERC20 } from "../../artifacts/types/ERC20";
import { deploy, getContractAt } from "./helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { impersonate } from "./hardhatNode";
import { Signer } from "ethers";
import { ICurve } from "../../artifacts/types/ICurve";
import { expect } from "chai";

import { text } from "stream/consumers";
import { BancorPower, StepwiseCurve } from "../../artifacts/types";

export async function hubSetup(
  encodedCurveDetails: string,
  encodedVaultArgs: string,
  refundRatio: number,
  curveStr: string,
  fees?: number[],
  erc20Address?: string,
  erc20Whale?: string
): Promise<{
  foundry: FoundryFacet;
  hub: HubFacet;
  fee: FeesFacet;
  meTokenRegistry: MeTokenRegistryFacet;
  diamond: Diamond;
  meTokenFactory: MeTokenFactory;
  singleAssetVault: SingleAssetVault;
  curve: ICurve;
  curveRegistry: CurveRegistry;
  vaultRegistry: VaultRegistry;
  migrationRegistry: MigrationRegistry;
  account0: SignerWithAddress;
  account1: SignerWithAddress;
  account2: SignerWithAddress;
  account3: SignerWithAddress;
  token: ERC20;
  tokenAddr: string;
  tokenHolder: Signer;
  tokenWhale: string;
}> {
  const {
    foundry,
    hub,
    fee,
    meTokenRegistry,
    diamond,
    meTokenFactory,
    singleAssetVault,
    curve,
    curveRegistry,
    vaultRegistry,
    migrationRegistry,
    account0,
    account1,
    account2,
    account3,
  } = await hubSetupWithoutRegister(curveStr, fees);
  const { token, tokenAddr, tokenHolder, tokenWhale } = await tranferFromWhale(
    account1.address,
    erc20Address,
    erc20Whale
  );
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
    foundry,
    hub,
    fee,
    meTokenRegistry,
    diamond,
    meTokenFactory,
    singleAssetVault,
    curve,
    curveRegistry,
    vaultRegistry,
    migrationRegistry,
    account0,
    account1,
    account2,
    account3,
    token,
    tokenAddr,
    tokenHolder,
    tokenWhale,
  };
}
async function getCurve(curveType: string, diamond: string): Promise<ICurve> {
  switch (curveType) {
    case "BancorABDK":
      return (await deploy<BancorABDK>(
        "BancorABDK",
        undefined,
        diamond
      )) as unknown as ICurve;
    case "BancorPower":
      return (await deploy<BancorPower>(
        "BancorPower",
        undefined,
        diamond
      )) as unknown as ICurve;
    case "StepwiseCurve":
      return (await deploy<StepwiseCurve>(
        "StepwiseCurve",
        undefined,
        diamond
      )) as unknown as ICurve;
    default:
      return (await deploy<BancorABDK>(
        "BancorABDK",
        undefined,
        diamond
      )) as unknown as ICurve;
  }
}
export async function tranferFromWhale(
  recipientAddr: string,
  erc20Address?: string,
  erc20Whale?: string
): Promise<{
  tokenAddr: string;
  token: ERC20;
  tokenHolder: Signer;
  tokenWhale: string;
}> {
  let tokenAddr: string;

  let token: ERC20;
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
  token = await getContractAt<ERC20>("ERC20", tokenAddr);
  tokenHolder = await impersonate(tokenWhale);
  await token
    .connect(tokenHolder)
    .transfer(recipientAddr, ethers.utils.parseEther("1000"));
  return { token, tokenHolder, tokenWhale, tokenAddr };
}

export async function hubSetupWithoutRegister(
  curveStr: string,
  fees?: number[]
): Promise<{
  foundry: FoundryFacet;
  hub: HubFacet;
  meTokenRegistry: MeTokenRegistryFacet;
  diamond: Diamond;
  meTokenFactory: MeTokenFactory;
  singleAssetVault: SingleAssetVault;
  curve: ICurve;
  vaultRegistry: VaultRegistry;
  curveRegistry: CurveRegistry;
  migrationRegistry: MigrationRegistry;
  fee: FeesFacet;
  account0: SignerWithAddress;
  account1: SignerWithAddress;
  account2: SignerWithAddress;
  account3: SignerWithAddress;
}> {
  let foundry: FoundryFacet;
  let hub: HubFacet;
  let meTokenFactory: MeTokenFactory;
  let singleAssetVault: SingleAssetVault;
  let curve: ICurve;
  let meTokenRegistry: MeTokenRegistryFacet;
  let vaultRegistry: VaultRegistry;
  let curveRegistry: CurveRegistry;
  let migrationRegistry: MigrationRegistry;
  let fee: FeesFacet;
  let account0: SignerWithAddress;
  let account1: SignerWithAddress;
  let account2: SignerWithAddress;
  let account3: SignerWithAddress;

  [account0, account1, account2, account3] = await ethers.getSigners();

  curveRegistry = await deploy<CurveRegistry>("CurveRegistry");
  vaultRegistry = await deploy<VaultRegistry>("VaultRegistry");
  migrationRegistry = await deploy<MigrationRegistry>("MigrationRegistry");
  meTokenFactory = await deploy<MeTokenFactory>("MeTokenFactory");
  let feeInitialization = fees;
  if (!feeInitialization) {
    feeInitialization = [0, 0, 0, 0, 0, 0];
  }

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
  // Deploy contracts depending on hubFacet address,
  // which is actually the address of the diamond
  // meTokenRegistry = await deploy<MeTokenRegistry>(
  //   "MeTokenRegistry",
  //   undefined,
  //   foundry.address,
  //   diamond.address,
  //   meTokenFactory.address,
  //   migrationRegistry.address
  // );
  singleAssetVault = await deploy<SingleAssetVault>(
    "SingleAssetVault",
    undefined, //no libs
    account0.address, // DAO
    diamond.address, // foundry
    diamond.address, // hub
    diamond.address, //IMeTokenRegistry
    migrationRegistry.address //IMigrationRegistry
  );

  curve = await getCurve(curveStr, diamond.address);

  // Deploying facets
  const hubFacet = await deploy<HubFacet>("HubFacet");
  const foundryFacet = await deploy<FoundryFacet>("FoundryFacet");
  const feesFacet = await deploy<FeesFacet>("FeesFacet");
  const meTokenRegistryFacet = await deploy<MeTokenRegistryFacet>(
    "MeTokenRegistryFacet"
  );
  const diamondLoupeFacet = await deploy<DiamondLoupeFacet>(
    "DiamondLoupeFacet"
  );
  const ownershipFacet = await deploy<OwnershipFacet>("OwnershipFacet");
  const facets = [
    hubFacet,
    foundryFacet,
    feesFacet,
    meTokenRegistryFacet,
    diamondLoupeFacet,
    ownershipFacet,
  ];
  const cut = [];
  const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 };
  for (const facet of facets) {
    cut.push({
      facetAddress: facet.address,
      action: FacetCutAction.Add,
      functionSelectors: getSelectors(facet as unknown as Contract),
    });
  }

  // upgrade diamond w/ facets
  const diamondCut = await ethers.getContractAt("IDiamondCut", diamond.address);
  let args: any = [
    {
      mintFee: feeInitialization[0],
      burnBuyerFee: feeInitialization[1],
      burnOwnerFee: feeInitialization[2],
      transferFee: feeInitialization[3],
      interestFee: feeInitialization[4],
      yieldFee: feeInitialization[5],
      diamond: diamond.address,
      vaultRegistry: vaultRegistry.address,
      curveRegistry: curveRegistry.address,
      migrationRegistry: migrationRegistry.address,
      meTokenFactory: meTokenFactory.address,
    },
  ];
  // Note, this init contract is used similar to OZ's Initializable.initializer modifier
  const diamondInit = await deploy<DiamondInit>("DiamondInit");
  let functionCall = diamondInit.interface.encodeFunctionData("init", args);
  const tx = await diamondCut.diamondCut(
    cut,
    diamondInit.address,
    functionCall
  );
  const receipt = await tx.wait();

  hub = (await ethers.getContractAt("HubFacet", diamond.address)) as HubFacet;
  foundry = (await ethers.getContractAt(
    "FoundryFacet",
    diamond.address
  )) as FoundryFacet;
  fee = (await ethers.getContractAt("FeesFacet", diamond.address)) as FeesFacet;
  meTokenRegistry = (await ethers.getContractAt(
    "MeTokenRegistryFacet",
    diamond.address
  )) as MeTokenRegistryFacet;

  //
  // NOTE: end diamond deploy
  //
  await curveRegistry.approve(curve.address);
  await vaultRegistry.approve(singleAssetVault.address);
  return {
    foundry,
    hub,
    diamond,
    meTokenFactory,
    singleAssetVault,
    curve,
    meTokenRegistry,
    vaultRegistry,
    curveRegistry,
    migrationRegistry,
    fee,
    account0,
    account1,
    account2,
    account3,
  };
}
export async function addHubSetup(
  tokenAddr: string,
  hub: HubFacet,
  diamond: Diamond,
  foundry: FoundryFacet,
  curveType: string,
  meTokenRegistry: MeTokenRegistryFacet,
  curveRegistry: CurveRegistry,
  migrationRegistry: MigrationRegistry,
  vaultRegistry: VaultRegistry,
  encodedCurveDetails: string,
  encodedVaultArgs: string,
  refundRatio: number,
  daoAddress?: string,
  curve?: ICurve
): Promise<{
  hubId: number;
  curve: ICurve;
}> {
  let singleAssetVault: SingleAssetVault;
  let account0: SignerWithAddress;
  if (curve) {
    curve = curve;
  } else {
    curve = await getCurve(curveType, diamond.address);
  }

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
    curve,
  };
}
