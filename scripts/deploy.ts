import { Contract } from "@ethersproject/contracts";
import { deploy } from "../test/utils/helpers";
import fs from "fs";
import { network, run, ethers, getNamedAccounts } from "hardhat";
import { DiamondCutFacet } from "../artifacts/types/contracts/facets/DiamondCutFacet";
import { Diamond } from "../artifacts/types/contracts/Diamond";
import { DiamondInit } from "../artifacts/types/contracts/DiamondInit";
import { HubFacet } from "../artifacts/types/contracts/facets/HubFacet";
import { FoundryFacet } from "../artifacts/types/contracts/facets/FoundryFacet";
import { FeesFacet } from "../artifacts/types/contracts/facets/FeesFacet";
import { MeTokenRegistryFacet } from "../artifacts/types/contracts/facets/MeTokenRegistryFacet";
import { DiamondLoupeFacet } from "../artifacts/types/contracts/facets/DiamondLoupeFacet";
import { OwnershipFacet } from "../artifacts/types/contracts/facets/OwnershipFacet";
import { getSelectors } from "./libraries/helpers";
import {
  CurveFacet,
  GovernanceTimeLock,
  MEGovernor,
  METoken,
  MeTokenFactory,
  MigrationRegistry,
  SingleAssetVault,
  VaultRegistry,
} from "../artifacts/types";
import { verifyContract } from "./utils";
import { BigNumber, utils } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 };
const ETHERSCAN_CHAIN_IDS = [1, 3, 4, 5, 42];
const SUPPORTED_NETWORK = [1, 4, 42, 100, 31337];
const REFUND_RATIO = 800000;
const contracts: { name?: string; address: string }[] = [];
const deployDir = "deployment";
const decimals: BigNumber = ethers.utils.parseEther("1");
const feeInitialization = [0, 0, 0];
const VOTING_PERIOD = 45992; //blocks = 1 week
const VOTING_DELAY = 1; //block
const TIMELOCK_DELAY = 6575; //block = 1 day
const TIMELOCK_ADMIN_ROLE = utils.solidityKeccak256(
  ["string"],
  ["TIMELOCK_ADMIN_ROLE"]
);
const PROPOSER_ROLE = utils.solidityKeccak256(["string"], ["PROPOSER_ROLE"]);
const EXECUTOR_ROLE = utils.solidityKeccak256(["string"], ["EXECUTOR_ROLE"]);
const CANCELLER_ROLE = utils.solidityKeccak256(["string"], ["CANCELLER_ROLE"]);

async function governance(
  deployer: SignerWithAddress,
  proposer: SignerWithAddress
): Promise<{ name?: string; address: string }[]> {
  const tokenFactory = await ethers.getContractFactory("METoken");
  const timeLockFactory = await ethers.getContractFactory("GovernanceTimeLock");
  const govFactory = await ethers.getContractFactory("MEGovernor");

  // MeToken
  const gToken = (await tokenFactory.deploy()) as METoken;

  // GovernanceTimeLock
  // we don't add proposers or executors as they are already added in the constructor
  const timelock = (await timeLockFactory.deploy(
    TIMELOCK_DELAY,
    [],
    []
  )) as GovernanceTimeLock;

  // MeGovernor
  const governor = (await govFactory.deploy(
    gToken.address,
    timelock.address
  )) as MEGovernor;

  //setup timelock

  // we can assign this role to the special zero address to allow anyone to execute
  await timelock.grantRole(EXECUTOR_ROLE, ethers.constants.AddressZero);
  // Proposer role is in charge of queueing operations this is the role the Governor instance should be granted
  // and it should likely be the only proposer in the system.
  await timelock.grantRole(PROPOSER_ROLE, governor.address);
  await timelock.grantRole(CANCELLER_ROLE, governor.address);

  // this is a very sensitive role that will be granted automatically to both deployer and timelock itself
  // should be renounced by the deployer after setup.
  await timelock.revokeRole(TIMELOCK_ADMIN_ROLE, deployer.address);

  /*  await Timelock.grantRole(PROPOSER_ROLE, governor.address);
  await Timelock.grantRole(PROPOSER_ROLE, proposer.address);
  await Timelock.grantRole(EXECUTOR_ROLE, governor.address);
  await Timelock.grantRole(CANCELLER_ROLE, governor.address);
  await Timelock.grantRole(CANCELLER_ROLE, owner.address); */

  //setup token
  await gToken.mint(deployer.address, BigNumber.from(100000).mul(decimals));
  await gToken.mint(proposer.address, BigNumber.from(100000).mul(decimals));
  await gToken.transferOwnership(timelock.address);

  // need to self delegate as minting doesn't accrue voting power
  await gToken.connect(deployer).delegate(deployer.address);
  await gToken.connect(proposer).delegate(proposer.address);
  const contracts = [];
  contracts.push({
    name: "contracts/governance/METoken.sol:METoken",
    address: gToken.address,
  });
  contracts.push({
    name: "contracts/governance/MEGovernor.sol:MEGovernor",
    address: governor.address,
  });
  contracts.push({
    name: "contracts/governance/GovernanceTimeLock.sol:GovernanceTimeLock",
    address: timelock.address,
  });
  return contracts;
}

async function main() {
  let [deployer, DAO, proposer] = await ethers.getSigners();
  const deployerAddr = await deployer.getAddress();
  // NOTE: this is done when PK is used over mnemonic
  DAO = deployer;
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
    DAO.address, // DAO
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
  const diamondCut = await ethers.getContractAt("IDiamondCut", diamond.address);
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
  await vaultRegistry.approve(singleAssetVault.address);
  console.log("curve and singleAssetVault approved");
  let baseY = ethers.utils.parseEther("1");
  let reserveWeight = 500000;
  let encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
    ["address"],
    [DAI]
  );

  // deploy governance contracts
  const govCtrcts = await governance(deployer, proposer);
  govCtrcts.forEach((c) => contracts.push(c));

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
      DAO.address,
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
