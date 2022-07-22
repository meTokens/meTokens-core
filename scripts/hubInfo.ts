import { ethers, run } from "hardhat";
import { HubFacet } from "../artifacts/types";

export const main = async (diamondAddr: string) => {
  try {
    const hubFacet = (await ethers.getContractAt(
      "HubFacet",
      diamondAddr
    )) as HubFacet;
    const info = await hubFacet.getHubInfo(1);

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

main("0xB0a6645E489AEf08BdA6Dce9b6Df4e0447D9310d");
