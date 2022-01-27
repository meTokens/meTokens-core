import { Contract } from "@ethersproject/contracts";
import { ethers, getNamedAccounts } from "hardhat";
import { WeightedAverage } from "../../artifacts/types/WeightedAverage";
import { MeTokenRegistry } from "../../artifacts/types/MeTokenRegistry";
import { BancorABDK } from "../../artifacts/types/BancorABDK";
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

import { text } from "stream/consumers";
import { BancorPower, StepwiseCurve } from "../../artifacts/types";

export async function hubSetup(
  encodedCurveDetails: string,
  encodedVaultArgs: string,
  refundRatio: number,
  // hub: HubFacet,
  // foundry: Foundry,
  // curve: ICurve,
  curveStr: string,
  fees?: number[],
  erc20Address?: string,
  erc20Whale?: string
): Promise<{
  tokenAddr: string;
  foundry: Foundry;
  hub: HubFacet;
  diamond: Diamond;
  meTokenFactory: MeTokenFactory;
  singleAssetVault: SingleAssetVault;
  hubCurve: ICurve;
  meTokenRegistry: MeTokenRegistry;
  curveRegistry: CurveRegistry;
  vaultRegistry: VaultRegistry;
  migrationRegistry: MigrationRegistry;
  fee: Fees;
  token: ERC20;
  account0: SignerWithAddress;
  account1: SignerWithAddress;
  account2: SignerWithAddress;
  account3: SignerWithAddress;
  tokenHolder: Signer;
  tokenWhale: string;
}> {
  const {
    tokenAddr,
    foundry,
    hub,
    diamond,
    meTokenFactory,
    singleAssetVault,
    hubCurve,
    meTokenRegistry,
    curveRegistry,
    vaultRegistry,
    migrationRegistry,
    fee,
    token,
    account0,
    account1,
    account2,
    account3,
    tokenHolder,
    tokenWhale,
  } = await hubSetupWithoutRegister(
    // hub,
    // foundry,
    curveStr,
    fees,
    erc20Address,
    erc20Whale
  );
  await hub.register(
    account0.address,
    tokenAddr,
    singleAssetVault.address,
    hubCurve.address,
    refundRatio, //refund ratio
    encodedCurveDetails,
    encodedVaultArgs
  );
  return {
    tokenAddr,
    foundry,
    hub,
    diamond,
    meTokenFactory,
    singleAssetVault,
    hubCurve,
    meTokenRegistry,
    curveRegistry,
    vaultRegistry,
    migrationRegistry,
    fee,
    token,
    account0,
    account1,
    account2,
    account3,
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
export async function hubSetupWithoutRegister(
  // hub: HubFacet,
  // foundry: Foundry,
  curveStr: string,
  fees?: number[],
  erc20Address?: string,
  erc20Whale?: string
): Promise<{
  tokenAddr: string;
  foundry: Foundry;
  hub: HubFacet;
  diamond: Diamond;
  meTokenFactory: MeTokenFactory;
  singleAssetVault: SingleAssetVault;
  hubCurve: ICurve;
  meTokenRegistry: MeTokenRegistry;
  vaultRegistry: VaultRegistry;
  curveRegistry: CurveRegistry;
  migrationRegistry: MigrationRegistry;
  fee: Fees;
  token: ERC20;
  account0: SignerWithAddress;
  account1: SignerWithAddress;
  account2: SignerWithAddress;
  account3: SignerWithAddress;
  tokenHolder: Signer;
  tokenWhale: string;
}> {
  let tokenAddr: string;
  let foundry: Foundry;
  let hub: HubFacet;
  let meTokenFactory: MeTokenFactory;
  let singleAssetVault: SingleAssetVault;
  let hubCurve: ICurve;
  let meTokenRegistry: MeTokenRegistry;
  let vaultRegistry: VaultRegistry;
  let curveRegistry: CurveRegistry;
  let migrationRegistry: MigrationRegistry;
  let fee: Fees;
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
  await token
    .connect(tokenHolder)
    .transfer(account1.address, ethers.utils.parseEther("1000"));
  curveRegistry = await deploy<CurveRegistry>("CurveRegistry");
  vaultRegistry = await deploy<VaultRegistry>("VaultRegistry");
  migrationRegistry = await deploy<MigrationRegistry>("MigrationRegistry");
  const weightedAverage = await deploy<WeightedAverage>("WeightedAverage");
  foundry = await deploy<Foundry>("Foundry", {
    WeightedAverage: weightedAverage.address,
  });
  meTokenFactory = await deploy<MeTokenFactory>("MeTokenFactory");
  fee = await deploy<Fees>("Fees");
  let feeInitialization = fees;
  if (!feeInitialization) {
    feeInitialization = [0, 0, 0, 0, 0, 0];
  }
  const txa = await fee.initialize(
    feeInitialization[0],
    feeInitialization[1],
    feeInitialization[2],
    feeInitialization[3],
    feeInitialization[4],
    feeInitialization[5]
  );
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
  meTokenRegistry = await deploy<MeTokenRegistry>(
    "MeTokenRegistry",
    undefined,
    foundry.address,
    diamond.address,
    meTokenFactory.address,
    migrationRegistry.address
  );
  singleAssetVault = await deploy<SingleAssetVault>(
    "SingleAssetVault",
    undefined, //no libs
    account0.address, // DAO
    foundry.address, // foundry
    diamond.address, // hub
    meTokenRegistry.address, //IMeTokenRegistry
    migrationRegistry.address //IMigrationRegistry
  );

  hubCurve = await getCurve(curveStr, diamond.address);
  await foundry.initialize(
    diamond.address,
    fee.address,
    meTokenRegistry.address
  );

  // Deploying facets
  const hubFacet = await deploy<HubFacet>("HubFacet");
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
      functionSelectors: getSelectors(facet as unknown as Contract),
    });
  }

  // upgrade diamond w/ facets
  const diamondCut = await ethers.getContractAt("IDiamondCut", diamond.address);
  let args: any = [
    {
      foundry: foundry.address,
      vaultRegistry: vaultRegistry.address,
      curveRegistry: curveRegistry.address,
      migrationRegistry: migrationRegistry.address,
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

  //
  // NOTE: end diamond deploy
  //
  await curveRegistry.approve(hubCurve.address);
  await vaultRegistry.approve(singleAssetVault.address);
  return {
    tokenAddr,
    foundry,
    hub,
    diamond,
    meTokenFactory,
    singleAssetVault,
    hubCurve,
    meTokenRegistry,
    vaultRegistry,
    curveRegistry,
    migrationRegistry,
    fee,
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
  tokenAddr: string,
  hub: HubFacet,
  diamond: Diamond,
  foundry: Foundry,
  curveType: string,
  meTokenRegistry: MeTokenRegistry,
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
  hubCurve: ICurve;
}> {
  let singleAssetVault: SingleAssetVault;
  let account0: SignerWithAddress;
  let hubCurve: ICurve;
  if (curve) {
    hubCurve = curve;
  } else {
    hubCurve = await getCurve(curveType, diamond.address);
  }

  const isCurveApproved = await curveRegistry.isApproved(hubCurve.address);
  if (!isCurveApproved) {
    await curveRegistry.approve(hubCurve.address);
  }
  const isCurveApprovedAfter = await curveRegistry.isApproved(hubCurve.address);
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
    hubCurve.address,
    refundRatio, //refund ratio
    encodedCurveDetails,
    encodedVaultArgs
  );
  const hubId = (await hub.count()).toNumber();
  return {
    hubId,
    hubCurve,
  };
}
