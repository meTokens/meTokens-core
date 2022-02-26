import { ethers, getNamedAccounts } from "hardhat";
import {
  deploy,
  getContractAt,
  weightedAverageSimulation,
} from "../../utils/helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, Signer } from "ethers";
import { ERC20 } from "../../../artifacts/types/ERC20";
import { FoundryFacet } from "../../../artifacts/types/FoundryFacet";
import { HubFacet } from "../../../artifacts/types/HubFacet";
import { MeTokenRegistryFacet } from "../../../artifacts/types/MeTokenRegistryFacet";
import { MigrationRegistry } from "../../../artifacts/types/MigrationRegistry";
import { hubSetup } from "../../utils/hubSetup";
import { MeToken } from "../../../artifacts/types/MeToken";
import { expect } from "chai";
import { SingleAssetVault } from "../../../artifacts/types/SingleAssetVault";
import { mineBlock } from "../../utils/hardhatNode";
import { UniswapSingleTransferMigration } from "../../../artifacts/types/UniswapSingleTransferMigration";
import { ICurve } from "../../../artifacts/types";

const setup = async () => {
  describe("MeToken Resubscribe - new RefundRatio", () => {
    let meTokenRegistry: MeTokenRegistryFacet;
    let curve: ICurve;
    let migrationRegistry: MigrationRegistry;
    let singleAssetVault: SingleAssetVault;
    let foundry: FoundryFacet;
    let hub: HubFacet;
    let dai: ERC20;
    let weth: ERC20;
    let meToken: MeToken;
    let tokenHolder: Signer;
    let account0: SignerWithAddress;
    let account1: SignerWithAddress;
    let account2: SignerWithAddress;
    let migration: UniswapSingleTransferMigration;

    const one = ethers.utils.parseEther("1");
    let baseY: BigNumber;
    const MAX_WEIGHT = 1000000;
    let encodedCurveInfo: string;
    let encodedVaultArgs: string;
    const firstHubId = 1;
    const initialRefundRatio = ethers.utils.parseUnits("5000", 0); // 0.005%
    const targetRefundRatio = ethers.utils.parseUnits("500000", 0); // 50%
    const fees = 3000;

    let tokenDepositedInETH;
    let tokenDeposited: BigNumber;

    before(async () => {
      baseY = one.mul(1000);
      const reserveWeight = MAX_WEIGHT / 2;
      let DAI;
      let WETH;
      ({ DAI, WETH } = await getNamedAccounts());

      encodedCurveInfo = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint32"],
        [baseY, reserveWeight]
      );
      encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [DAI]
      );
      ({
        token: dai,
        tokenHolder,
        hub,
        foundry,
        curve,
        migrationRegistry,
        singleAssetVault,
        account0,
        account1,
        account2,
        meTokenRegistry,
      } = await hubSetup(
        encodedCurveInfo,
        encodedVaultArgs,
        initialRefundRatio.toNumber(),
        "BancorCurve"
      ));

      // Deploy uniswap migration and approve it to the registry
      migration = await deploy<UniswapSingleTransferMigration>(
        "UniswapSingleTransferMigration",
        undefined,
        account0.address, // DAO
        hub.address // diamond
      );
      await migrationRegistry.approve(
        singleAssetVault.address,
        singleAssetVault.address,
        migration.address
      );

      weth = await getContractAt<ERC20>("ERC20", WETH);
      // Pre-load owner and buyer w/ DAI
      await dai
        .connect(tokenHolder)
        .transfer(account2.address, ethers.utils.parseEther("50"));

      await weth
        .connect(tokenHolder)
        .transfer(account2.address, ethers.utils.parseEther("50"));

      // Create meToken and subscribe to Hub1
      await meTokenRegistry
        .connect(account0)
        .subscribe("Carl meToken", "CARL", firstHubId, 0);
      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account0.address
      );
      meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);
      // Create Hub2 w/ same args but different refund Ratio
      await hub.register(
        account0.address,
        WETH,
        singleAssetVault.address,
        curve.address,
        targetRefundRatio,
        encodedCurveInfo,
        encodedVaultArgs
      );
      await hub.setHubWarmup(7 * 60 * 24 * 24); // 1 week
      await meTokenRegistry.setMeTokenWarmup(2 * 60 * 24 * 24); // 2 days
      await meTokenRegistry.setMeTokenDuration(4 * 60 * 24 * 24); // 4 days
      await meTokenRegistry.setMeTokenCooldown(5 * 60 * 24 * 24); // 5 days

      const block = await ethers.provider.getBlock("latest");
      const earliestSwapTime = block.timestamp + 600 * 60; // 10h in future
      const encodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint24"],
        [earliestSwapTime, fees]
      );
      await meTokenRegistry.initResubscribe(
        meToken.address,
        2,
        migration.address,
        encodedMigrationArgs
      );
      tokenDepositedInETH = 5;
      tokenDeposited = ethers.utils.parseEther(tokenDepositedInETH.toString());
      await dai
        .connect(account2)
        .approve(singleAssetVault.address, ethers.constants.MaxUint256);
      await dai
        .connect(account2)
        .approve(migration.address, ethers.constants.MaxUint256);
      await weth
        .connect(account2)
        .approve(singleAssetVault.address, ethers.constants.MaxUint256);
      await weth
        .connect(account2)
        .approve(migration.address, ethers.constants.MaxUint256);
    });

    describe("Warmup", () => {
      before(async () => {
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        const block = await ethers.provider.getBlock("latest");
        expect(meTokenInfo.startTime).to.be.gt(block.timestamp);
      });
      it("burn() [owner]: assets received do not apply refundRatio", async () => {
        await foundry
          .connect(account2)
          .mint(meToken.address, tokenDeposited, account0.address);

        const ownerMeTokenBefore = await meToken.balanceOf(account0.address);
        const ownerDAIBefore = await dai.balanceOf(account0.address);

        await foundry
          .connect(account0)
          .burn(meToken.address, ownerMeTokenBefore, account0.address);

        const totalSupply = await meToken.totalSupply();
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );

        const ownerMeTokenAfter = await meToken.balanceOf(account0.address);
        const ownerDAIAfter = await dai.balanceOf(account0.address);
        const vaultDAIAfter = await dai.balanceOf(singleAssetVault.address);

        expect(totalSupply).to.equal(0);
        expect(ownerMeTokenAfter).to.equal(0);
        expect(ownerDAIAfter.sub(ownerDAIBefore)).to.equal(tokenDeposited);
        expect(vaultDAIAfter).to.equal(0);
        expect(meTokenInfo.balancePooled).to.equal(0);
        expect(meTokenInfo.balanceLocked).to.equal(0);
      });
      it("burn() [buyer]: assets received based on initial refundRatio", async () => {
        await foundry
          .connect(account2)
          .mint(meToken.address, tokenDeposited, account1.address);

        const buyerMeTokenBefore = await meToken.balanceOf(account1.address);
        const buyerDAIBefore = await dai.balanceOf(account1.address);
        const vaultDAIBefore = await dai.balanceOf(singleAssetVault.address);

        await foundry
          .connect(account1) // non owner
          .burn(meToken.address, buyerMeTokenBefore, account1.address);

        const totalSupply = await meToken.totalSupply();
        const buyerMeTokenAfter = await meToken.balanceOf(account1.address);
        const buyerDAIAfter = await dai.balanceOf(account1.address);
        const vaultDAIAfter = await dai.balanceOf(singleAssetVault.address);
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );

        const refundAmount = tokenDeposited.mul(initialRefundRatio).div(1e6);

        expect(totalSupply).to.equal(0);
        expect(buyerMeTokenAfter).to.equal(0);
        expect(buyerDAIAfter.sub(buyerDAIBefore)).to.equal(refundAmount);
        expect(vaultDAIBefore.sub(vaultDAIAfter)).to.equal(refundAmount);
        expect(meTokenInfo.balancePooled).to.equal(0);
        expect(meTokenInfo.balanceLocked).to.gt(0); // due to refund ratio
      });
    });

    describe("Duration", () => {
      before(async () => {
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        await mineBlock(meTokenInfo.startTime.toNumber() + 2);

        const block = await ethers.provider.getBlock("latest");
        expect(meTokenInfo.startTime).to.be.lt(block.timestamp);
      });
      it("burn() [owner]: assets received do not apply refundRatio", async () => {
        const vaultDAIBeforeMint = await dai.balanceOf(
          singleAssetVault.address
        );
        const tx = await foundry
          .connect(account2)
          .mint(meToken.address, tokenDeposited, account0.address);

        await tx.wait();

        await expect(tx).to.emit(meTokenRegistry, "UpdateBalances");

        const ownerMeTokenBefore = await meToken.balanceOf(account0.address);
        const ownerDAIBefore = await dai.balanceOf(account0.address);
        const vaultDAIBefore = await dai.balanceOf(singleAssetVault.address);
        const ownerWETHBefore = await weth.balanceOf(account0.address);
        const vaultWETHBefore = await weth.balanceOf(singleAssetVault.address);
        const migrationDAIBefore = await dai.balanceOf(migration.address);
        const migrationWETHBefore = await weth.balanceOf(migration.address);

        expect(vaultDAIBeforeMint).to.be.gt(0);
        expect(vaultDAIBefore).to.be.equal(0); // as all is swapped for weth and goes to migration
        // TODO check extra balance due to swap
        expect(migrationWETHBefore).to.gt(tokenDeposited); // migration vault receives minted funds plus dai swap

        await foundry
          .connect(account0)
          .burn(meToken.address, ownerMeTokenBefore, account0.address);

        const totalSupply = await meToken.totalSupply();
        const ownerMeTokenAfter = await meToken.balanceOf(account0.address);
        const ownerDAIAfter = await dai.balanceOf(account0.address);
        const vaultDAIAfter = await dai.balanceOf(singleAssetVault.address);
        const ownerWETHAfter = await weth.balanceOf(account0.address);
        const vaultWETHAfter = await weth.balanceOf(singleAssetVault.address);
        const migrationDAIAfter = await dai.balanceOf(migration.address);
        const migrationWETHAfter = await weth.balanceOf(migration.address);
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );

        expect(totalSupply).to.equal(0);
        expect(ownerMeTokenAfter).to.equal(0); // as all tokens are burned
        expect(ownerDAIAfter).to.equal(ownerDAIBefore); // as owner receives new fund in weth
        expect(vaultDAIBefore).to.equal(vaultDAIAfter); // as vault do not receive any funds
        expect(vaultWETHBefore).to.equal(vaultWETHAfter); // as vault do not receive any funds
        expect(migrationDAIBefore).to.equal(migrationDAIAfter); // as migration receives new fund in weth
        expect(migrationWETHAfter).to.equal(0); // as all funds are transferred to owner
        expect(ownerWETHAfter.sub(ownerWETHBefore)).to.equal(
          migrationWETHBefore
        ); // as all token deposited goes to owner plus swap tokens
        expect(meTokenInfo.balancePooled).to.equal(0);
        expect(meTokenInfo.balanceLocked).to.equal(0);
      });
      it("burn() [buyer]: assets received based on weighted average refundRatio", async () => {
        const tx = await foundry
          .connect(account2)
          .mint(meToken.address, tokenDeposited, account1.address);

        await expect(tx).to.not.emit(meTokenRegistry, "UpdateBalances");

        const buyerMeTokenBefore = await meToken.balanceOf(account1.address);
        const buyerDAIBefore = await dai.balanceOf(account1.address);
        const vaultDAIBefore = await dai.balanceOf(singleAssetVault.address);
        const buyerWETHBefore = await weth.balanceOf(account1.address);
        const vaultWETHBefore = await weth.balanceOf(singleAssetVault.address);
        const migrationDAIBefore = await dai.balanceOf(migration.address);
        const migrationWETHBefore = await weth.balanceOf(migration.address);

        expect(migrationWETHBefore).to.equal(tokenDeposited);

        await foundry
          .connect(account1) // non owner
          .burn(meToken.address, buyerMeTokenBefore, account1.address);

        const { startTime, endTime, targetHubId } =
          await meTokenRegistry.getMeTokenInfo(meToken.address);
        const { refundRatio: targetRefundRatio } = await hub.getHubInfo(
          targetHubId
        );
        const block = await ethers.provider.getBlock("latest");
        const calculatedWeightedAvg = weightedAverageSimulation(
          initialRefundRatio.toNumber(),
          targetRefundRatio.toNumber(),
          startTime.toNumber(),
          endTime.toNumber(),
          block.timestamp
        );

        const buyerMeTokenAfter = await meToken.balanceOf(account1.address);
        const buyerDAIAfter = await dai.balanceOf(account1.address);
        const vaultDAIAfter = await dai.balanceOf(singleAssetVault.address);
        const buyerWETHAfter = await weth.balanceOf(account1.address);
        const vaultWETHAfter = await weth.balanceOf(singleAssetVault.address);
        const migrationDAIAfter = await dai.balanceOf(migration.address);
        const migrationWETHAfter = await weth.balanceOf(migration.address);
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        const totalSupply = await meToken.totalSupply();

        const refundAmount = tokenDeposited
          .mul(Math.floor(calculatedWeightedAvg))
          .div(1e6);

        expect(totalSupply).to.equal(0);
        expect(buyerMeTokenAfter).to.equal(0); // as all tokens are burned
        expect(buyerDAIAfter).to.equal(buyerDAIBefore); // as buyer receives new fund in weth
        expect(vaultDAIBefore).to.equal(vaultDAIAfter); // as vault do not receive any funds
        expect(vaultWETHBefore).to.equal(vaultWETHAfter); // as vault do not receive any funds
        expect(migrationDAIBefore).to.equal(migrationDAIAfter); // as migration receives new fund in weth
        expect(meTokenInfo.balancePooled).to.equal(0);
        expect(meTokenInfo.balanceLocked).to.equal(
          tokenDeposited.sub(refundAmount)
        );
        expect(buyerWETHAfter.sub(buyerWETHBefore)).to.equal(refundAmount);
        expect(migrationWETHBefore.sub(migrationWETHAfter)).to.equal(
          refundAmount
        );
      });
    });

    describe("Cooldown", () => {
      before(async () => {
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        await mineBlock(meTokenInfo.endTime.toNumber() + 2);

        const block = await ethers.provider.getBlock("latest");
        expect(meTokenInfo.endTime).to.be.lt(block.timestamp);
      });
      it("burn() [owner]: assets received do not apply refundRatio", async () => {
        const migrationWETHBeforeMint = await weth.balanceOf(migration.address);

        const tx = await foundry
          .connect(account2)
          .mint(meToken.address, tokenDeposited, account0.address);

        await tx.wait();

        await expect(tx).to.not.emit(meTokenRegistry, "UpdateBalances");
        await expect(tx).to.emit(meTokenRegistry, "FinishResubscribe");

        const ownerMeTokenBefore = await meToken.balanceOf(account0.address);
        const ownerDAIBefore = await dai.balanceOf(account0.address);
        const vaultDAIBefore = await dai.balanceOf(singleAssetVault.address);
        const ownerWETHBefore = await weth.balanceOf(account0.address);
        const vaultWETHBefore = await weth.balanceOf(singleAssetVault.address);
        const migrationDAIBefore = await dai.balanceOf(migration.address);
        const migrationWETHBefore = await weth.balanceOf(migration.address);

        expect(migrationWETHBeforeMint).to.be.gt(0); // due to refund ration from last burn
        expect(vaultWETHBefore).to.equal(
          tokenDeposited.add(migrationWETHBeforeMint)
        );
        expect(migrationWETHBefore).to.equal(0); // as all funds are transferred to vault

        await foundry
          .connect(account0)
          .burn(meToken.address, ownerMeTokenBefore, account0.address);

        const totalSupply = await meToken.totalSupply();
        const ownerMeTokenAfter = await meToken.balanceOf(account0.address);
        const ownerDAIAfter = await dai.balanceOf(account0.address);
        const vaultDAIAfter = await dai.balanceOf(singleAssetVault.address);
        const ownerWETHAfter = await weth.balanceOf(account0.address);
        const vaultWETHAfter = await weth.balanceOf(singleAssetVault.address);
        const migrationDAIAfter = await dai.balanceOf(migration.address);
        const migrationWETHAfter = await weth.balanceOf(migration.address);
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );

        expect(totalSupply).to.equal(0);
        expect(ownerMeTokenAfter).to.equal(0); // as all tokens are burned
        expect(ownerDAIAfter).to.equal(ownerDAIBefore); // as owner receives new fund in weth
        expect(vaultDAIBefore).to.equal(vaultDAIAfter); // as vault receives new fund in weth
        expect(migrationDAIBefore).to.equal(migrationDAIAfter); // as migration receives no funds
        expect(migrationWETHAfter).to.equal(migrationWETHBefore); // as migration receives no funds

        expect(vaultWETHAfter).to.equal(0); // as all token deposited goes to owner incl migration
        expect(ownerWETHAfter.sub(ownerWETHBefore)).to.equal(vaultWETHBefore); // as all token deposited goes to owner plus migration
        expect(meTokenInfo.balancePooled).to.equal(0);
        expect(meTokenInfo.balanceLocked).to.equal(0);
      });
      it("burn() [buyer]: assets received based on targetRefundRatio", async () => {
        const vaultWETHBeforeMint = await weth.balanceOf(
          singleAssetVault.address
        );

        const tx = await foundry
          .connect(account2)
          .mint(meToken.address, tokenDeposited, account1.address);

        await tx.wait();

        await expect(tx).to.not.emit(meTokenRegistry, "UpdateBalances");
        await expect(tx).to.not.emit(meTokenRegistry, "FinishResubscribe");

        const buyerMeTokenBefore = await meToken.balanceOf(account1.address);
        const buyerDAIBefore = await dai.balanceOf(account1.address);
        const vaultDAIBefore = await dai.balanceOf(singleAssetVault.address);
        const buyerWETHBefore = await weth.balanceOf(account1.address);
        const vaultWETHBefore = await weth.balanceOf(singleAssetVault.address);
        const migrationDAIBefore = await dai.balanceOf(migration.address);
        const migrationWETHBefore = await weth.balanceOf(migration.address);

        expect(vaultWETHBeforeMint).to.equal(0);
        expect(vaultWETHBefore).to.equal(tokenDeposited);

        await foundry
          .connect(account1)
          .burn(meToken.address, buyerMeTokenBefore, account1.address);

        const totalSupply = await meToken.totalSupply();
        const buyerMeTokenAfter = await meToken.balanceOf(account1.address);
        const buyerDAIAfter = await dai.balanceOf(account1.address);
        const vaultDAIAfter = await dai.balanceOf(singleAssetVault.address);
        const buyerWETHAfter = await weth.balanceOf(account1.address);
        const vaultWETHAfter = await weth.balanceOf(singleAssetVault.address);
        const migrationDAIAfter = await dai.balanceOf(migration.address);
        const migrationWETHAfter = await weth.balanceOf(migration.address);
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );

        const refundAmount = tokenDeposited.mul(targetRefundRatio).div(1e6);

        expect(totalSupply).to.equal(0);
        expect(buyerMeTokenAfter).to.equal(0); // as all tokens are burned
        expect(buyerDAIAfter).to.equal(buyerDAIBefore); // as buyer receives new fund in weth
        expect(vaultDAIBefore).to.equal(vaultDAIAfter); // as vault receives new fund in weth
        expect(migrationDAIBefore).to.equal(migrationDAIAfter); // as migration receives no funds
        expect(migrationWETHAfter).to.equal(migrationWETHBefore); // as migration receives no funds
        expect(vaultWETHAfter).to.equal(tokenDeposited.sub(refundAmount)); // refund ration token remains in vault
        expect(buyerWETHAfter.sub(buyerWETHBefore)).to.equal(refundAmount); // buyer only receives refund ratio
        expect(meTokenInfo.balancePooled).to.equal(0);
        expect(meTokenInfo.balanceLocked).to.equal(
          tokenDeposited.sub(refundAmount)
        );
      });
    });
  });
};
setup().then(() => {
  run();
});
