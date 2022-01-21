import { run } from "hardhat";

export const verifyContract = async (
  contractName: string,
  contractAddress: string,
  args: any = undefined
) => {
  try {
    console.log(
      `Verifying ${contractName} with ${contractAddress} ${
        args ? `with ${args.join(",")}` : ""
      }`
    );
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: args,
    });
  } catch (error) {
    console.log(`Error verifying ${contractAddress}: `, error);
  }
};
