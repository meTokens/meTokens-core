import { deploy } from "../test/utils/helpers";
import { network, run, ethers, getNamedAccounts } from "hardhat";
import fs from "fs";
const ETHERSCAN_CHAIN_IDS = [1, 3, 4, 5, 42];
const SUPPORTED_NETWORK = [1, 4, 100, 31337];

async function main() {
  const [deployer] = await ethers.getSigners();

  const address = await deployer.getAddress();
  if (!deployer.provider) {
    process.exit(1);
  }
  const { chainId } = await deployer.provider.getNetwork();

  if (SUPPORTED_NETWORK.indexOf(chainId) === -1)
    throw new Error("Un-supported network");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
