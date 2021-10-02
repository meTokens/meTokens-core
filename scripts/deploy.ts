import { network, run, ethers, getNamedAccounts } from "hardhat";
import { Hub } from "../artifacts/types/Hub";
import { VaultRegistry } from "../artifacts/types/VaultRegistry";
import { SingleAssetVault } from "../artifacts/types/SingleAssetVault";
import { SingleAssetFactory } from "../artifacts/types/SingleAssetFactory";
import fs from "fs";
import { deploy } from "../test/utils/helpers";
import { MeTokenFactory } from "../artifacts/types/MeTokenFactory";
import { MeTokenRegistry } from "../artifacts/types/MeTokenRegistry";
import { BancorZeroCurve } from "../artifacts/types/BancorZeroCurve";
import { CurveRegistry } from "../artifacts/types/CurveRegistry";
import { Foundry } from "../artifacts/types/Foundry";
import { WeightedAverage } from "../artifacts/types/WeightedAverage";
const ETHERSCAN_CHAIN_IDS = [1, 3, 4, 5, 42];
const SUPPORTED_NETWORK = [1, 4, 100, 31337];
const contracts: any[] = [];
const REFUND_RATIO = 50000;
const deployDir = "deployment";
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
  printLog("Deploying weightedAverage Contract...");
  const weightedAverage = await deploy<WeightedAverage>("WeightedAverage");
  contracts.push(weightedAverage.address);
  printLog("Deploying BancorZeroCurve Contract...");
  const bancorZeroCurve = await deploy<BancorZeroCurve>("BancorZeroCurve");
  contracts.push(bancorZeroCurve.address);
  printLog("Deploying CurveRegistry Contract...");
  const curveRegistry = await deploy<CurveRegistry>("CurveRegistry");
  contracts.push(curveRegistry.address);
  printLog("Deploying VaultRegistry Contract...");
  const vaultRegistry = await deploy<VaultRegistry>("VaultRegistry");
  contracts.push(vaultRegistry.address);
  printLog("Deploying SingleAssetVault Contract...");
  const singleAssetVault = await deploy<SingleAssetVault>("SingleAssetVault");
  contracts.push(singleAssetVault.address);
  printLog("Deploying Foundry Contract...");
  const foundry = await deploy<Foundry>("Foundry", {
    WeightedAverage: weightedAverage.address,
  });
  contracts.push(foundry.address);
  printLog("Deploying SingleAssetFactory Contract...");
  const singleAssetFactory = await deploy<SingleAssetFactory>(
    "SingleAssetFactory",
    undefined, //no libs
    singleAssetVault.address, // implementation to clone
    foundry.address, // foundry
    vaultRegistry.address // vault registry
  );
  printLog("Deploying Hub Contract...");
  const hub = await deploy<Hub>("Hub");
  contracts.push(hub.address);
  printLog("Deploying MeTokenFactory Contract...");
  const meTokenFactory = await deploy<MeTokenFactory>("MeTokenFactory");
  contracts.push(meTokenFactory.address);
  printLog("Deploying MeTokenRegistry Contract...");
  const meTokenRegistry = await deploy<MeTokenRegistry>(
    "MeTokenRegistry",
    undefined,
    hub.address,
    meTokenFactory.address
  );
  contracts.push(meTokenRegistry.address);
  printLog("Registering Bancor Curve to curve registry...");
  await curveRegistry.register(bancorZeroCurve.address);

  printLog("Initializing SingleAssetVault...");
  const { DAI } = await getNamedAccounts();
  await singleAssetVault.initialize(
    foundry.address,
    DAI,
    ethers.utils.toUtf8Bytes("")
  );

  printLog("Initializing hub Contract...");
  await vaultRegistry.approve(singleAssetFactory.address);

  await hub.initialize(
    foundry.address,
    vaultRegistry.address,
    curveRegistry.address
  );
  const encodedValueSet = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint32"],
    [ethers.utils.parseEther("1000000000000000000"), 5000]
  );

  const tx = await hub.register(
    singleAssetFactory.address,
    bancorZeroCurve.address,
    DAI,
    REFUND_RATIO,
    encodedValueSet,
    ethers.utils.toUtf8Bytes("")
  );

  await tx.wait();
  const receipt = await deployer.provider.getTransactionReceipt(tx.hash);
  const isEtherscan = ETHERSCAN_CHAIN_IDS.includes(chainId);
  if (isEtherscan) {
    printLog(`Waiting for Etherscan  to index Contracts...`);
    await tx.wait(5);
    printLog("Verifying Contracts...\n");

    const TASK_VERIFY = "verify";
    try {
      await run(TASK_VERIFY, {
        address: singleAssetFactory.address,
        constructorArgsParams: [
          hub.address,
          vaultRegistry.address,
          singleAssetVault.address,
        ],
      });
    } catch (error) {
      console.error(`Error verifying ${singleAssetFactory.address}: `, error);
    }

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
    "SingleAsset Factory Contract Address": singleAssetFactory.address,
    "Curve Registry Contract Address": curveRegistry.address,
    "Bancor Curve Contract Address": bancorZeroCurve.address,
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
    JSON.stringify(deploymentInfo)
  );
  console.log(
    `Latest Contract Address written to: ${deployDir}/script-${network.name}.json`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
