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

const networks = ["mainnet", "rinkeby"];

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
      { version: "0.7.0" },
      {
        version: "0.8.0",
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
    timeout: 60000, // Here is 2min but can be whatever timeout is suitable for you.
  },
  namedAccounts: {
    DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    DAIWhale: "0x0000006daea1723962647b7e189d311d757Fb793",
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
