import "@nomiclabs/hardhat-waffle";
import * as dotenv from "dotenv";
import "hardhat-deploy";
import "hardhat-deploy-ethers";
import { HardhatUserConfig } from "hardhat/config";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "./tasks/index";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-abi-exporter";

dotenv.config();
const {
  INFURA_KEY,
  ALCHEMY_API_KEY,
  PRIVATE_KEY,
  MNEMONIC,
  ETHERSCAN_API_KEY,
  COINMARKETCAP_API_KEY,
  REPORT_GAS,
  REPORT_GAS_PRICE,
} = process.env;

const mnemonic = `${
  MNEMONIC || "test test test test test test test test test test test junk"
}`;
// if using infura, you can add new networks by adding the name as it is seen in the infura url
const INFURA_NETWORKS = [
  "mainnet",
  "rinkeby",
  "arbitrum-mainnet",
  "arbitrum-rinkeby",
];
const accounts = PRIVATE_KEY
  ? // Private key overrides mnemonic - leave pkey empty in .env if using mnemonic
    [`0x${PRIVATE_KEY}`]
  : {
      mnemonic,
      path: "m/44'/60'/0'/0",
      initialIndex: 0,
      count: 10,
    };

const networks = ["mainnet" /*"rinkeby" */];

/**
 * Given the name of a network build a Hardhat Network object
 * @param {string} _network - the string name of the network
 * @return {INetwork} - the Hardhat Network object
 */
const makeNetwork = (_network: string) => {
  if (INFURA_NETWORKS.includes(_network))
    return {
      url: `https://${_network}.infura.io/v3/${INFURA_KEY}`,
      accounts,
    };

  return {};
};

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.9",
        settings: {
          optimizer: {
            enabled: true,
            runs: 800,
          },
          metadata: {
            // do not include the metadata hash, since this is machine dependent
            // and we want all generated code to be deterministic
            // https://docs.soliditylang.org/en/v0.7.6/metadata.html
            bytecodeHash: "none",
          },
        },
      },
    ],
  },
  mocha: {
    delay: true,
    timeout: 60000, // Here is 2min but can be whatever timeout is suitable for you.
  },
  namedAccounts: {
    DAI: {
      default: "0x6B175474E89094C44Da98b954EedeAC495271d0F", // here this will by default take the first account as deployer
      1: "0x6B175474E89094C44Da98b954EedeAC495271d0F", // similarly on mainnet it will take the first account as deployer. Note though that depending on how hardhat network are configured, the account 0 on one network can be different than on another
      4: "0xc7ad46e0b8a400bb3c915120d284aafba8fc4735", // but for rinkeby it will be a specific address
      goerli: "0x84b9514E013710b9dD0811c9Fe46b837a4A0d8E0", //it can also specify a specific netwotk name (specified in hardhat.config.js)
    },
    DAIWhale: "0x0000006daea1723962647b7e189d311d757Fb793",
    WETH: {
      default: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      1: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    },
    WETHWhale: "0x57757E3D981446D585Af0D9Ae4d7DF6D64647806",
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  },
  networks: {
    hardhat: {
      forking: {
        url: `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_API_KEY}`,
        accounts,
        blockNumber: 13310410,
      },
      gas: "auto",
      timeout: 1800000,
      chainId: 1,
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${INFURA_KEY}`,
      accounts,
      gas: 10000000,
    },
    ...networks.reduce((obj: any, entry) => {
      obj[entry] = makeNetwork(entry);
      return obj;
    }, {}),
  },

  typechain: {
    outDir: "artifacts/types",
    target: "ethers-v5",
  },
  gasReporter: {
    enabled: REPORT_GAS === "true",
    currency: "USD",
    gasPrice: Number.parseInt(REPORT_GAS_PRICE ?? "50"),
    onlyCalledMethods: true,
    coinmarketcap: `${COINMARKETCAP_API_KEY || ""}`,
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: `${ETHERSCAN_API_KEY || ""}`,
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  abiExporter: {
    path: "./test/abi",
    clear: true,
    flat: true,
  },
};
export default config;
