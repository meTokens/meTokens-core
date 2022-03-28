import { Percent, Token, CurrencyAmount, TradeType } from "@uniswap/sdk-core";
import { Pool } from "@uniswap/v3-sdk";
import { abi as IUniswapV3PoolABI } from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json";
import { abi as IUniswapV3FactoryABI } from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Factory.sol/IUniswapV3Factory.json";

import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { ERC20 } from "../../artifacts/types";

interface Immutables {
  factory: string;
  token0: string;
  token1: string;
  fee: number;
  tickSpacing: number;
  maxLiquidityPerTick: BigNumber;
}

interface State {
  liquidity: BigNumber;
  sqrtPriceX96: BigNumber;
  tick: number;
  observationIndex: number;
  observationCardinality: number;
  observationCardinalityNext: number;
  feeProtocol: number;
  unlocked: boolean;
}
async function getPoolImmutables(poolContract: any) {
  const [factory, token0, token1, fee, tickSpacing, maxLiquidityPerTick] =
    await Promise.all([
      poolContract.factory(),
      poolContract.token0(),
      poolContract.token1(),
      poolContract.fee(),
      poolContract.tickSpacing(),
      poolContract.maxLiquidityPerTick(),
    ]);

  const immutables: Immutables = {
    factory,
    token0,
    token1,
    fee,
    tickSpacing,
    maxLiquidityPerTick,
  };
  return immutables;
}
async function getPoolState(poolContract: any) {
  const [liquidity, slot] = await Promise.all([
    poolContract.liquidity(),
    poolContract.slot0(),
  ]);

  const PoolState: State = {
    liquidity,
    sqrtPriceX96: slot[0],
    tick: slot[1],
    observationIndex: slot[2],
    observationCardinality: slot[3],
    observationCardinalityNext: slot[4],
    feeProtocol: slot[5],
    unlocked: slot[6],
  };

  return PoolState;
}
export const getQuote = async (
  UNIV3Factory: string,
  token0: ERC20,
  token1: ERC20,

  fee: number,
  amount: BigNumber
) => {
  const factoryContract = new ethers.Contract(
    UNIV3Factory,
    IUniswapV3FactoryABI,
    ethers.provider
  );

  const poolAddress = await factoryContract.getPool(
    token0.address,
    token1.address,
    fee
  );
  const poolContract = new ethers.Contract(
    poolAddress,
    IUniswapV3PoolABI,
    ethers.provider
  );

  const chainId = (await ethers.provider.getNetwork()).chainId;
  const [state] = await Promise.all([getPoolState(poolContract)]);

  const input = new Token(
    chainId,
    token0.address,
    await token0.decimals(),
    await token0.symbol(),
    await token0.name()
  );

  const output = new Token(
    chainId,
    token1.address,
    await token1.decimals(),
    await token1.symbol(),
    await token1.name()
  );
  const poolExample = new Pool(
    input,
    output,
    fee,
    state.sqrtPriceX96.toString(),
    state.liquidity.toString(),
    state.tick
  );
  const token0Amount = CurrencyAmount.fromRawAmount(input, amount.toString());
  const token1Amount = CurrencyAmount.fromRawAmount(output, amount.toString());
  return {
    oneToken0InToken1: poolExample.token0Price
      .quote(
        CurrencyAmount.fromRawAmount(
          input,
          ethers.utils.parseEther("1").toString()
        )
      )
      .toFixed(),
    oneToken1inToken0Price: poolExample.token1Price
      .quote(
        CurrencyAmount.fromRawAmount(
          output,
          ethers.utils.parseEther("1").toString()
        )
      )
      .toFixed(),
    token0Price: poolExample.token0Price.quote(token0Amount).toFixed(),
    token1Price: poolExample.token1Price.quote(token1Amount).toFixed(),
  };
};
