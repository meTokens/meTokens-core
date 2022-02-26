import { expect } from "chai";
import { ethers, getNamedAccounts } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Signer, BigNumber } from "ethers";
import { deploy, getContractAt } from "../../utils/helpers";
import { impersonate, mineBlock } from "../../utils/hardhatNode";
import { hubSetup } from "../../utils/hubSetup";
import {
  FoundryFacet,
  HubFacet,
  MeTokenRegistryFacet,
  MeToken,
  ERC20,
  VaultRegistry,
  MigrationRegistry,
  SingleAssetVault,
  UniswapSingleTransferMigration,
  ICurve,
} from "../../../artifacts/types";

const setup = async () => {
  describe("UniswapSingleTransferMigration.sol", () => {
    let earliestSwapTime: number;
    let DAI: string;
    let WETH: string;
    let DAIWhale: string;
    let WETHWhale: string;
    let daiHolder: Signer;
    let wethHolder: Signer;
    let dai: ERC20;
    let weth: ERC20;
    let account0: SignerWithAddress;
    let account1: SignerWithAddress;
    let account2: SignerWithAddress;
    let migrationRegistry: MigrationRegistry;
    let migration: UniswapSingleTransferMigration;
    let curve: ICurve;
    let meTokenRegistry: MeTokenRegistryFacet;
    let initialVault: SingleAssetVault;
    let targetVault: SingleAssetVault;
    let foundry: FoundryFacet;
    let meToken: MeToken;
    let hub: HubFacet;
    let vaultRegistry: VaultRegistry;

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

    let encodedCurveInfo: string;
    let encodedMigrationArgs: string;
    let badEncodedMigrationArgs: string;
    let encodedVaultDAIArgs: string;
    let encodedVaultWETHArgs: string;
    let block;
    let migrationDetails: [BigNumber, number, boolean, boolean] & {
      soonest: BigNumber;
      fee: number;
      started: boolean;
      swapped: boolean;
    };

    before(async () => {
      ({ DAI, DAIWhale, WETH, WETHWhale } = await getNamedAccounts());
      encodedCurveInfo = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint32"],
        [baseY, reserveWeight]
      );
      encodedVaultDAIArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [DAI]
      );
      encodedVaultWETHArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [WETH]
      );

      const block = await ethers.provider.getBlock("latest");
      earliestSwapTime = block.timestamp + 600 * 60; // 10h in future

      encodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint24"],
        [earliestSwapTime, fees]
      );

      ({
        hub,
        curve,
        foundry,
        migrationRegistry,
        singleAssetVault: initialVault,
        vaultRegistry,
        meTokenRegistry,
        account0,
        account1,
        account2,
      } = await hubSetup(
        encodedCurveInfo,
        encodedVaultDAIArgs,
        refundRatio,
        "BancorCurve"
      ));

      targetVault = await deploy<SingleAssetVault>(
        "SingleAssetVault",
        undefined, //no libs
        account0.address, // DAO
        hub.address // diamond
      );
      await vaultRegistry.approve(targetVault.address);

      // Register 2nd hub to which we'll migrate to
      await hub.register(
        account0.address,
        WETH,
        targetVault.address,
        curve.address,
        refundRatio,
        encodedCurveInfo,
        encodedVaultWETHArgs
      );
      // Deploy uniswap migration and approve it to the registry
      migration = await deploy<UniswapSingleTransferMigration>(
        "UniswapSingleTransferMigration",
        undefined,
        account0.address,
        hub.address // diamond
      );
      await migrationRegistry.approve(
        initialVault.address,
        targetVault.address,
        migration.address
      );
      // Pre fund owner & buyer w/ DAI & WETH
      dai = await getContractAt<ERC20>("ERC20", DAI);
      weth = await getContractAt<ERC20>("ERC20", WETH);
      daiHolder = await impersonate(DAIWhale);
      wethHolder = await impersonate(WETHWhale);
      dai
        .connect(daiHolder)
        .transfer(account0.address, ethers.utils.parseEther("100"));
      dai
        .connect(daiHolder)
        .transfer(account2.address, ethers.utils.parseEther("1000"));
      weth
        .connect(wethHolder)
        .transfer(account0.address, ethers.utils.parseEther("10"));
      weth
        .connect(wethHolder)
        .transfer(account2.address, ethers.utils.parseEther("1000"));
      let max = ethers.constants.MaxUint256;
      await dai.connect(account1).approve(meTokenRegistry.address, max);
      await dai.connect(account2).approve(initialVault.address, max);
      await weth.connect(account2).approve(migration.address, max);
      await weth.connect(account2).approve(targetVault.address, max);

      // Create meToken
      await meTokenRegistry
        .connect(account1)
        .subscribe(name, symbol, hubId1, amount);
      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account1.address
      );
      meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);
      await hub.setHubWarmup(hubWarmup);
    });

    describe("isValid()", () => {
      it("Returns false for invalid encoding", async () => {
        const isValid = await migration.isValid(meToken.address, "0x");
        expect(isValid).to.be.false;
      });
      it("Returns true for valid encoding", async () => {
        const isValid = await migration.isValid(
          meToken.address,
          encodedMigrationArgs
        );
        expect(isValid).to.be.true;
      });
      it("Returns false for start time before current time", async () => {
        badEncodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
          ["uint256", "uint24"],
          [earliestSwapTime - 720 * 60, fees] // 2 hours beforehand
        );
        const isValid = await migration.isValid(
          meToken.address,
          badEncodedMigrationArgs
        );
        expect(isValid).to.be.false;
      });
      it("Returns false for nonexistent meToken", async () => {
        const isValid = await migration.isValid(
          account0.address,
          encodedMigrationArgs
        );
        expect(isValid).to.be.false;
      });
      it("Returns false for invalid fee", async () => {
        badEncodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
          ["uint256", "uint24"],
          [earliestSwapTime, 2999]
        );
        const isValid = await migration.isValid(
          meToken.address,
          badEncodedMigrationArgs
        );
        expect(isValid).to.be.false;
      });
    });

    describe("initMigration()", () => {
      it("Reverts when sender is not diamond", async () => {
        await expect(
          migration.initMigration(meToken.address, encodedMigrationArgs)
        ).to.be.revertedWith("!diamond");
      });
      it("Fails from bad encodings", async () => {
        await expect(
          meTokenRegistry
            .connect(account1)
            .initResubscribe(
              meToken.address,
              hubId2,
              migration.address,
              badEncodedMigrationArgs
            )
        ).to.be.revertedWith("Invalid encodedMigrationArgs");
      });
      it("should revert when try to approve already approved vaults", async () => {
        await expect(
          migrationRegistry.approve(
            initialVault.address,
            targetVault.address,
            migration.address
          )
        ).to.be.revertedWith("migration already approved");
      });
      it("should be able to unapprove migration vaults", async () => {
        let tx = await migrationRegistry.unapprove(
          initialVault.address,
          targetVault.address,
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
            targetVault.address,
            migration.address
          )
        ).to.be.revertedWith("migration not approved");

        // approve vaults again
        await migrationRegistry.approve(
          initialVault.address,
          targetVault.address,
          migration.address
        );
      });
      it("Set correct _ust values", async () => {
        await meTokenRegistry
          .connect(account1)
          .initResubscribe(
            meToken.address,
            hubId2,
            migration.address,
            encodedMigrationArgs
          );
        const migrationDetails = await migration.getDetails(meToken.address);
        expect(migrationDetails.fee).to.equal(fees);
        expect(migrationDetails.soonest).to.equal(earliestSwapTime);
      });
    });

    describe("poke()", () => {
      it("should be able to call for invalid metoken, but wont run startMigration()", async () => {
        const tx = await migration.poke(account0.address);
        await tx.wait();

        await expect(tx).to.not.emit(initialVault, "StartMigration");
      });
      it("should be able to call before soonest, but wont run startMigration()", async () => {
        migrationDetails = await migration.getDetails(meToken.address);
        block = await ethers.provider.getBlock("latest");
        expect(migrationDetails.soonest).to.be.gt(block.timestamp);

        const tx = await migration.poke(meToken.address);
        await tx.wait();

        await expect(tx).to.not.emit(initialVault, "StartMigration");
        migrationDetails = await migration.getDetails(meToken.address);
        expect(migrationDetails.started).to.be.equal(false);
      });
      it("Triggers startMigration()", async () => {
        await mineBlock(migrationDetails.soonest.toNumber() + 1);
        block = await ethers.provider.getBlock("latest");
        expect(migrationDetails.soonest).to.be.lt(block.timestamp);

        const tx = await migration.poke(meToken.address);
        await tx.wait();

        await expect(tx)
          .to.emit(initialVault, "StartMigration")
          .withArgs(meToken.address)
          // TODO check updated balance here
          .to.emit(meTokenRegistry, "UpdateBalances");
        migrationDetails = await migration.getDetails(meToken.address);
        expect(migrationDetails.started).to.be.equal(true);
        expect(migrationDetails.swapped).to.be.equal(true);
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

        block = await ethers.provider.getBlock("latest");
        expect(meTokenRegistryDetails.endTime).to.be.lt(block.timestamp);

        const tx = await meTokenRegistry.finishResubscribe(meToken.address);
        await tx.wait();

        await expect(tx)
          .to.emit(meTokenRegistry, "FinishResubscribe")
          .to.emit(weth, "Transfer")
          .withArgs(
            migration.address,
            targetVault.address,
            meTokenRegistryDetails.balancePooled.add(
              meTokenRegistryDetails.balanceLocked
            )
          )
          .to.not.emit(initialVault, "StartMigration");

        migrationDetails = await migration.getDetails(meToken.address);
        expect(migrationDetails.fee).to.equal(0);
        expect(migrationDetails.soonest).to.equal(0);
        expect(migrationDetails.started).to.equal(false);
        expect(migrationDetails.swapped).to.equal(false);
      });
      it("should revert before soonest", async () => {
        await migrationRegistry.approve(
          targetVault.address,
          initialVault.address,
          migration.address
        );

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
        migrationDetails = await migration.getDetails(meToken.address);
        expect(migrationDetails.fee).to.equal(fees);
        expect(migrationDetails.soonest).to.equal(earliestSwapTime);

        const meTokenRegistryDetails = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        await mineBlock(meTokenRegistryDetails.endTime.toNumber() + 2);
        block = await ethers.provider.getBlock("latest");
        expect(meTokenRegistryDetails.endTime).to.be.lt(block.timestamp);

        await expect(
          meTokenRegistry.finishResubscribe(meToken.address)
        ).to.be.revertedWith("timestamp < soonest");
      });
      it("Triggers startsMigration() if it hasn't already started", async () => {
        let meTokenRegistryDetails = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        migrationDetails = await migration.getDetails(meToken.address);

        await mineBlock(migrationDetails.soonest.toNumber() + 2);
        block = await ethers.provider.getBlock("latest");
        expect(migrationDetails.soonest).to.be.lt(block.timestamp);

        const tx = await meTokenRegistry.finishResubscribe(meToken.address);
        await tx.wait();

        meTokenRegistryDetails = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        await expect(tx)
          .to.emit(meTokenRegistry, "FinishResubscribe")
          .to.emit(targetVault, "StartMigration")
          .withArgs(meToken.address)
          // TODO check updated balance here
          .to.emit(dai, "Transfer")
          .withArgs(
            migration.address,
            initialVault.address,
            meTokenRegistryDetails.balancePooled.add(
              meTokenRegistryDetails.balanceLocked
            )
          )
          .to.emit(meTokenRegistry, "UpdateBalances");
        migrationDetails = await migration.getDetails(meToken.address);
        expect(migrationDetails.fee).to.equal(0);
        expect(migrationDetails.soonest).to.equal(0);
        expect(migrationDetails.started).to.equal(false);
        expect(migrationDetails.swapped).to.equal(false);
      });

      describe("During resubscribe", () => {
        before(async () => {
          await meTokenRegistry.setMeTokenWarmup(warmup);
          await meTokenRegistry.setMeTokenDuration(duration);
          await meTokenRegistry.setMeTokenCooldown(coolDown);

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
          expect(migrationDetails.fee).to.equal(fees);
          expect(migrationDetails.soonest).to.equal(earliestSwapTime);
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
        it("From soonest => endTime: assets transferred to/from migration vault", async () => {
          const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
            meToken.address
          );

          await mineBlock(meTokenInfo.startTime.toNumber() + 2);
          block = await ethers.provider.getBlock("latest");
          expect(meTokenInfo.startTime).to.be.lt(block.timestamp);

          const initialVaultDAIBefore = await dai.balanceOf(
            initialVault.address
          );
          const initialVaultWETHBefore = await weth.balanceOf(
            initialVault.address
          );
          const migrationDAIBefore = await dai.balanceOf(migration.address);
          const migrationWETHBefore = await weth.balanceOf(migration.address);

          const tx = await foundry
            .connect(account2)
            .mint(meToken.address, amount, account2.address);
          await tx.wait();

          await expect(tx).to.be.emit(dai, "Transfer");

          const initialVaultDAIAfter = await dai.balanceOf(
            initialVault.address
          );
          const initialVaultWETHAfter = await weth.balanceOf(
            initialVault.address
          );
          const migrationDAIAfter = await dai.balanceOf(migration.address);
          const migrationWETHAfter = await weth.balanceOf(migration.address);

          expect(initialVaultWETHBefore.sub(initialVaultWETHAfter)).to.be.equal(
            0
          ); // initial vault weth balance has no change
          expect(initialVaultDAIBefore.sub(initialVaultDAIAfter)).to.equal(
            amount
          ); // amount deposited before start time
          expect(migrationDAIAfter.sub(migrationDAIBefore)).to.be.equal(0); // no change
          // TODO fix with swap balance
          expect(migrationWETHAfter.sub(migrationWETHBefore)).to.be.gt(amount); // gt due to swap amount
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
          const initialVaultWETHBefore = await weth.balanceOf(
            initialVault.address
          );
          const migrationDAIBefore = await dai.balanceOf(migration.address);
          const migrationWETHBefore = await weth.balanceOf(migration.address);
          const targetVaultDAIBefore = await dai.balanceOf(targetVault.address);
          const targetVaultWETHBefore = await weth.balanceOf(
            targetVault.address
          );

          const tx = await foundry
            .connect(account2)
            .mint(meToken.address, amount, account2.address);
          await tx.wait();

          await expect(tx).to.be.emit(weth, "Transfer");

          const initialVaultDAIAfter = await dai.balanceOf(
            initialVault.address
          );
          const initialVaultWETHAfter = await weth.balanceOf(
            initialVault.address
          );
          const migrationDAIAfter = await dai.balanceOf(migration.address);
          const migrationWETHAfter = await weth.balanceOf(migration.address);
          const targetVaultDAIAfter = await dai.balanceOf(targetVault.address);
          const targetVaultWETHAfter = await weth.balanceOf(
            targetVault.address
          );

          expect(initialVaultWETHBefore.sub(initialVaultWETHAfter)).to.be.equal(
            0
          ); // initial vault weth balance has no change
          expect(initialVaultDAIBefore.sub(initialVaultDAIAfter)).to.equal(0); // initial vault dai balance has no change
          expect(migrationDAIAfter.sub(migrationDAIBefore)).to.be.equal(0); // no change
          expect(migrationWETHAfter).to.be.equal(0); // migration balance goes to target vault
          expect(targetVaultDAIAfter.sub(targetVaultDAIBefore)).to.be.equal(0); // no change
          expect(targetVaultWETHAfter.sub(targetVaultWETHBefore)).to.be.equal(
            amount.add(migrationWETHBefore)
          ); // newly minted amount + migration weth balance
        });
      });
    });
  });
};

setup().then(() => {
  run();
});
