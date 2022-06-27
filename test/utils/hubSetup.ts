import { BigNumber, Signer } from "ethers";
import { ethers, getNamedAccounts } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "@ethersproject/contracts";
import { deploy, getContractAt } from "./helpers";
import { impersonate } from "./hardhatNode";
import { getSelectors } from "../../scripts/libraries/helpers";
import {
  Diamond,
  DiamondInit,
  DiamondCutFacet,
  DiamondLoupeFacet,
  OwnershipFacet,
  ICurveFacet,
  FoundryFacet,
  HubFacet,
  MeTokenRegistryFacet,
  FeesFacet,
  ERC20,
  MeTokenFactory,
  VaultRegistry,
  MigrationRegistry,
  SingleAssetVault,
  CurveFacet,
  MockERC20,
} from "../../artifacts/types";

export async function hubSetup(
  baseY: BigNumber,
  reserveWeight: number,
  encodedVaultArgs: string,
  refundRatio: number,
  fees?: number[],
  erc20Address?: string,
  erc20Whale?: string,
  erc20Decimals?: number
): Promise<{
  foundry: FoundryFacet;
  hub: HubFacet;
  fee: FeesFacet;
  meTokenRegistry: MeTokenRegistryFacet;
  diamond: Diamond;
  meTokenFactory: MeTokenFactory;
  singleAssetVault: SingleAssetVault;
  curve: ICurveFacet;
  vaultRegistry: VaultRegistry;
  migrationRegistry: MigrationRegistry;
  account0: SignerWithAddress;
  account1: SignerWithAddress;
  account2: SignerWithAddress;
  account3: SignerWithAddress;
  account4: SignerWithAddress;
  token: ERC20;
  tokenAddr: string;
  whale: Signer;
  whaleAddr: string;
  mockToken: MockERC20;
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
    vaultRegistry,
    migrationRegistry,
    account0,
    account1,
    account2,
    account3,
    account4,
    mockToken,
  } = await hubSetupWithoutRegister(fees);

  const { token, tokenAddr, whale, whaleAddr } = await transferFromWhale(
    account1.address,
    erc20Address,
    erc20Whale,
    erc20Decimals
  );
  await hub.register(
    account0.address,
    tokenAddr,
    singleAssetVault.address,
    refundRatio, //refund ratio
    baseY,
    reserveWeight,
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
    vaultRegistry,
    migrationRegistry,
    account0,
    account1,
    account2,
    account3,
    account4,
    token,
    tokenAddr,
    whale,
    whaleAddr,
    mockToken,
  };
}

export async function transferFromWhale(
  recipient: string,
  erc20Address?: string,
  erc20Whale?: string,
  erc20Decimals?: number
): Promise<{
  tokenAddr: string;
  token: ERC20;
  whale: Signer;
  whaleAddr: string;
}> {
  let tokenAddr: string;
  let token: ERC20;
  let whale: Signer;
  let whaleAddr: string;
  let decimals: number;

  if (!erc20Address || !erc20Whale) {
    let DAI;
    let DAIWhale;
    ({ DAI, DAIWhale } = await getNamedAccounts());
    whaleAddr = DAIWhale;
    tokenAddr = DAI;
  } else {
    tokenAddr = erc20Address;
    whaleAddr = erc20Whale;
  }
  if (!erc20Decimals) {
    decimals = 18;
  }
  token = await getContractAt<ERC20>("ERC20", tokenAddr);
  whale = await impersonate(whaleAddr);
  await token
    .connect(whale)
    .transfer(recipient, ethers.utils.parseUnits("500", erc20Decimals));
  return { token, whale, whaleAddr, tokenAddr };
}

