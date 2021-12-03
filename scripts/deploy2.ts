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
const ETHERSCAN_CHAIN_IDS = [1, 3, 4, 5, 42];
const SUPPORTED_NETWORK = [1, 3, 4, 100, 31337];
const deployDir = "deployment";
const contracts: any[] = [];
const REFUND_RATIO = 50000;
const PRECISION = BigNumber.from(10).pow(18);
const MAX_WEIGHT = 1000000;
const RESERVE_WEIGHT = BigNumber.from(MAX_WEIGHT).div(2).toString();
const baseY = PRECISION.div(1000).toString();
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
    // Ropsten
    case "3":
      return "0x92d75D18C4A2aDF86365EcFd5219f13AfED5103C";

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

  //   printLog("Deploying weightedAverage Contract...");
  //   const weightedAverage = await deploy<WeightedAverage>("WeightedAverage");
  //   contracts.push(weightedAverage.address);

  //   printLog("Deploying BancorABDK Contract...");
  //   const BancorABDK = await deploy<BancorABDK>("BancorABDK");
  //   contracts.push(BancorABDK.address);

  //   printLog("Deploying CurveRegistry Contract...");
  //   const curveRegistry = await deploy<CurveRegistry>("CurveRegistry");
  //   contracts.push(curveRegistry.address);

  //   printLog("Deploying VaultRegistry Contract...");
  //   const vaultRegistry = await deploy<VaultRegistry>("VaultRegistry");
  //   contracts.push(vaultRegistry.address);

  //   printLog("Deploing MigrationRegistry Contract...");
  //   const migrationRegistry = await deploy<MigrationRegistry>(
  //     "MigrationRegistry"
  //   );
  // contracts.push(migrationRegistry.address);

  printLog("Deploying Foundry Contract...");
  const foundry = await deploy<Foundry>("Foundry", {
    WeightedAverage: "0x13e7bF4A65822fC846b07fbad3e806eD1D094b59",
  });
  contracts.push(foundry.address);

  printLog("Deploying Hub Contract...");
  const hub = await deploy<Hub>("Hub");
  contracts.push(hub.address);

  //   printLog("Deploying MeTokenFactory Contract...");
  //   const meTokenFactory = await deploy<MeTokenFactory>("MeTokenFactory");
  //   contracts.push(meTokenFactory.address);

  printLog("Deploying MeTokenRegistry Contract...");
  const meTokenRegistry = await deploy<MeTokenRegistry>(
    "MeTokenRegistry",
    undefined,
    foundry.address,
    hub.address,
    "0xf4a2AacCB5C9dCa49E6F65d497dED9616d127B92",
    "0x14d61228e0648d43DC5f8c148A488c0Ae81ec2CC"
  );

  //   printLog("Deploying SingleAssetVault Contract...");
  //   const singleAssetVault = await deploy<SingleAssetVault>(
  //     "SingleAssetVault",
  //     undefined, //no libs
  //     DAO.address, // DAO
  //     foundry.address, // foundry
  //     hub.address, // hub
  //     meTokenRegistry.address, //IMeTokenRegistry
  //     migrationRegistry.address //IMigrationRegistry
  //   );

  //   printLog("Deploying fees Contract...");
  //   const fees = await deploy<Fees>("Fees");
  //   contracts.push(fees.address);

  //   printLog("Registering Bancor Curve to curve registry...");
  //   let tx = await curveRegistry.approve(BancorABDK.address);
  //   await tx.wait();
  //   printLog("Registering vault to vault registry...");
  //   tx = await vaultRegistry.approve(singleAssetVault.address);
  //   await tx.wait();

  //   printLog("Initializing fees...");
  //   tx = await fees.initialize(
  //     MINT_FEE,
  //     BURN_BUYER_FEE,
  //     BURN_OWNER_FEE,
  //     TRANSFER_FEE,
  //     INTEREST_FEE,
  //     YIELD_FEE
  //   );
  //   await tx.wait();

  printLog("Initializing hub Contract...");
  let tx = await hub.initialize(
    foundry.address,
    "0xCA82C0B535aaD7b26FE6feFE0B3D243ACf180D93",
    "0xB8b36dcF76bE040dB276f5353e7cb23C51798811"
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

  printLog("Registering hub ...");
  tx = await hub.register(
    DAI,
    "0x1a96C7bB64070f6129a64F981CFCb544D78e7842",
    "0x6551A593a18586baeF221355886697cb39410587",
    REFUND_RATIO, //refund ratio
    encodedCurveDetails,
    encodedVaultArgs
  );
  await tx.wait();

  printLog("Initializing foundry Contract...");
  tx = await foundry.initialize(
    hub.address,
    "0x889356A0325cF68Ea7aAE3554baa003E0297f963",
    meTokenRegistry.address
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
        address: "0x1a96C7bB64070f6129a64F981CFCb544D78e7842",
        constructorArgsParams: [
          DAO, // DAO
          foundry.address, // foundry
          hub.address, // hub
          meTokenRegistry.address, //IMeTokenRegistry
          "0x14d61228e0648d43DC5f8c148A488c0Ae81ec2CC", //IMigrationRegistry
        ],
      });
      await run(TASK_VERIFY, {
        address: meTokenRegistry.address,
        constructorArgsParams: [
          foundry.address,
          hub.address,
          "0xf4a2AacCB5C9dCa49E6F65d497dED9616d127B92",
          "0x14d61228e0648d43DC5f8c148A488c0Ae81ec2CC",
        ],
      });
    } catch (error) {
      console.error(
        `Error verifying ${"0x1a96C7bB64070f6129a64F981CFCb544D78e7842"}: `,
        error
      );
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
  printLog("Deployment done !");

  const deploymentInfo = {
    network: network.name,
    "Hub Contract Address": hub.address,
    // "VaultRegistry Contract Address": vaultRegistry.address,
    // "SingleAssetVault Contract Address": singleAssetVault.address,
    //  "SingleAsset Vault Contract Address": singleAssetVault.address,
    // "Fee Contract Address": fees.address,
    // "Curve Registry Contract Address": curveRegistry.address,
    // "Bancor Curve Contract Address": BancorABDK.address,
    "Foundry Contract Address": foundry.address,
    // "MeToken Factory Contract Address": meTokenFactory.address,
    "MeToken Registry Contract Address": meTokenRegistry.address,
    // "WeightedAverage Contract Address": weightedAverage.address,
    "Block Number": receipt.blockNumber.toString(),
  };

  if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir);
  }

  fs.writeFileSync(
    `${deployDir}/script-${network.name}-2.json`,
    JSON.stringify(deploymentInfo)
  );
  console.log(
    `Latest Contract Address written to: ${deployDir}/script-${network.name}-2.json`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
