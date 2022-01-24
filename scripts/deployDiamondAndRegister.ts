import { deploy } from "../test/utils/helpers";
import { network, run, ethers, getNamedAccounts } from "hardhat";
import { DiamondCutFacet } from "../artifacts/types/DiamondCutFacet";
import { Diamond } from "../artifacts/types/Diamond";
import { DiamondInit } from "../artifacts/types/DiamondInit";
import { HubFacet } from "../artifacts/types/HubFacet";
import { DiamondLoupeFacet } from "../artifacts/types/DiamondLoupeFacet";
import { OwnershipFacet } from "../artifacts/types/OwnershipFacet";
import { getSelectors } from "./libraries/helpers";
import {
  BancorABDK,
  CurveRegistry,
  Fees,
  Foundry,
  MigrationRegistry,
  SingleAssetVault,
  VaultRegistry,
  WeightedAverage,
} from "../artifacts/types";

/**
 deploy diamond steps:
diamondCutFacet
diamond
--- deploy weightedAverage
--- deploy fee
--- deploy foundry 
--- deploy registries (curve, migration and vault)
--- deploy a vault 
--- deploy curves
diamondInit
diamond facets (hub, metoken registry, ownership)
 internal call diamond init (foundry, registries)
 call approve curves
 call approve vaults
 call hub.register

 
 */
const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 };
const ETHERSCAN_CHAIN_IDS = [1, 3, 4, 5, 42];
const SUPPORTED_NETWORK = [1, 4, 100, 31337];

async function main() {
  const [deployer, DAO] = await ethers.getSigners();
  const deployerAddr = await deployer.getAddress();
  const { DAI } = await getNamedAccounts();

  const tokenAddr = DAI;
  const address = await deployer.getAddress();
  if (!deployer.provider) {
    process.exit(1);
  }
  const { chainId } = await deployer.provider.getNetwork();

  if (SUPPORTED_NETWORK.indexOf(chainId) === -1)
    throw new Error("Un-supported network");

  console.log("Deploying on network", network.name);
  console.log("Deployer address:", deployerAddr);

  const diamondCutFacet = await deploy<DiamondCutFacet>("DiamondCutFacet");
  console.log("\nDiamondCutFacet deployed at:", diamondCutFacet.address);

  const diamond = await deploy<Diamond>(
    "Diamond",
    undefined,
    deployer.address,
    diamondCutFacet.address
  );
  console.log("Diamond deployed at:", diamond.address);
  const weightedAverage = await deploy<WeightedAverage>("WeightedAverage");
  console.log("weightedAverage deployed at:", weightedAverage.address);
  const fee = await deploy<Fees>("Fees");
  console.log("Fees deployed at:", fee.address);
  const foundry = await deploy<Foundry>("Foundry", {
    WeightedAverage: weightedAverage.address,
  });
  console.log("foundry deployed at:", foundry.address);
  let feeInitialization = [0, 0, 0, 0, 0, 0];

  await fee.initialize(
    feeInitialization[0],
    feeInitialization[1],
    feeInitialization[2],
    feeInitialization[3],
    feeInitialization[4],
    feeInitialization[5]
  );
  await foundry.initialize(diamond.address, fee.address, diamond.address);

  // const curveRegistry = await deploy<CurveRegistry>("CurveRegistry");
  // const migrationRegistry = await deploy<MigrationRegistry>(
  //   "MigrationRegistry"
  // );
  // const vaultRegistry = await deploy<VaultRegistry>("VaultRegistry");
  const singleAssetVault = await deploy<SingleAssetVault>(
    "SingleAssetVault",
    undefined, //no libs
    DAO.address, // DAO
    foundry.address, // foundry
    diamond.address, // hub
    diamond.address, //IMeTokenRegistry
    migrationRegistry.address //IMigrationRegistry
  );

  console.log("singleAssetVault deployed at:", singleAssetVault.address);
  const curve = await deploy<BancorABDK>(
    "BancorABDK",
    undefined,
    diamond.address
  );
  console.log("curve deployed at:", curve.address);

  const diamondInit = await deploy<DiamondInit>("DiamondInit");
  console.log("DiamondInit deployed at:", diamondInit.address);

  // deploy facets
  console.log("\nDeploying Facets...");
  const hubFacet = await deploy<HubFacet>("HubFacet");
  console.log("HubFacet deployed at:", hubFacet.address);
  const diamondLoupeFacet = await deploy<DiamondLoupeFacet>(
    "DiamondLoupeFacet"
  );
  console.log("DiamondLoupeFacet deployed at:", diamondLoupeFacet.address);
  const ownershipFacet = await deploy<OwnershipFacet>("OwnershipFacet");
  console.log("OwnershipFacet deployed at:", ownershipFacet.address);

  const facets = [hubFacet, diamondLoupeFacet, ownershipFacet];
  const cut = [];
  for (const facet of facets) {
    cut.push({
      facetAddress: facet.address,
      action: FacetCutAction.Add,
      functionSelectors: getSelectors(facet),
    });
  }

  // Upgrade diamond w/ facets
  console.log("\nDiamond Cut:", cut);
  const diamondCut = await ethers.getContractAt("IDiamondCut", diamond.address);
  let tx;
  let receipt;
  let args: any = [
    {
      foundry: foundry.address,
      vaultRegistry: vaultRegistry.address,
      curveRegistry: curveRegistry.address,
      migrationRegistry: migrationRegistry.address,
    },
  ];
  // call to init function
  let functionCall = diamondInit.interface.encodeFunctionData("init", args);
  tx = await diamondCut.diamondCut(cut, diamondInit.address, functionCall);
  console.log("Diamond cut tx: ", tx.hash);
  receipt = await tx.wait();
  if (!receipt.status) {
    throw Error(`Diamond upgrade failed: ${tx.hash}`);
  }
  await curveRegistry.approve(curve.address);
  await vaultRegistry.approve(singleAssetVault.address);
  console.log("curve and singleAssetVault approved");
  let baseY = ethers.utils.parseEther("1");
  let reserveWeight = 250000;
  let encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint32"],
    [baseY, reserveWeight]
  );
  let encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
    ["address"],
    [DAI]
  );
  const hub = await ethers.getContractAt("HubFacet", diamond.address);
  await hub.register(
    deployerAddr,
    tokenAddr,
    singleAssetVault.address,
    curve.address,
    50000, //refund ratio
    encodedCurveDetails,
    encodedVaultArgs
  );

  console.log("hub registered");
  const hubId = (await hub.count()).toNumber();
  console.log("hubId: ", hubId);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
