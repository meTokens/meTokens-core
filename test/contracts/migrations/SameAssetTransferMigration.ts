import { expect } from "chai";
import { ethers, getNamedAccounts, network } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Signer, BigNumber } from "ethers";
import { deploy, getContractAt } from "../../utils/helpers";
import { impersonate, mineBlock } from "../../utils/hardhatNode";
import { hubSetup } from "../../utils/hubSetup";
import {
  FoundryFacet,
  HubFacet,
  MeTokenRegistryFacet,
  MigrationRegistry,
  MeToken,
  ERC20,
  SingleAssetVault,
  SameAssetTransferMigration,
  VaultRegistry,
} from "../../../artifacts/types";

const setup = async () => {
  describe("SameAssetTransferMigration.sol", () => {
    let DAI: string;
    let WETH: string;
    let DAIWhale: string;
    let daiHolder: Signer;
    let dai: ERC20;
    let account0: SignerWithAddress;
    let account1: SignerWithAddress;
    let account2: SignerWithAddress;
    let migrationRegistry: MigrationRegistry;
    let vaultRegistry: VaultRegistry;
    let migration: SameAssetTransferMigration;
    let meTokenRegistry: MeTokenRegistryFacet;
    let initialVault: SingleAssetVault;
    let foundry: FoundryFacet;
    let meToken: MeToken;
    let hub: HubFacet;

    const hubId1 = 1;
    const hubId2 = 2;
    const name = "Carl meToken";
    const symbol = "CARL";
    const amount = ethers.utils.parseEther("100");
    const refundRatio = 500000;
    const MAX_WEIGHT = 1000000;
    const reserveWeight = MAX_WEIGHT / 2;
    const PRECISION = BigNumber.from(10).pow(6);
    const baseY = PRECISION.div(1000);

    let encodedMigrationArgs: string;
    let encodedVaultDAIArgs: string;
    let block;
    let migrationDetails: [boolean, boolean] & {
      isMigrating: boolean;
      started: boolean;
    };

    let snapshotId: any;
    before(async () => {
      snapshotId = await network.provider.send("evm_snapshot");
      ({ DAI, DAIWhale, WETH } = await getNamedAccounts());

      encodedVaultDAIArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [DAI]
      );

      encodedMigrationArgs = "0x";

      ({
        hub,
        foundry,
        vaultRegistry,
        migrationRegistry,
        singleAssetVault: initialVault,
        meTokenRegistry,
        account0,
        account1,
        account2,
      } = await hubSetup(
        baseY,
        reserveWeight,
        encodedVaultDAIArgs,
        refundRatio
      ));

      // Register 2nd hub to which we'll migrate to
      await hub.register(
        account0.address,
        DAI,
        initialVault.address,
        refundRatio,
        baseY,
        reserveWeight,
        encodedVaultDAIArgs
      );
      // Deploy uniswap migration and approve it to the registry
      migration = await deploy<SameAssetTransferMigration>(
        "SameAssetTransferMigration",
        undefined,
        account0.address,
        hub.address // diamond
      );
      await migrationRegistry.approve(
        initialVault.address,
        initialVault.address,
        migration.address
      );
      // Pre fund owner & buyer w/ DAI
      dai = await getContractAt<ERC20>("ERC20", DAI);
      daiHolder = await impersonate(DAIWhale);
      dai
        .connect(daiHolder)
        .transfer(account0.address, ethers.utils.parseEther("100"));
      dai
        .connect(daiHolder)
        .transfer(account2.address, ethers.utils.parseEther("1000"));

      let max = ethers.constants.MaxUint256;
      await dai.connect(account1).approve(initialVault.address, max);
      await dai.connect(account2).approve(initialVault.address, max);
      await dai.connect(account2).approve(migration.address, max);

      // Create meToken
      await meTokenRegistry
        .connect(account1)
        .subscribe(name, symbol, hubId1, amount);
      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account1.address
      );
      meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);
    });

    describe("isValid()", () => {
      it("Returns true for valid encoding", async () => {
        const isValid = await migration.isValid(encodedMigrationArgs);
        expect(isValid).to.be.true;
      });
    });

    describe("initMigration()", () => {
      it("Reverts when sender is not diamond", async () => {
        await expect(
          migration.initMigration(meToken.address, encodedMigrationArgs)
        ).to.be.revertedWith("!diamond");
      });
      it("Reverts when hub and targetHub asset are not same", async () => {
        const targetVault = await deploy<SingleAssetVault>(
          "SingleAssetVault",
          undefined, //no libs
          account0.address, // DAO
          hub.address // diamond
        );
        await vaultRegistry.approve(targetVault.address);

        // Hub 3
        await hub.register(
          account0.address,
          WETH,
          targetVault.address,
          refundRatio,
          baseY,
          reserveWeight,
          encodedVaultDAIArgs
        );

        await migrationRegistry.approve(
          initialVault.address,
          targetVault.address,
          migration.address
        );

        await expect(
          meTokenRegistry
            .connect(account1)
            .initResubscribe(
              meToken.address,
              3,
              migration.address,
              encodedMigrationArgs
            )
        ).to.be.revertedWith("same asset");
      });
      it("Set correct _ust values", async () => {
        migrationDetails = await migration.getDetails(meToken.address);
        expect(migrationDetails.isMigrating).to.equal(false);
        expect(migrationDetails.started).to.equal(false);

        await meTokenRegistry
          .connect(account1)
          .initResubscribe(
            meToken.address,
            hubId2,
            migration.address,
            encodedMigrationArgs
          );
        migrationDetails = await migration.getDetails(meToken.address);
        expect(migrationDetails.isMigrating).to.equal(true);
        expect(migrationDetails.started).to.equal(false);
      });
    });

    describe("poke()", () => {
      it("should be able to call for invalid metoken, but wont run startMigration()", async () => {
        const tx = await migration.poke(account0.address);
        await tx.wait();

        await expect(tx).to.not.emit(initialVault, "StartMigration");
      });
      it("should be able to call when migration before startTime(), but wont run startMigration()", async () => {
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        block = await ethers.provider.getBlock("latest");
        expect(meTokenInfo.startTime).to.be.gt(block.timestamp);

        const tx = await migration.poke(meToken.address);
        await expect(tx).to.not.emit(initialVault, "StartMigration");
      });
      it("Triggers startMigration()", async () => {
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        await mineBlock(meTokenInfo.startTime.toNumber() + 2);
        block = await ethers.provider.getBlock("latest");
        expect(meTokenInfo.startTime).to.be.lt(block.timestamp);

        const tx = await migration.poke(meToken.address);
        await tx.wait();

        await expect(tx)
          .to.emit(initialVault, "StartMigration")
          .withArgs(meToken.address);
        migrationDetails = await migration.getDetails(meToken.address);
        expect(migrationDetails.started).to.be.equal(true);
      });
      it("should be able to call when migration already started, but wont run startMigration()", async () => {
        const tx = await migration.poke(meToken.address);
        await tx.wait();

        await expect(tx).to.not.emit(initialVault, "StartMigration");
      });
    });
    describe("finishMigration()", () => {
      it("Reverts when sender is not diamond", async () => {
        await expect(
          migration.finishMigration(meToken.address)
        ).to.be.revertedWith("!diamond");
      });
      it("Should not trigger startsMigration() if already started", async () => {
        const meTokenRegistryDetails = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );

        await mineBlock(meTokenRegistryDetails.endTime.toNumber() + 2);
        block = await ethers.provider.getBlock("latest");
        expect(meTokenRegistryDetails.endTime).to.be.lt(block.timestamp);

        const tx = await meTokenRegistry.finishResubscribe(meToken.address);
        await tx.wait();

        await expect(tx).to.emit(meTokenRegistry, "FinishResubscribe");
        await expect(tx)
          .to.emit(dai, "Transfer")
          .withArgs(
            migration.address,
            initialVault.address,
            meTokenRegistryDetails.balancePooled.add(
              meTokenRegistryDetails.balanceLocked
            )
          );
        await expect(tx).to.not.emit(initialVault, "StartMigration");

        migrationDetails = await migration.getDetails(meToken.address);
        expect(migrationDetails.isMigrating).to.equal(false);
        expect(migrationDetails.started).to.equal(false);
      });
      it("Triggers startsMigration() if it hasn't already started", async () => {
        let meTokenRegistryDetails = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );

        encodedMigrationArgs = "0x";

        await meTokenRegistry
          .connect(account1)
          .initResubscribe(
            meToken.address,
            hubId1,
            migration.address,
            encodedMigrationArgs
          );
        meTokenRegistryDetails = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );

        await mineBlock(meTokenRegistryDetails.endTime.toNumber() + 2);
        block = await ethers.provider.getBlock("latest");
        expect(meTokenRegistryDetails.endTime).to.be.lt(block.timestamp);

        const tx = await meTokenRegistry.finishResubscribe(meToken.address);
        await tx.wait();

        meTokenRegistryDetails = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        await expect(tx).to.emit(meTokenRegistry, "FinishResubscribe");
        await expect(tx)
          .to.emit(initialVault, "StartMigration")
          .withArgs(meToken.address);
        await expect(tx)
          .to.emit(dai, "Transfer")
          .withArgs(
            migration.address,
            initialVault.address,
            meTokenRegistryDetails.balancePooled.add(
              meTokenRegistryDetails.balanceLocked
            )
          );
        migrationDetails = await migration.getDetails(meToken.address);
        expect(migrationDetails.isMigrating).to.equal(false);
        expect(migrationDetails.started).to.equal(false);
      });

      describe("During resubscribe", () => {
        before(async () => {
          await meTokenRegistry
            .connect(account2)
            .subscribe(name, symbol, hubId1, 0);
          const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
            account2.address
          );
          meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);

          encodedMigrationArgs = "0x";

          await meTokenRegistry
            .connect(account2)
            .initResubscribe(
              meToken.address,
              hubId2,
              migration.address,
              encodedMigrationArgs
            );
          migrationDetails = await migration.getDetails(meToken.address);
        });

        it("From warmup => startTime: assets transferred to/from initial vault", async () => {
          const initialVaultBalanceBefore = await dai.balanceOf(
            initialVault.address
          );

          const tx = await foundry
            .connect(account2)
            .mint(meToken.address, amount, account2.address);
          await tx.wait();

          await expect(tx).to.be.emit(dai, "Transfer");

          const initialVaultBalanceAfter = await dai.balanceOf(
            initialVault.address
          );

          expect(
            initialVaultBalanceAfter.sub(initialVaultBalanceBefore)
          ).to.equal(amount);
        });
        it("From startTime => endTime: assets transferred to/from migration vault", async () => {
          const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
            meToken.address
          );

          await mineBlock(meTokenInfo.startTime.toNumber() + 2);
          block = await ethers.provider.getBlock("latest");
          expect(meTokenInfo.startTime).to.be.lt(block.timestamp);

          const initialVaultDAIBefore = await dai.balanceOf(
            initialVault.address
          );
          const migrationDAIBefore = await dai.balanceOf(migration.address);

          const tx = await foundry
            .connect(account2)
            .mint(meToken.address, amount, account2.address);
          await tx.wait();

          await expect(tx).to.be.emit(dai, "Transfer");

          const initialVaultDAIAfter = await dai.balanceOf(
            initialVault.address
          );
          const migrationDAIAfter = await dai.balanceOf(migration.address);

          expect(initialVaultDAIBefore.sub(initialVaultDAIAfter)).to.equal(
            amount
          ); // amount deposited before start time
          expect(migrationDAIAfter.sub(migrationDAIBefore)).to.be.equal(
            amount.mul(2)
          );
        });
        it("After endTime: assets transferred to/from target vault", async () => {
          const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
            meToken.address
          );

          await mineBlock(meTokenInfo.endTime.toNumber() + 2);
          block = await ethers.provider.getBlock("latest");
          expect(meTokenInfo.endTime).to.be.lt(block.timestamp);

          const initialVaultDAIBefore = await dai.balanceOf(
            initialVault.address
          );
          const migrationDAIBefore = await dai.balanceOf(migration.address);

          const tx = await foundry
            .connect(account2)
            .mint(meToken.address, amount, account2.address);
          await tx.wait();

          await expect(tx).to.be.emit(dai, "Transfer");

          const initialVaultDAIAfter = await dai.balanceOf(
            initialVault.address
          );
          const migrationDAIAfter = await dai.balanceOf(migration.address);

          expect(initialVaultDAIAfter.sub(initialVaultDAIBefore)).to.equal(
            amount.mul(3)
          );
          expect(migrationDAIBefore.sub(migrationDAIAfter)).to.be.equal(
            amount.mul(2)
          );
        });
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
