import { ethers, run } from "hardhat";
import { HubFacet } from "../artifacts/types";

export const main = async (diamondAddr: string) => {
  try {
    // create a vault
    const refundRatio = 500000;
    const baseY = 224;
    const reserveWeight = 32;
    const encodedVaultArgs;
    const hubFacet = (await ethers.getContractAt(
      "HubFacet",
      diamondAddr
    )) as HubFacet;
    const info = await hubFacet.register();

    console.log(` info-
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
  } catch (error) {
    console.log(`Error test   `, error);
  }
};

main("0x901B94502aEEF2ABF6bD79e6c73f297B28B50E22"); //"0xB0a6645E489AEf08BdA6Dce9b6Df4e0447D9310d"); //kovan
