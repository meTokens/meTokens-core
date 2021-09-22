import { network, run, ethers, getNamedAccounts } from "hardhat";
import { Hub } from "../artifacts/types/Hub";
import { VaultRegistry } from "../artifacts/types/VaultRegistry";
import { SingleAssetVault } from "../artifacts/types/SingleAssetVault";
import { SingleAssetFactory } from "../artifacts/types/SingleAssetFactory";
import fs from "fs";
const ETHERSCAN_CHAIN_IDS = [1, 3, 4, 5, 42];
const SUPPORTED_NETWORK = [1, 4, 100, 31337];

function currencySymbol(chainId: number) {
  switch (chainId.toString()) {
    case "100":
      return "XDAI";
    default:
      return "ETH";
  }
}
function printLog(msg: string) {
  if (process.stdout.isTTY) {
    process.stdout.clearLine(-1);
    process.stdout.cursorTo(0);
    process.stdout.write(msg);
  }
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const address = await deployer.getAddress();
  if (!deployer.provider) {
    process.exit(1);
  }
  const { chainId } = await deployer.provider.getNetwork();

  if (SUPPORTED_NETWORK.indexOf(chainId) === -1)
    throw new Error("Un-supported network");

  console.log("Deploying meTokens on network:", network.name);
  console.log("Account address:", address);
  console.log(
    "Account balance:",
    ethers.utils.formatEther(await deployer.provider.getBalance(address)),
    currencySymbol(chainId)
  );

  const hubFactory = await ethers.getContractFactory("Hub");

  const vaultRegistryFactory = await ethers.getContractFactory("VaultRegistry");

  const singleAssetFactory = await ethers.getContractFactory(
    "SingleAssetVault"
  );

  const factoryFactory = await ethers.getContractFactory("SingleAssetFactory");

  printLog("Deploying Hub Contract...");
  const hub = (await hubFactory.deploy()) as Hub;
  await hub.deployed();

  printLog("Deploying VaultRegistry Contract...");
  const vaultRegistry = (await vaultRegistryFactory.deploy()) as VaultRegistry;
  await vaultRegistry.deployed();

  printLog("Deploying SingleAssetVault Contract...");
  const singleAssetVault =
    (await singleAssetFactory.deploy()) as SingleAssetVault;
  await singleAssetVault.deployed();

  printLog("Deploying SingleAssetFactory Contract...");
  const saFactory = (await factoryFactory.deploy(
    hub.address,
    vaultRegistry.address,
    singleAssetVault.address
  )) as SingleAssetFactory;
  await saFactory.deployed();

  printLog("Initializing HomeFiProxyContract...");
  const { DAI } = await getNamedAccounts();
  const approveTx = await vaultRegistry.approve(DAI);
  await approveTx.wait();
  const receipt = await deployer.provider.getTransactionReceipt(approveTx.hash);
  const isEtherscan = ETHERSCAN_CHAIN_IDS.includes(chainId);
  if (isEtherscan) {
    printLog(`Waiting for Etherscan  to index Contracts...`);
    await approveTx.wait(5);
    printLog("Verifying Contracts...\n");

    const TASK_VERIFY = "verify";
    try {
      await run(TASK_VERIFY, {
        address: saFactory.address,
        constructorArgsParams: [
          hub.address,
          vaultRegistry.address,
          singleAssetVault.address,
        ],
      });
    } catch (error) {
      console.error(`Error verifying ${saFactory.address}: `, error);
    }

    const contracts = [
      singleAssetVault.address,
      vaultRegistry.address,
      hub.address,
    ];

    for (let i = 0; i < contracts.length; ++i) {
      try {
        await run(TASK_VERIFY, {
          address: contracts[i],
          constructorArguments: [],
        });
      } catch (error) {
        console.error(`Error verifying ${contracts[i]}: `, error);
      }
    }

    console.log("\nVerified Contracts.");
  }
  printLog("Deploying SingleAssetFactory Contract...");

  const deploymentInfo = {
    network: network.name,
    "Hub Contract Address": hub.address,
    "VaultRegistry Contract Address": vaultRegistry.address,
    "SingleAssetVault Contract Address": singleAssetVault.address,
    "SingleAsset Factory Contract Address": saFactory.address,
    "Block Number": receipt.blockNumber.toString(),
  };

  fs.writeFileSync(
    `deployments/${network.name}.json`,
    JSON.stringify(deploymentInfo, undefined, 2)
  );
  console.log(
    `Latest Contract Address written to: deployments/${network.name}.json`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
