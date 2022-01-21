import { network, run, ethers, getNamedAccounts } from "hardhat";
import { Hub } from "../artifacts/types/Hub";
import { VaultRegistry } from "../artifacts/types/VaultRegistry";
import { SingleAssetVault } from "../artifacts/types/SingleAssetVault";
import fs from "fs";
import { deploy } from "../test/utils/helpers";
import { MeTokenFactory } from "../artifacts/types/MeTokenFactory";
import { MeTokenRegistry } from "../artifacts/types/MeTokenRegistry";
import { BancorABDK } from "../artifacts/types/BancorABDK";
import { CurveRegistry } from "../artifacts/types/CurveRegistry";
import { Foundry } from "../artifacts/types/Foundry";
import { WeightedAverage } from "../artifacts/types/WeightedAverage";
import { BigNumber } from "ethers";
import { MigrationRegistry } from "../artifacts/types/MigrationRegistry";
import { Fees } from "../artifacts/types/Fees";
import { verifyContract } from "./utils";

const ETHERSCAN_CHAIN_IDS = [1, 3, 4, 5, 42];
const SUPPORTED_NETWORK = [1, 4, 100, 31337];
const deployDir = "deployment";
const contracts: { name?: string; address: string }[] = [];
const REFUND_RATIO = 800000;
const MAX_WEIGHT = 1000000;
const RESERVE_WEIGHT = BigNumber.from(MAX_WEIGHT).div(2).toString();
const baseY = ethers.utils.parseEther("1000").toString();
const MINT_FEE = 0;
const BURN_BUYER_FEE = 0;
const BURN_OWNER_FEE = 0;
const TRANSFER_FEE = 0;
const INTEREST_FEE = 0;
const YIELD_FEE = 0;
let DAI;
function currencySymbol(chainId: number) {
  switch (chainId.toString()) {
    case "100":
      return "XDAI";
    default:
      return "ETH";
  }
}
function currencyAddress(chainId: number) {
  switch (chainId.toString()) {
    // Rinkeby
    case "4":
      return "0x92d75D18C4A2aDF86365EcFd5219f13AfED5103C";

    // Hardhat
    case "31337":
      return "0x6B175474E89094C44Da98b954EedeAC495271d0F";

    default: {
      throw new Error("Un-supported network");
    }
  }
}
function printLog(msg: string) {
  console.log(msg);
  /*  if (process.stdout.isTTY) {
    process.stdout.clearLine(-1);
    process.stdout.cursorTo(0);
    process.stdout.write(msg);
  } */
}

