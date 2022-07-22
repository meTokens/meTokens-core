import { HardhatRuntimeEnvironment } from "hardhat/types";
import { task, types } from "hardhat/config";
import { HubFacet } from "../artifacts/types";

task("register-hub", "register a new hub")
  .addParam("diamond", "Address of the diamond contract")
  .addParam("vault", "Address of the single asset vault contract")
  .addParam("asset", "Address of the asset used by the hub")
  .addOptionalParam("refundRatio", "refund ratio", 500000, types.int)
  .addOptionalParam("baseY", "baseY", "1000000000000000000")
  .addOptionalParam("reserveWeight", "reserve weight", 250000, types.int)
  .setAction(
    async (
      taskArgs: {
        diamond: string;
        vault: string;
        asset: string;
        refundRatio: number;
        baseY: string;
        reserveWeight: number;
      },
      hre: HardhatRuntimeEnvironment
    ) => {
      const { diamond, vault, asset, refundRatio, baseY, reserveWeight } =
        taskArgs;

      console.log(`hub 
        refundRatio:   ${refundRatio} 
        `);
      // create a vault
      /*    const refundRatio = 500000;
      const baseY = 224;
      const reserveWeight = 32; */
      const encodedVaultArgs = hre.ethers.constants.HashZero;

      const signers = await hre.ethers.getSigners();
      console.log(`hub parameters
      owner:         ${signers[0].address} 
      vault:         ${vault}
      asset:         ${asset}
      refundRatio:   ${refundRatio}
      baseY:         ${baseY}
      reserveWeight: ${reserveWeight}
      `);
      const hubFacet = (await hre.ethers.getContractAt(
        "HubFacet",
        diamond
      )) as HubFacet;
      const hubId = await hubFacet.count();
      const tx = await hubFacet.register(
        signers[0].address,
        asset,
        vault,
        refundRatio,
        baseY,
        reserveWeight,
        encodedVaultArgs
      );
      const receipt = await tx.wait();
      console.log("Hub register tx at:", receipt.transactionHash);
      const info = await hubFacet.getHubInfo(hubId);

      console.log(`info
    hubId               :${hubId}  
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
