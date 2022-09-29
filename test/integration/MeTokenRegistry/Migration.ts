import { expect } from "chai";
import { ethers, getNamedAccounts, network } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, ContractTransaction, Signer } from "ethers";
import { hubSetup } from "../../utils/hubSetup";
import { deploy, getContractAt } from "../../utils/helpers";
import { mineBlock } from "../../utils/hardhatNode";
import {
  MeTokenRegistryFacet,
  HubFacet,
  FoundryFacet,
  ERC20,
  MigrationRegistry,
  SingleAssetVault,
  UniswapSingleTransferMigration,
  ERC20__factory,
} from "../../../artifacts/types";

export const checkUniswapPoolLiquidity = async (
  DAI: string,
  WETH: string,
  fees: number
) => {
  const uniswapRouterAddress = "0xE592427A0AEce92De3Edee1F18E0157C05861564";

  // make sure that pair exists on router
  const UniswapRouterInterfaceABI = [
    "function factory() view returns (address factory)",
  ];
  const UniswapV3FactoryInterfaceABI = [
    "function getPool(address, address, uint24) view returns(address)",
  ];
  const UniswapV3PoolABI = ["function liquidity() view returns (uint256)"];
  const uniswapRouter = await ethers.getContractAt(
    UniswapRouterInterfaceABI,
    uniswapRouterAddress
  );

  const uniswapV3FactoryAddress = await uniswapRouter.factory();

  const uniswapV3Factory = await ethers.getContractAt(
    UniswapV3FactoryInterfaceABI,
    uniswapV3FactoryAddress
  );

  const pool = await uniswapV3Factory.getPool(DAI, WETH, fees);
  const uniswapV3Pool = await ethers.getContractAt(UniswapV3PoolABI, pool);
  expect(await uniswapV3Pool.liquidity()).to.be.gt(0);
};

const setup = async () => {
  describe("Migration", () => {
    let tx: ContractTransaction;
    let meTokenRegistry: MeTokenRegistryFacet;
    let refundRatio = 50000;

    let USDT: string;
    let DAI: string;
    let WETH: string;
    let SwapRouter: string;

    let migrationRegistry: MigrationRegistry;
    let singleAssetVault: SingleAssetVault;
    let foundry: FoundryFacet;
    let hub: HubFacet;
    let dai: ERC20;
    let weth: ERC20;
    let account0: SignerWithAddress;
    let account4: SignerWithAddress;
    let whale: Signer;
    let targetHubId: number;
    let migration: UniswapSingleTransferMigration;
    let encodedMigrationArgs: string;
    let meTokenAddr4: string;
    const hubId2 = 2; // WETH
    const MAX_WEIGHT = 1000000;
    const PRECISION = BigNumber.from(10).pow(18);
    const reserveWeight = MAX_WEIGHT / 2;
    const baseY = PRECISION.div(1000);
    const fees = 3000;
    const tokenDepositedInETH = 100;
    const tokenDeposited = ethers.utils.parseEther(
      tokenDepositedInETH.toString()
    );
    let snapshotId: any;
    before(async () => {
      snapshotId = await network.provider.send("evm_snapshot");
      ({ DAI, WETH, USDT, SwapRouter } = await getNamedAccounts());
      await checkUniswapPoolLiquidity(DAI, WETH, fees);

      const encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [DAI]
      );

      ({
        tokenAddr: DAI,
        hub,
        foundry,
        meTokenRegistry,
        migrationRegistry,
        singleAssetVault,
        account0,
        account4,
        whale,
      } = await hubSetup(baseY, reserveWeight, encodedVaultArgs, refundRatio));
      await hub.register(
        account0.address,
        WETH,
        singleAssetVault.address,
        refundRatio, //refund ratio
        baseY,
        reserveWeight,
        encodedVaultArgs
      );
      await hub.register(
        account0.address,
        USDT,
        singleAssetVault.address,
        refundRatio, //refund ratio
        baseY,
        reserveWeight,
        encodedVaultArgs
      );

      // Deploy uniswap migration and approve it to the registry
      migration = await deploy<UniswapSingleTransferMigration>(
        "UniswapSingleTransferMigration",
        undefined,
        account0.address, // DAO
        foundry.address // diamond
      );
      await migration.deployed();
      dai = await getContractAt<ERC20>("ERC20", DAI);
      weth = await getContractAt<ERC20>("ERC20", WETH);
      await dai.connect(whale).transfer(account4.address, tokenDeposited);
      await dai
        .connect(account4)
        .approve(singleAssetVault.address, ethers.constants.MaxUint256);
      const name = "X03 meToken";
      const symbol = "XO3";
      tx = await meTokenRegistry
        .connect(account4)
        .subscribe(name, symbol, 1, 0);
      await tx.wait();
      meTokenAddr4 = await meTokenRegistry.getOwnerMeToken(account4.address);

      await migrationRegistry.approve(
        singleAssetVault.address,
        singleAssetVault.address,
        migration.address
      );
    });

    describe("cancelResubscribe()", () => {
      it("should be able to retrieve funds if swap fails", async () => {
        targetHubId = hubId2; //WETH
        encodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
          ["uint24"],
          [10000]
        );
        await meTokenRegistry
          .connect(account4)
          .initResubscribe(
            meTokenAddr4,
            targetHubId,
            migration.address,
            encodedMigrationArgs
          );

        await dai.connect(whale).transfer(account4.address, tokenDeposited);
        await dai
          .connect(account4)
          .approve(singleAssetVault.address, ethers.constants.MaxUint256);
        await foundry
          .connect(account4)
          .mint(meTokenAddr4, tokenDeposited, account4.address);

        await mineBlock(
          (
            await meTokenRegistry.getMeTokenInfo(meTokenAddr4)
          ).startTime.toNumber() + 2
        );
        // replace router code with another code to make sure swap will fail
        await network.provider.send("hardhat_setCode", [
          SwapRouter,
          ERC20__factory.bytecode,
        ]);
        await expect(migration.poke(meTokenAddr4)).to.be.reverted;
        // check dai is inside vault again
        const vaultDAIBalance = await dai.balanceOf(singleAssetVault.address);
        expect(vaultDAIBalance).to.equal(tokenDeposited);
        // check dai inside migration
        const migrationDAIBalance = await dai.balanceOf(migration.address);
        expect(migrationDAIBalance).to.equal(0);
        // check no eth is inside migration
        const migrationETHBalance = await weth.balanceOf(migration.address);
        expect(migrationETHBalance).to.equal(0);

        // should  be able to cancel Resubscribe now
        await meTokenRegistry.connect(account4).cancelResubscribe(meTokenAddr4);

        // check no dai is inside migration
        const migrationDAIBalanceAfterCancel = await dai.balanceOf(
          migration.address
        );
        expect(migrationDAIBalanceAfterCancel).to.equal(0);
        // check dai is inside vault again
        const vaultDAIBalanceAfterCancel = await dai.balanceOf(
          singleAssetVault.address
        );
        expect(vaultDAIBalanceAfterCancel).to.equal(tokenDeposited);
      });
    });

    after(async () => {
      await network.provider.send("evm_revert", [snapshotId]);
    });
  });
};

setup().then(() => {
  run();
});