async function main() {
  const [deployer, DAO] = await ethers.getSigners();
  ({ DAI } = await getNamedAccounts());

  const address = await deployer.getAddress();
  if (!deployer.provider) {
    process.exit(1);
  }
  const { chainId } = await deployer.provider.getNetwork();

  if (SUPPORTED_NETWORK.indexOf(chainId) === -1)
    throw new Error("Un-supported network");

  console.log("Deploying meTokens on network:", network.name);
  console.log("DAI  Address:", DAI);
  console.log("Account address:", address);
  console.log(
    "Account balance:",
    ethers.utils.formatEther(await deployer.provider.getBalance(address)),
    currencySymbol(chainId)
  );

  printLog("Deploying weightedAverage Contract...");
  const weightedAverage = await deploy<WeightedAverage>("WeightedAverage");
  contracts.push({
    address: weightedAverage.address,
  });

  printLog("Deploying CurveRegistry Contract...");
  const curveRegistry = await deploy<CurveRegistry>("CurveRegistry");
  contracts.push({
    name: "contracts/registries/CurveRegistry.sol:CurveRegistry",
    address: curveRegistry.address,
  });

  printLog("Deploying VaultRegistry Contract...");
  const vaultRegistry = await deploy<VaultRegistry>("VaultRegistry");
  contracts.push({
    name: "contracts/registries/VaultRegistry.sol:VaultRegistry",
    address: vaultRegistry.address,
  });

  printLog("Deploying MigrationRegistry Contract...");
  const migrationRegistry = await deploy<MigrationRegistry>(
    "MigrationRegistry"
  );
  contracts.push({
    address: migrationRegistry.address,
  });

  printLog("Deploying Foundry Contract...");
  const foundry = await deploy<Foundry>("Foundry", {
    WeightedAverage: weightedAverage.address,
  });
  contracts.push({
    address: foundry.address,
  });

  printLog("Deploying Hub Contract...");
  const hub = await deploy<Hub>("Hub");
  contracts.push({
    address: hub.address,
  });

  printLog("Deploying BancorABDK Contract...");
  const BancorABDK = await deploy<BancorABDK>(
    "BancorABDK",
    undefined,
    hub.address,
    foundry.address
  );

  printLog("Deploying MeTokenFactory Contract...");
  const meTokenFactory = await deploy<MeTokenFactory>("MeTokenFactory");
  contracts.push({
    address: meTokenFactory.address,
  });

  printLog("Deploying MeTokenRegistry Contract...");
  const meTokenRegistry = await deploy<MeTokenRegistry>(
    "MeTokenRegistry",
    undefined,
    foundry.address,
    hub.address,
    meTokenFactory.address,
    migrationRegistry.address
  );

  printLog("Deploying SingleAssetVault Contract...");
  const singleAssetVault = await deploy<SingleAssetVault>(
    "SingleAssetVault",
    undefined, //no libs
    DAO.address, // DAO
    foundry.address, // foundry
    hub.address, // hub
    meTokenRegistry.address, //IMeTokenRegistry
    migrationRegistry.address //IMigrationRegistry
  );

  printLog("Deploying fees Contract...");
  const fees = await deploy<Fees>("Fees");
  contracts.push({
    address: fees.address,
  });

  printLog("Registering Bancor Curve to curve registry...");
  let tx = await curveRegistry.approve(BancorABDK.address);
  await tx.wait();
  printLog("Registering vault to vault registry...");
  tx = await vaultRegistry.approve(singleAssetVault.address);
  await tx.wait();

  printLog("Initializing fees...");
  tx = await fees.initialize(
    MINT_FEE,
    BURN_BUYER_FEE,
    BURN_OWNER_FEE,
    TRANSFER_FEE,
    INTEREST_FEE,
    YIELD_FEE
  );
  await tx.wait();

  printLog("Initializing hub Contract...");
  tx = await hub.initialize(
    foundry.address,
    vaultRegistry.address,
    curveRegistry.address
  );
  await tx.wait();

  const encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint32"],
    [baseY, RESERVE_WEIGHT]
  );
  const encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
    ["address"],
    [DAI]
  );

  printLog(`Registering hub with ${deployer.address} as the owner...`);
  tx = await hub.register(
    deployer.address,
    DAI,
    singleAssetVault.address,
    BancorABDK.address,
    REFUND_RATIO, //refund ratio
    encodedCurveDetails,
    encodedVaultArgs
  );
  await tx.wait();

  printLog("Initializing foundry Contract...");
  tx = await foundry.initialize(
    hub.address,
    fees.address,
    meTokenRegistry.address
  );
  await tx.wait();
  const receipt = await deployer.provider.getTransactionReceipt(tx.hash);
  printLog("Deployment done !");

  const deploymentInfo = {
    network: network.name,
    "Hub Contract Address": hub.address,
    "VaultRegistry Contract Address": vaultRegistry.address,
    "Migration Registry Contract Address": migrationRegistry.address,
    "SingleAsset Vault Contract Address": singleAssetVault.address,
    "Fee Contract Address": fees.address,
    "Curve Registry Contract Address": curveRegistry.address,
    "Bancor Curve Contract Address": BancorABDK.address,
    "Foundry Contract Address": foundry.address,
    "MeToken Factory Contract Address": meTokenFactory.address,
    "MeToken Registry Contract Address": meTokenRegistry.address,
    "WeightedAverage Contract Address": weightedAverage.address,
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

  const isEtherscan = ETHERSCAN_CHAIN_IDS.includes(chainId);
  if (isEtherscan) {
    printLog(`Waiting for Etherscan  to index Contracts...`);
    await tx.wait(5);
    printLog("Verifying Contracts...\n");

    const TASK_VERIFY = "verify";

    await verifyContract("singleAssetVault", singleAssetVault.address, [
      DAO.address, // DAO
      foundry.address, // foundry
      hub.address, // hub
      meTokenRegistry.address, //IMeTokenRegistry
      migrationRegistry.address, //IMigrationRegistry
    ]);
    await verifyContract("meTokenRegistry", meTokenRegistry.address, [
      foundry.address,
      hub.address,
      meTokenFactory.address,
      migrationRegistry.address,
    ]);
    await verifyContract("BancorABDK", BancorABDK.address, [
      hub.address,
      foundry.address,
    ]);

    for (let i = 0; i < contracts.length; ++i) {
      try {
        await run(TASK_VERIFY, {
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
