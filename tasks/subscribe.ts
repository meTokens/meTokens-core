import { task } from "hardhat/config";

import { MeTokenRegistryFacet } from "../artifacts/types";

import { HardhatRuntimeEnvironment } from "hardhat/types";

task("subscribe", "subscribe to a Hub ")
  .addParam("diamond", "Address of the diamond contract")
  .addParam("id", "Hub Id")
  .addOptionalParam("name", "token name", `test Token`)
  .addOptionalParam("symbol", "token symbol", `TKN`)
  .addOptionalParam("index", "account index ", `1`)
  .addOptionalParam("amount", "amount ot be minted at subscribe", `0`)
  .setAction(
    async (
      taskArgs: {
        diamond: string;
        id: string;
        name: string;
        symbol: string;
        index: string;
        amount: string;
      },
      hre: HardhatRuntimeEnvironment
    ) => {
      const { diamond, id, name, symbol, index, amount } = taskArgs;
      const signers = await hre.ethers.getSigners();
      const meTokenRegistry = (await hre.ethers.getContractAt(
        "MeTokenRegistryFacet",
        diamond
      )) as MeTokenRegistryFacet;
      const tx = await meTokenRegistry
        .connect(signers[1])
        .subscribe(name, symbol, id, amount);

      const receipt = await tx.wait();
      console.log("subscribe tx at:", receipt.transactionHash);
      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        signers[1].address
      );
      console.log("meToken address:", meTokenAddr);
    }
  );
