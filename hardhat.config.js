require("@nomiclabs/hardhat-truffle5");
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-web3");

require("dotenv").config();

module.exports = {
  solidity: {
    compilers: [
      {version: "0.6.6"} //,
      // {version: "0.8.0"}
    ]
  },
  mocha: {
    timeout: 60000 // Here is 2min but can be whatever timeout is suitable for you.
  },
  networks: {
    hardhat: {
      forking: {
        url: `${config.alchemy}/${process.env.ALCHEMY_KEY}`
      },
      gas: 'auto',
      blockGasLimit: 0x1fffffffffffff,
      allowUnlimitedContractSize: true,
      timeout: 1800000,
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/${process.env.INFURA_KEY}`,
      accounts: [`${process.env.PRIVATE_KEY}`,]
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
}
