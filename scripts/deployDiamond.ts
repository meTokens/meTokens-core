import { deploy } from "../test/utils/helpers";
import { network, run, ethers, getNamedAccounts } from "hardhat";
import { DiamondCutFacet } from "../artifacts/types/DiamondCutFacet";
import { Diamond } from "../artifacts/types/Diamond";
import { DiamondInit } from "../artifacts/types/DiamondInit";
import { HubFacet } from "../artifacts/types/HubFacet";
import { DiamondLoupeFacet } from "../artifacts/types/DiamondLoupeFacet";
import { OwnershipFacet } from "../artifacts/types/OwnershipFacet";
import { getSelectors } from "./libraries/helpers";

const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 };
const ETHERSCAN_CHAIN_IDS = [1, 3, 4, 5, 42];
const SUPPORTED_NETWORK = [1, 4, 100, 31337];

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddr = await deployer.getAddress();

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
      foundry: "0x00000000005dbcB0d0513FcDa746382Fe8a53468",
      vaultRegistry: "0x00000000005dbcB0d0513FcDa746382Fe8a53468",
      curveRegistry: "0x00000000005dbcB0d0513FcDa746382Fe8a53468",
      migrationRegistry: "0x00000000005dbcB0d0513FcDa746382Fe8a53468",
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
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
