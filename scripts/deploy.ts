import { Contract } from "@ethersproject/contracts";
import { deploy } from "../test/utils/helpers";
import fs from "fs";
import { network, run, ethers, getNamedAccounts } from "hardhat";
import { getSelectors } from "./libraries/helpers";
import {
  MinimalForwarder,
  MigrationRegistry,
  VaultRegistry,
  DiamondCutFacet,
  Diamond,
  DiamondInit,
  SingleAssetVault,
  MeTokenFactory,
  HubFacet,
  FoundryFacet,
  CurveFacet,
  FeesFacet,
  MeTokenRegistryFacet,
  DiamondLoupeFacet,
  OwnershipFacet,
} from "../artifacts/types";
import { verifyContract } from "./utils";

const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 };
const ETHERSCAN_CHAIN_IDS = [1, 3, 4, 5, 42];
const SUPPORTED_NETWORK = [1, 4, 5, 42, 100, 31337];
const REFUND_RATIO = 800000;
const contracts: { name?: string; address: string }[] = [];
const deployDir = "deployment";
const feeInitialization = [0, 0, 0];

async function main() {
  let [deployer] = await ethers.getSigners();
  const deployerAddr = await deployer.getAddress();
  // NOTE: this is meTokens mainnet msig
  let DAO = "0xee4a339c6E3E4637F8Ec86A4E4555dcc3D70ccD8";
  const { DAI } = await getNamedAccounts();

  const tokenAddr = DAI;
  if (!deployer.provider) {
    process.exit(1);
  }
  const { chainId } = await deployer.provider.getNetwork();

  if (SUPPORTED_NETWORK.indexOf(chainId) === -1)
    throw new Error("Un-supported network");

  console.log("Deploying on network", network.name);
  console.log("Deployer address:", deployerAddr);

  const minimalForwarder = await deploy<MinimalForwarder>("MinimalForwarder");
  console.log("minimalForwarder deployed at:", minimalForwarder.address);

  const migrationRegistry = await deploy<MigrationRegistry>(
    "MigrationRegistry"
  );
  console.log("migrationRegistry deployed at:", migrationRegistry.address);
  contracts.push({
    name: "contracts/registries/MigrationRegistry.sol:MigrationRegistry",
    address: migrationRegistry.address,
  });

  const vaultRegistry = await deploy<VaultRegistry>("VaultRegistry");
  console.log("vaultRegistry deployed at:", vaultRegistry.address);
  contracts.push({
    name: "contracts/registries/VaultRegistry.sol:VaultRegistry",
    address: vaultRegistry.address,
  });

  const diamondCutFacet = await deploy<DiamondCutFacet>("DiamondCutFacet");
  console.log("\nDiamondCutFacet deployed at:", diamondCutFacet.address);
  contracts.push({
    name: "contracts/facets/DiamondCutFacet.sol:DiamondCutFacet",
    address: diamondCutFacet.address,
  });

  const diamond = await deploy<Diamond>(
    "Diamond",
    undefined,
    deployerAddr,
    diamondCutFacet.address
  );
  console.log("Diamond deployed at:", diamond.address);

  const singleAssetVault = await deploy<SingleAssetVault>(
    "SingleAssetVault",
    undefined, //no libs
    DAO, // DAO
    diamond.address
  );
  console.log("singleAssetVault deployed at:", singleAssetVault.address);

  const meTokenFactory = await deploy<MeTokenFactory>("MeTokenFactory");
  console.log("MeTokenFactory deployed at:", meTokenFactory.address);
  contracts.push({
    name: "contracts/MeTokenFactory.sol:MeTokenFactory",
    address: meTokenFactory.address,
  });

  // deploy facets
  console.log("\nDeploying Facets...");

  const hubFacet = await deploy<HubFacet>("HubFacet");
  console.log("HubFacet deployed at:", hubFacet.address);
  contracts.push({
    name: "contracts/facets/HubFacet.sol:HubFacet",
    address: hubFacet.address,
  });

  const foundryFacet = await deploy<FoundryFacet>("FoundryFacet");
  console.log("FoundryFacet deployed at:", foundryFacet.address);
  contracts.push({
    name: "contracts/facets/FoundryFacet.sol:FoundryFacet",
    address: foundryFacet.address,
  });

  const curveFacet = await deploy<CurveFacet>("CurveFacet");
  console.log("CurveFacet deployed at:", curveFacet.address);
  contracts.push({
    name: "contracts/facets/CurveFacet.sol:CurveFacet",
    address: curveFacet.address,
  });

  const feesFacet = await deploy<FeesFacet>("FeesFacet");
  console.log("FeesFacet deployed at:", feesFacet.address);
  contracts.push({
    name: "contracts/facets/FeesFacet.sol:FeesFacet",
    address: feesFacet.address,
  });

  const meTokenRegistryFacet = await deploy<MeTokenRegistryFacet>(
    "MeTokenRegistryFacet"
  );
  console.log(
    "MeTokenRegistryFacet deployed at:",
    meTokenRegistryFacet.address
  );
  contracts.push({
    name: "contracts/facets/MeTokenRegistryFacet.sol:MeTokenRegistryFacet",
    address: meTokenRegistryFacet.address,
  });

  const diamondLoupeFacet = await deploy<DiamondLoupeFacet>(
    "DiamondLoupeFacet"
  );
  console.log("DiamondLoupeFacet deployed at:", diamondLoupeFacet.address);
  contracts.push({
    name: "contracts/facets/DiamondLoupeFacet.sol:DiamondLoupeFacet",
    address: diamondLoupeFacet.address,
  });

  const ownershipFacet = await deploy<OwnershipFacet>("OwnershipFacet");
  console.log("OwnershipFacet deployed at:", ownershipFacet.address);
  contracts.push({
    name: "contracts/facets/OwnershipFacet.sol:OwnershipFacet",
    address: ownershipFacet.address,
  });

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
  for (const facet of facets) {
    cut.push({
      facetAddress: facet.address,
      action: FacetCutAction.Add,
      functionSelectors: getSelectors(facet as unknown as Contract),
    });
  }

  // Upgrade diamond w/ facets
  console.log("\nDiamond Cut successful");
  const diamondCut = await ethers.getContractAt(
    "IDiamondCutFacet",
    diamond.address
  );
  let tx;
  let receipt;
  let args: any = [
    {
      mintFee: feeInitialization[0],
      burnBuyerFee: feeInitialization[1],
      burnOwnerFee: feeInitialization[2],
      diamond: diamond.address,
      vaultRegistry: vaultRegistry.address,
      migrationRegistry: migrationRegistry.address,
      meTokenFactory: meTokenFactory.address,
    },
  ];

  // call to init function
  const diamondInit = await deploy<DiamondInit>("DiamondInit");
  console.log("DiamondInit deployed at:", diamondInit.address);
  contracts.push({
    name: "contracts/DiamondInit.sol:DiamondInit",
    address: diamondInit.address,
  });

  let functionCall = diamondInit.interface.encodeFunctionData("init", args);
  tx = await diamondCut.diamondCut(cut, diamondInit.address, functionCall);
  console.log("Diamond cut tx: ", tx.hash);
  receipt = await tx.wait();
  if (!receipt.status) {
    throw Error(`Diamond upgrade failed: ${tx.hash}`);
  }
  tx = await vaultRegistry.approve(singleAssetVault.address);
  receipt = await tx.wait();
  console.log("singleAssetVault approved");
  let baseY = ethers.utils.parseEther("1");
  let reserveWeight = 500000;
  let encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
    ["address"],
    [DAI]
  );

  // Set facets to their proxies
  const hub = (await ethers.getContractAt(
    "HubFacet",
    diamond.address
  )) as HubFacet;

  // register first hub
  tx = await hub.register(
    deployerAddr,
    tokenAddr,
    singleAssetVault.address,
    REFUND_RATIO, //refund ratio
    baseY,
    reserveWeight,
    encodedVaultArgs
  );
  await tx.wait();
  console.log("hub registered");
  receipt = await deployer.provider.getTransactionReceipt(tx.hash);

  // Verify contracts on etherscan
  const deploymentInfo = {
    network: network.name,
    "Minimal Forwarder": minimalForwarder.address,
    "Diamond Cut Facet Contract Address:": diamondCutFacet.address,
    "Diamond Loupe Facet Contract Address:": diamondLoupeFacet.address,
    "Diamond Contract Address:": diamond.address,
    "Curve Facet": curveFacet.address,
    "Hub Facet Contract Address": hubFacet.address,
    "Fee Facet Contract Address": feesFacet.address,
    "Foundry Facet Contract Address": foundryFacet.address,
    "MeToken Registry Facet Contract Address": meTokenRegistryFacet.address,
    "Ownership Facet Contract Address": ownershipFacet.address,
    "VaultRegistry Contract Address": vaultRegistry.address,
    "Migration Registry Contract Address": migrationRegistry.address,
    "SingleAsset Vault Contract Address": singleAssetVault.address,
    "MeToken Factory Contract Address": meTokenFactory.address,
    "Block Number": receipt.blockNumber.toString(),
  };

  if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir);
  }

  fs.writeFileSync(
    `${deployDir}/script-${network.name}.json`,
    JSON.stringify(deploymentInfo, undefined, 2)
  );
  console.log(
    `Latest Contract Address written to: ${deployDir}/script-${network.name}.json`
  );

  const isEtherscan =
    ETHERSCAN_CHAIN_IDS.includes(chainId) && network.name != "hardhat";
  if (isEtherscan) {
    await tx.wait(5);
    console.log("Verifying Contracts...\n");

    await verifyContract("SingleAssetVault", singleAssetVault.address, [
      DAO,
      diamond.address,
    ]);
    await verifyContract("Diamond", diamond.address, [
      deployer.address,
      diamondCutFacet.address,
    ]);

    for (let i = 0; i < contracts.length; ++i) {
      try {
        await run("verify", {
          contract: contracts[i].name || undefined,
          address: contracts[i].address,
          constructorArguments: [],
        });
      } catch (error) {
        console.error(`Error verifying ${contracts[i].address}: `, error);
      }
    }

    console.log("\nVerified Contracts.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
