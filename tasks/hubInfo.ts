import { HardhatRuntimeEnvironment } from "hardhat/types";
import { task, types } from "hardhat/config";
import { HubFacet } from "../artifacts/types";

task("hub-info", "register a new hub")
  .addParam("diamond", "Address of the diamond contract")
  .addParam("id", "Hub Id")
  .setAction(
    async (
      taskArgs: {
        diamond: string;
        id: number;
      },
      hre: HardhatRuntimeEnvironment
    ) => {
      const { diamond, id } = taskArgs;

      const hubFacet = (await hre.ethers.getContractAt(
        "HubFacet",
        diamond
      )) as HubFacet;

      const info = await hubFacet.getHubInfo(id);

      console.log(`Hub Infos
    hubId               :${id}  
    startTime           :${info[0]} 
    endTime             :${info[1]}
    endCooldown         :${info[2]}
    refundRatio         :${info[3]}
    targetRefundRatio   :${info[4]}
    owner               :${info[5]}
    vault               :${info[6]}
    asset               :${info[7]}
    updating            :${info[8]}
    reconfigure         :${info[9]}
    active              :${info[10]}
     `);
    }
  );
