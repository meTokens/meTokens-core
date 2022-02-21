import { ContractTransaction, Signer } from "ethers";
import { network, getNamedAccounts, ethers } from "hardhat";
import { TransactionReceipt } from "@ethersproject/abstract-provider";

export async function passSeconds(sec: Number): Promise<void> {
  await network.provider.request({
    method: "evm_increaseTime",
    params: [sec],
  });
}

export async function passHours(amount: number): Promise<void> {
  await network.provider.request({
    method: "evm_increaseTime",
    params: [3600 * amount],
  });
}

export async function passDays(amount: number): Promise<void> {
  await network.provider.request({
    method: "evm_increaseTime",
    params: [86400 * amount],
  });
}

export async function passWeeks(amount: number): Promise<void> {
  await network.provider.request({
    method: "evm_increaseTime",
    params: [604800 * amount],
  });
}

export async function mineBlock(timestamp: number): Promise<void> {
  await network.provider.request({
    method: "evm_mine",
    params: [timestamp],
  });
}

export async function setNextBlockTimestamp(timestamp: number): Promise<void> {
  await network.provider.request({
    method: "evm_setNextBlockTimestamp",
    params: [timestamp],
  });
}
export async function setAutomine(automine: boolean): Promise<void> {
  await network.provider.request({
    method: "evm_setAutomine",
    params: [automine],
  });
}

export async function latestBlockNumber(): Promise<{
  number: number;
  timestamp: number;
}> {
  const block = await ethers.provider.getBlock("latest");
  return { number: block.number, timestamp: block.timestamp };
}

export async function mineTsBlock(ts: number): Promise<void> {
  const blockBefore = await ethers.provider.getBlock("latest");
  await mineBlock(blockBefore.timestamp + ts);
}

export async function getTXReceipt(
  ct: ContractTransaction
): Promise<TransactionReceipt> {
  const receipt = await ethers.provider.getTransactionReceipt(ct.hash);
  return receipt;
}

export async function mineNBlock(
  blockCount: number,
  secondsBetweenBlock?: number
): Promise<void> {
  const blockBefore = await ethers.provider.getBlock("latest");
  const maxMinedBlockPerBatch = 5000;
  let blockToMine = blockCount;
  let blockTime = blockBefore.timestamp;
  while (blockToMine > maxMinedBlockPerBatch) {
    // eslint-disable-next-line @typescript-eslint/no-loop-func
    const minings = [...Array(maxMinedBlockPerBatch).keys()].map((_v, i) => {
      const newTs = blockTime + i + (secondsBetweenBlock || 1);
      return mineBlock(newTs);
    });
    // eslint-disable-next-line no-await-in-loop
    await Promise.all(minings);
    blockToMine -= maxMinedBlockPerBatch;
    blockTime =
      blockTime +
      maxMinedBlockPerBatch -
      1 +
      maxMinedBlockPerBatch * (secondsBetweenBlock || 1);
  }
  const minings = [...Array(blockToMine).keys()].map((_v, i) => {
    const newTs = blockTime + i + (secondsBetweenBlock || 1);
    return mineBlock(newTs);
  });
  // eslint-disable-next-line no-await-in-loop
  await Promise.all(minings);
}

export async function impersonate(account: string): Promise<Signer> {
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [account],
  });
  return ethers.provider.getSigner(account);
}

export async function getEther(account: string, amount: number): Promise<void> {
  if (amount > 0) {
    const { whaleAddress } = await getNamedAccounts();
    const whale: Signer = await impersonate(whaleAddress);
    await whale.sendTransaction({
      to: account,
      value: ethers.BigNumber.from(10).pow(18).mul(amount),
    });
  }
}

export async function impersonateWithEther(
  account: string,
  amount: number
): Promise<Signer> {
  await getEther(account, amount || 0);
  return impersonate(account);
}

export async function resetFork(blockNumber: number): Promise<void> {
  await network.provider.request({
    method: "hardhat_reset",
    params: [
      {
        forking: {
          jsonRpcUrl: `https://eth-mainnet.alchemyapi.io/v2/${
            process.env.ALCHEMY_API_KEY || ""
          }`,
          blockNumber,
        },
      },
    ],
  });
}

export async function disableFork(): Promise<void> {
  await network.provider.request({
    method: "hardhat_reset",
    params: [],
  });
}
