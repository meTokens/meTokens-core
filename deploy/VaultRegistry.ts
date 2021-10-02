import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, ethers } = hre;
  const [admin] = await ethers.getSigners();
  deployments.log("deploy address :", admin.address);

  const opts = {
    from: admin.address,
    log: true,
  };

  const vault = await deployments.deploy("VaultRegistry", {
    args: [],
    ...opts,
  });
  deployments.log("VaultRegistry deployed at:", vault.address);
};
export default func;
func.tags = ["VaultRegistry"];
