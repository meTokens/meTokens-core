import { task } from "hardhat/config";

import { SingleAssetVault, VaultRegistry } from "../artifacts/types";

import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Contract, ContractReceipt } from "ethers";

task("add-vault", "register a single asset vault and deploys it if necessary")
  .addParam("diamond", "Address of the diamond contract")
  .addParam("registry", "Address of the vault registry contract")
  .addOptionalParam("vault", "Address of the single asset vault contract", ``)
  .setAction(
    async (
      taskArgs: { diamond: string; registry: string; vault: string },
      hre: HardhatRuntimeEnvironment
    ) => {
      const { diamond, registry, vault } = taskArgs;

      let [DAO] = await hre.ethers.getSigners();
      const vaultRegistry = (await hre.ethers.getContractAt(
        "VaultRegistry",
        registry
      )) as VaultRegistry;
      const owner = await vaultRegistry.owner();

      console.log(
        `vault registry owner:${owner} current account:${
          (await hre.ethers.getSigners())[0].address
        }`
      );
      let singleAssetVault: SingleAssetVault;
      if (!vault) {
        const ctrFactory = await hre.ethers.getContractFactory(
          "SingleAssetVault",
          {}
        );

        singleAssetVault = (await ctrFactory.deploy(
          DAO.address, // DAO
          diamond
        )) as unknown as SingleAssetVault;
        await (singleAssetVault as unknown as Contract).deployed();
      } else {
        singleAssetVault = (await hre.ethers.getContractAt(
          "SingleAssetVault",
          vault
        )) as SingleAssetVault;
      }
      console.log("singleAssetVault deployed at:", singleAssetVault.address);
      let approved = await vaultRegistry.isApproved(singleAssetVault.address);
      if (approved) {
        console.log("singleAssetVault already approved");
      } else {
        const tx = await vaultRegistry.approve(singleAssetVault.address);
        const receipt: ContractReceipt = await tx.wait();
        console.log(
          "singleAssetVault approval tx at:",
          receipt.transactionHash
        );
        approved = await vaultRegistry.isApproved(singleAssetVault.address);

        console.log(`singleAssetVault =>${approved ? "" : "NOT"} approved`);
      }
    }
  );
