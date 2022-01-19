import { ethers, getNamedAccounts } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { deploy, getContractAt } from "../../utils/helpers";
import { Signer, BigNumber } from "ethers";
import { ERC20 } from "../../../artifacts/types/ERC20";
import { Foundry } from "../../../artifacts/types/Foundry";
import { Hub } from "../../../artifacts/types/Hub";
import { BancorABDK } from "../../../artifacts/types/BancorABDK";
import { MeTokenRegistry } from "../../../artifacts/types/MeTokenRegistry";
import { MigrationRegistry } from "../../../artifacts/types/MigrationRegistry";
import { SingleAssetVault } from "../../../artifacts/types/SingleAssetVault";
import { MeToken } from "../../../artifacts/types/MeToken";
import { impersonate, mineBlock, passHours } from "../../utils/hardhatNode";
import { SameAssetTransferMigration } from "../../../artifacts/types/SameAssetTransferMigration";
import { hubSetup } from "../../utils/hubSetup";
import { expect } from "chai";
import { Fees } from "../../../artifacts/types/Fees";
import { VaultRegistry } from "../../../artifacts/types/VaultRegistry";
import { WeightedAverage } from "../../../artifacts/types/WeightedAverage";

const setup = async () => {
  describe("SameAssetTransferMigration.sol", () => {
    let earliestSwapTime: number;
    let DAI: string;
    let DAIWhale: string;
    let daiHolder: Signer;
    let dai: ERC20;
    let account0: SignerWithAddress;
    let account1: SignerWithAddress;
    let account2: SignerWithAddress;
    let migrationRegistry: MigrationRegistry;
    let migration: SameAssetTransferMigration;
    let curve: BancorABDK;
    let meTokenRegistry: MeTokenRegistry;
    let initialVault: SingleAssetVault;
    // let targetVault: SingleAssetVault;
    let foundry: Foundry;
    let meToken: MeToken;
    let hub: Hub;

    const hubId1 = 1;
    const hubId2 = 2;
    const name = "Carl meToken";
    const symbol = "CARL";
    const amount = ethers.utils.parseEther("100");
    const fees = 3000;
    const refundRatio = 500000;
    const MAX_WEIGHT = 1000000;
    const reserveWeight = MAX_WEIGHT / 2;
    const PRECISION = BigNumber.from(10).pow(6);
    const baseY = PRECISION.div(1000).toString();
    const hubWarmup = 7 * 60 * 24 * 24; // 1 week
    const warmup = 2 * 60 * 24 * 24; // 2 days
    const duration = 4 * 60 * 24 * 24; // 4 days
    const coolDown = 5 * 60 * 24 * 24; // 5 days

    let encodedCurveDetails: string;
    let encodedMigrationArgs: string;
    let badEncodedMigrationArgs: string;
    let encodedVaultDAIArgs: string;
    let block;
    let migrationDetails: [boolean, boolean] & {
      isMigrating: boolean;
      started: boolean;
    };

    before(async () => {
      ({ DAI, DAIWhale } = await getNamedAccounts());
      encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint32"],
        [baseY, reserveWeight]
      );
      encodedVaultDAIArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [DAI]
      );

      const block = await ethers.provider.getBlock("latest");
      earliestSwapTime = block.timestamp + 600 * 60; // 10h in future

      encodedMigrationArgs = "0x";
      const weightedAverage = await deploy<WeightedAverage>("WeightedAverage");
      foundry = await deploy<Foundry>("Foundry", {
        WeightedAverage: weightedAverage.address,
      });
      hub = await deploy<Hub>("Hub");
      curve = await deploy<BancorABDK>(
        "BancorABDK",
        undefined,
        hub.address,
        foundry.address
      );

      ({
        migrationRegistry,
        singleAssetVault: initialVault,
        account0,
        account1,
        account2,
        meTokenRegistry,
      } = await hubSetup(
        encodedCurveDetails,
        encodedVaultDAIArgs,
        refundRatio,
        hub,
        foundry,
        curve
      ));

      // targetVault = await deploy<SingleAssetVault>(
      //   "SingleAssetVault",
      //   undefined, //no libs
      //   account0.address, // DAO
      //   foundry.address, // foundry
      //   hub.address, // hub
      //   meTokenRegistry.address, //IMeTokenRegistry
      //   migrationRegistry.address //IMigrationRegistry
      // );
      // await vaultRegistry.approve(targetVault.address);

      // Register 2nd hub to which we'll migrate to
      await hub.register(
        account0.address,
        DAI,
        initialVault.address,
        curve.address,
        refundRatio,
        encodedCurveDetails,
        encodedVaultDAIArgs
      );
      // Deploy uniswap migration and approve it to the registry
      migration = await deploy<SameAssetTransferMigration>(
        "SameAssetTransferMigration",
        undefined,
        account0.address,
        foundry.address,
        hub.address,
        meTokenRegistry.address,
        migrationRegistry.address
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
      await dai.connect(account1).approve(meTokenRegistry.address, max);
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
      await hub.setWarmup(hubWarmup);
    });

    describe("isValid()", () => {
      // TODO checks when metoken do not have a hub
      // it("Returns false for invalid encoding", async () => {
      //   const isValid = await migration.isValid(meToken.address, "0x");
      //   expect(isValid).to.be.false;
      // });
      it("Returns true for valid encoding", async () => {
        const isValid = await migration.isValid(
          meToken.address,
          encodedMigrationArgs
        );
        expect(isValid).to.be.true;
      });
      // it("Returns false for start time before current time", async () => {
      //   badEncodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
      //     ["uint256", "uint24"],
      //     [earliestSwapTime - 720 * 60, fees] // 2 hours beforehand
      //   );
      //   const isValid = await migration.isValid(
      //     meToken.address,
      //     badEncodedMigrationArgs
      //   );
      //   expect(isValid).to.be.false;
      // });
      // it("Returns false for nonexistent meToken", async () => {
      //   const isValid = await migration.isValid(
      //     account0.address,
      //     encodedMigrationArgs
      //   );
      //   expect(isValid).to.be.false;
      // });
      // it("Returns false for invalid fee", async () => {
      //   badEncodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
      //     ["uint256", "uint24"],
      //     [earliestSwapTime, 2999]
      //   );
      //   const isValid = await migration.isValid(
      //     meToken.address,
      //     badEncodedMigrationArgs
      //   );
      //   expect(isValid).to.be.false;
      // });
    });

    describe("initMigration()", () => {
      it("Reverts when sender is not meTokenRegistry", async () => {
        await expect(
          migration.initMigration(meToken.address, encodedMigrationArgs)
        ).to.be.revertedWith("!meTokenRegistry");
      });
      // it("Fails from bad encodings", async () => {
      //   await expect(
      //     meTokenRegistry
      //       .connect(account1)
      //       .initResubscribe(
      //         meToken.address,
      //         hubId2,
      //         migration.address,
      //         badEncodedMigrationArgs
      //       )
      //   ).to.be.revertedWith("Invalid _encodedMigrationArgs");
      // });
      it("should revert when try to approve already approved vaults", async () => {
        await expect(
          migrationRegistry.approve(
            initialVault.address,
            initialVault.address,
            migration.address
          )
        ).to.be.revertedWith("migration already approved");
      });
      it("should be able to unapprove migration vaults", async () => {
        let tx = await migrationRegistry.unapprove(
          initialVault.address,
          initialVault.address,
          migration.address
        );
        await tx.wait();

        // should revert to init resubscribe when unapproved
        await expect(
          meTokenRegistry
            .connect(account1)
            .initResubscribe(
              meToken.address,
              hubId2,
              migration.address,
              encodedMigrationArgs
            )
        ).to.be.revertedWith("!approved");
      });
      it("should revert when try to unapprove already unapproved vaults", async () => {
        await expect(
          migrationRegistry.unapprove(
            initialVault.address,
            initialVault.address,
            migration.address
          )
        ).to.be.revertedWith("migration not approved");

        // approve vaults again
        await migrationRegistry.approve(
          initialVault.address,
          initialVault.address,
          migration.address
        );
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
      // it("should be able to call before soonest, but wont run startMigration()", async () => {
      //   migrationDetails = await migration.getDetails(meToken.address);
      //   block = await ethers.provider.getBlock("latest");
      //   expect(migrationDetails.soonest).to.be.gt(block.timestamp);

      //   const tx = await migration.poke(meToken.address);
      //   await tx.wait();

      //   await expect(tx).to.not.emit(initialVault, "StartMigration");
      //   migrationDetails = await migration.getDetails(meToken.address);
      //   expect(migrationDetails.started).to.be.equal(false);
      // });
      it("Triggers startMigration()", async () => {
        const meTokenDetails = await meTokenRegistry.getDetails(
          meToken.address
        );
        await mineBlock(meTokenDetails.startTime.toNumber() + 2);
        block = await ethers.provider.getBlock("latest");
        expect(meTokenDetails.startTime).to.be.lt(block.timestamp);

        const tx = await migration.poke(meToken.address);
        await tx.wait();

        await expect(tx)
          .to.emit(initialVault, "StartMigration")
          .withArgs(meToken.address);
        // .to.emit(meTokenRegistry, "UpdateBalances");
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
      it("Reverts when sender is not meTokenRegistry", async () => {
        await expect(
          migration.finishMigration(meToken.address)
        ).to.be.revertedWith("!meTokenRegistry");
      });
      it("Should not trigger startsMigration() if already started", async () => {
        const meTokenRegistryDetails = await meTokenRegistry.getDetails(
          meToken.address
        );

        block = await ethers.provider.getBlock("latest");
        expect(meTokenRegistryDetails.endTime).to.be.lt(block.timestamp);

        const tx = await meTokenRegistry.finishResubscribe(meToken.address);
        await tx.wait();

        await expect(tx)
          .to.emit(meTokenRegistry, "FinishResubscribe")
          .to.emit(dai, "Transfer")
          .withArgs(
            migration.address,
            initialVault.address,
            meTokenRegistryDetails.balancePooled.add(
              meTokenRegistryDetails.balanceLocked
            )
          )
          .to.not.emit(initialVault, "StartMigration");

        migrationDetails = await migration.getDetails(meToken.address);
        // expect(migrationDetails.fee).to.equal(0);
        // expect(migrationDetails.soonest).to.equal(0);
        expect(migrationDetails.isMigrating).to.equal(false);
        expect(migrationDetails.started).to.equal(false);
        // expect(migrationDetails.swapped).to.equal(false);
      });
      // it("should revert before soonest", async () => {
      //   // await migrationRegistry.approve(
      //   //   initialVault.address,
      //   //   initialVault.address,
      //   //   migration.address
      //   // );

      //   block = await ethers.provider.getBlock("latest");
      //   earliestSwapTime = block.timestamp + 600 * 60; // 10h in future

      //   encodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
      //     ["uint256", "uint24"],
      //     [earliestSwapTime, fees]
      //   );

      //   await meTokenRegistry
      //     .connect(account1)
      //     .initResubscribe(
      //       meToken.address,
      //       hubId1,
      //       migration.address,
      //       encodedMigrationArgs
      //     );
      //   migrationDetails = await migration.getDetails(meToken.address);
      //   // expect(migrationDetails.fee).to.equal(fees);
      //   // expect(migrationDetails.soonest).to.equal(earliestSwapTime);

      //   const meTokenRegistryDetails = await meTokenRegistry.getDetails(
      //     meToken.address
      //   );
      //   await mineBlock(meTokenRegistryDetails.endTime.toNumber() + 2);
      //   block = await ethers.provider.getBlock("latest");
      //   expect(meTokenRegistryDetails.endTime).to.be.lt(block.timestamp);

      //   await expect(
      //     meTokenRegistry.finishResubscribe(meToken.address)
      //   ).to.be.revertedWith("timestamp < soonest");
      // });
      it("Triggers startsMigration() if it hasn't already started", async () => {
        block = await ethers.provider.getBlock("latest");
        earliestSwapTime = block.timestamp + 600 * 60; // 10h in future

        encodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
          ["uint256", "uint24"],
          [earliestSwapTime, fees]
        );

        await meTokenRegistry
          .connect(account1)
          .initResubscribe(
            meToken.address,
            hubId1,
            migration.address,
            encodedMigrationArgs
          );
        let meTokenRegistryDetails = await meTokenRegistry.getDetails(
          meToken.address
        );

        const tx = await meTokenRegistry.finishResubscribe(meToken.address);
        await tx.wait();

        meTokenRegistryDetails = await meTokenRegistry.getDetails(
          meToken.address
        );
        await expect(tx)
          .to.emit(meTokenRegistry, "FinishResubscribe")
          .to.emit(initialVault, "StartMigration")
          .withArgs(meToken.address)
          // TODO check updated balance here
          .to.emit(dai, "Transfer")
          .withArgs(
            migration.address,
            initialVault.address,
            meTokenRegistryDetails.balancePooled.add(
              meTokenRegistryDetails.balanceLocked
            )
          );
        // .to.emit(meTokenRegistry, "UpdateBalances");
        migrationDetails = await migration.getDetails(meToken.address);
        // expect(migrationDetails.fee).to.equal(0);
        // expect(migrationDetails.soonest).to.equal(0);
        expect(migrationDetails.isMigrating).to.equal(false);
        expect(migrationDetails.started).to.equal(false);
        // expect(migrationDetails.swapped).to.equal(false);
      });

      describe("During resubscribe", () => {
        before(async () => {
          await meTokenRegistry.setWarmup(warmup);
          await meTokenRegistry.setDuration(duration);
          await meTokenRegistry.setCooldown(coolDown);

          await meTokenRegistry
            .connect(account2)
            .subscribe(name, symbol, hubId1, 0);
          const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
            account2.address
          );
          meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);

          block = await ethers.provider.getBlock("latest");
          earliestSwapTime = block.timestamp + 600 * 60; // 10h in future

          encodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
            ["uint256", "uint24"],
            [earliestSwapTime, fees]
          );

          await meTokenRegistry
            .connect(account2)
            .initResubscribe(
              meToken.address,
              hubId2,
              migration.address,
              encodedMigrationArgs
            );
          migrationDetails = await migration.getDetails(meToken.address);
          // expect(migrationDetails.fee).to.equal(fees);
          // expect(migrationDetails.soonest).to.equal(earliestSwapTime);
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
          const meTokenDetails = await meTokenRegistry.getDetails(
            meToken.address
          );

          await mineBlock(meTokenDetails.startTime.toNumber() + 2);
          block = await ethers.provider.getBlock("latest");
          expect(meTokenDetails.startTime).to.be.lt(block.timestamp);

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
          // TODO fix with swap balance
          // expect(migrationWETHAfter.sub(migrationWETHBefore)).to.be.gt(amount); // gt due to swap amount
        });
        it("After endTime: assets transferred to/from target vault", async () => {
          const meTokenDetails = await meTokenRegistry.getDetails(
            meToken.address
          );

          await mineBlock(meTokenDetails.endTime.toNumber() + 2);
          block = await ethers.provider.getBlock("latest");
          expect(meTokenDetails.endTime).to.be.lt(block.timestamp);

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
  });
};

setup().then(() => {
  run();
});
