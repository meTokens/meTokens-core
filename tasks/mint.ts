import { task, types } from "hardhat/config";

import {
  ERC20,
  FoundryFacet,
  HubFacet,
  MeToken,
  MeTokenRegistryFacet,
} from "../artifacts/types";

import { HardhatRuntimeEnvironment } from "hardhat/types";

task("mint", "mint a metoken")
  .addParam("diamond", "Address of the diamond contract")
  .addOptionalParam("index", "account index used to mint", 1, types.int)
  .addOptionalParam("amount", "amount of asset to use for minting ", `100`)
  .setAction(
    async (
      taskArgs: {
        diamond: string;
        index: number;
        amount: string;
      },
      hre: HardhatRuntimeEnvironment
    ) => {
      const { diamond, index, amount } = taskArgs;
      const signers = await hre.ethers.getSigners();
      const meTokenRegistry = (await hre.ethers.getContractAt(
        "MeTokenRegistryFacet",
        diamond
      )) as MeTokenRegistryFacet;
      const signer = signers[index].address;
      console.log(`signer used: ${signer} `);
      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(signer);
      const meToken = (await hre.ethers.getContractAt(
        "MeToken",
        meTokenAddr
      )) as MeToken;

      const foundry = (await hre.ethers.getContractAt(
        "FoundryFacet",
        diamond
      )) as FoundryFacet;
      const hub = (await hre.ethers.getContractAt(
        "HubFacet",
        diamond
      )) as HubFacet;
      console.log("meToken address:", meTokenAddr);
      // getMeTokenInfo to get hub id and then get assert
      const meInfo = await meTokenRegistry.getMeTokenInfo(meTokenAddr);
      const hubId = meInfo[1];
      console.log(`meToken hub Id: ${hubId}`);
      const hubInfo = await hub.getHubInfo(hubId);
      const asset = (await hre.ethers.getContractAt(
        "ERC20",
        hubInfo[7]
      )) as ERC20;

      const balAsset = await asset.balanceOf(signer);
      console.log(`asset required to mint  ${await asset.symbol()} (${await asset.name()})   ${
        asset.address
      }
      your balance:${balAsset}`);
      if (balAsset.lt(amount)) {
        console.log(
          `insufficient ${await asset.symbol()} balance ${amount} is required but you only have ${balAsset}`
        );
        return;
      }
      const vault = hubInfo[6];
      const allowance = await asset.allowance(signer, vault);
      if (allowance.lt(amount)) {
        console.log(
          `allowance is ${allowance} but amount is ${amount} will approve vault for that amount`
        );
        const tx = await asset.connect(signers[index]).approve(vault, amount);
        const receipt = await tx.wait();
        console.log("approve tx at:", receipt.transactionHash);
      }

      const balanceBefore = await meToken.balanceOf(signer);
      console.log(
        `meToken balance before mint:${balanceBefore} ${await meToken.symbol()}`
      );

      const tx = await foundry
        .connect(signers[index])
        .mint(meToken.address, amount, signer);
      const receipt = await tx.wait();
      console.log("mint tx at:", receipt.transactionHash);
      const balanceAfter = await meToken.balanceOf(signer);
      console.log(
        `meToken balance after mint:${balanceAfter} ${await meToken.symbol()}`
      );
    }
  );
