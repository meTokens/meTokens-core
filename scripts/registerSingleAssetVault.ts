import { ethers } from "hardhat";
import { SingleAssetVault, VaultRegistry } from "../artifacts/types";
import { deploy } from "../test/utils/helpers";

export const main = async (
  diamondAddr: string,
  vaultRegistryAddr: string,
  singleAssetVaultAddr: string
) => {
  try {
    let [DAO] = await ethers.getSigners();
    const vaultRegistry = (await ethers.getContractAt(
      "VaultRegistry",
      vaultRegistryAddr
    )) as VaultRegistry;
    const owner = await vaultRegistry.owner();
    console.log("owner", owner);
    let singleAssetVault;
    if (!singleAssetVaultAddr) {
      singleAssetVault = await deploy<SingleAssetVault>(
        "SingleAssetVault",
        undefined, //no libs
        DAO.address, // DAO
        diamondAddr
      );
    } else {
      singleAssetVault = (await ethers.getContractAt(
        "SingleAssetVault",
        singleAssetVaultAddr
      )) as SingleAssetVault;
    }
    console.log("singleAssetVault deployed at:", singleAssetVault.address);
    await vaultRegistry.approve(singleAssetVault.address);
    const res = await vaultRegistry.isApproved(singleAssetVault.address);
    if (res) {
      console.log("  singleAssetVault approved");
    } else {
      console.log("  singleAssetVault NOT approved");
    }

    const accounts = await ethers.getSigners();
    console.log("account0", accounts[0].address);
  } catch (error) {
    console.log(`Error     `, error);
  }
};

main(
  "0xB1e8B46b9c0c344235e1b4AB3245dfaC9c1840EF",
  "0x9F1a2c20cD0aD8C3e3E6015be7d122B9f6040c14",
  "0xAd430EA7Cd681A5370eCB3898Cf7A10BfC33fD31"
);