export async function hubSetupWithoutRegister(fees?: number[]): Promise<{
  foundry: FoundryFacet;
  hub: HubFacet;
  meTokenRegistry: MeTokenRegistryFacet;
  diamond: Diamond;
  meTokenFactory: MeTokenFactory;
  singleAssetVault: SingleAssetVault;
  curve: ICurveFacet;
  vaultRegistry: VaultRegistry;
  migrationRegistry: MigrationRegistry;
  fee: FeesFacet;
  account0: SignerWithAddress;
  account1: SignerWithAddress;
  account2: SignerWithAddress;
  account3: SignerWithAddress;
  account4: SignerWithAddress;
  mockToken: MockERC20;
}> {
  let foundry: FoundryFacet;
  let hub: HubFacet;
  let meTokenFactory: MeTokenFactory;
  let singleAssetVault: SingleAssetVault;
  let curve: ICurveFacet;
  let meTokenRegistry: MeTokenRegistryFacet;
  let vaultRegistry: VaultRegistry;
  let migrationRegistry: MigrationRegistry;
  let fee: FeesFacet;
  let account0: SignerWithAddress;
  let account1: SignerWithAddress;
  let account2: SignerWithAddress;
  let account3: SignerWithAddress;
  let account4: SignerWithAddress;

  [account0, account1, account2, account3, account4] =
    await ethers.getSigners();

  vaultRegistry = await deploy<VaultRegistry>("VaultRegistry");
  migrationRegistry = await deploy<MigrationRegistry>("MigrationRegistry");
  meTokenFactory = await deploy<MeTokenFactory>("MeTokenFactory");
  let feeInitialization = fees;
  if (!feeInitialization) {
    feeInitialization = [0, 0, 0 /* 0, 0, 0 */];
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

  singleAssetVault = await deploy<SingleAssetVault>(
    "SingleAssetVault",
    undefined, //no libs
    account0.address, // DAO
    diamond.address
  );

  const curveFacet = await deploy<CurveFacet>("CurveFacet");

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

  const mockToken = await deploy<MockERC20>("MockERC20");

  const facets = [
    hubFacet,
    foundryFacet,
    curveFacet,
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
      // transferFee: feeInitialization[3],
      // interestFee: feeInitialization[4],
      // yieldFee: feeInitialization[5],
      diamond: diamond.address,
      // me: mockToken.address,
      vaultRegistry: vaultRegistry.address,
      migrationRegistry: migrationRegistry.address,
      meTokenFactory: meTokenFactory.address,
    },
  ];
  // Note, this init contract is used similar to OZ's Initializable.initializer modifier
  const diamondInit = await deploy<DiamondInit>("DiamondInit");

  let functionCall = diamondInit.interface.encodeFunctionData("init", args);
  await diamondCut.diamondCut(cut, diamondInit.address, functionCall);
  hub = (await ethers.getContractAt("HubFacet", diamond.address)) as HubFacet;
  curve = (await ethers.getContractAt(
    "ICurveFacet",
    diamond.address
  )) as ICurveFacet;
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
    migrationRegistry,
    fee,
    account0,
    account1,
    account2,
    account3,
    account4,
    mockToken,
  };
}
export async function addHubSetup(
  tokenAddr: string,
  hub: HubFacet,
  diamond: Diamond,
  vaultRegistry: VaultRegistry,
  baseY: BigNumber,
  reserveWeight: number,
  encodedVaultArgs: string,
  refundRatio: number,
  daoAddress?: string
): Promise<{
  hubId: number;
  curve: ICurveFacet;
}> {
  let singleAssetVault: SingleAssetVault;
  let account0: SignerWithAddress;
  let curve = await getContractAt<ICurveFacet>("ICurveFacet", diamond.address);

  let dao = daoAddress;
  [account0] = await ethers.getSigners();
  if (!dao) {
    dao = account0.address;
  }
  singleAssetVault = await deploy<SingleAssetVault>(
    "SingleAssetVault",
    undefined, //no libs
    dao, // DAO
    diamond.address
  );

  await vaultRegistry.approve(singleAssetVault.address);

  await hub.register(
    account0.address,
    tokenAddr,
    singleAssetVault.address,
    refundRatio, //refund ratio
    baseY,
    reserveWeight,
    encodedVaultArgs
  );
  const hubId = (await hub.count()).toNumber();
  return {
    hubId,
    curve,
  };
}
