import { expect } from "chai";
import { ethers, getNamedAccounts, network } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Signer, BigNumber } from "ethers";
import { deploy, getContractAt, toETHNumber } from "../../utils/helpers";
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
} from "../../../artifacts/types";
import { getQuote } from "../../utils/uniswap";

const resubscribe = async (
  meToken: MeToken,
  owner: SignerWithAddress,
  toHub: number | string | BigNumber,
  meTokenRegistry: MeTokenRegistryFacet,
  migrationRegistry: MigrationRegistry,
  fromVault: SingleAssetVault,
  toVault: SingleAssetVault,
  migration: any,
  fee: any,
  needVaultApproval?: boolean
): Promise<any> => {
  const encodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
    ["uint24"],
    [fee]
  );

  if (needVaultApproval !== false) {
    await migrationRegistry.approve(
      fromVault.address,
      toVault.address,
      migration.address
    );
  }

  await meTokenRegistry
    .connect(owner)
    .initResubscribe(
      meToken.address,
      toHub,
      migration.address,
      encodedMigrationArgs
    );

  await mineBlock(
    (await meTokenRegistry.getMeTokenInfo(meToken.address)).endTime.toNumber() +
      1
  );
  const block = await ethers.provider.getBlock("latest");
  expect(
    (await meTokenRegistry.getMeTokenInfo(meToken.address)).startTime
  ).to.be.lt(block.timestamp);

  await meTokenRegistry.finishResubscribe(meToken.address);
};

const increaseResubscribeTimeToStartTime = async (
  meTokenRegistry: MeTokenRegistryFacet,
  meToken: MeToken
) => {
  await mineBlock(
    (
      await meTokenRegistry.getMeTokenInfo(meToken.address)
    ).startTime.toNumber() + 1
  );
  const block = await ethers.provider.getBlock("latest");
  expect(
    (await meTokenRegistry.getMeTokenInfo(meToken.address)).startTime
  ).to.be.lt(block.timestamp);
};

const setup = async () => {
  describe("UniswapSingleTransferMigration.sol", () => {
    let DAI: string;
    let WETH: string;
    let USDC: string;
    let WBTC: string;
    let WETHWhale: string;
    let USDCWhale: string;
    let DAIWhale: string;
    let WBTCWhale: string;
    let daiHolder: Signer;
    let wethHolder: Signer;
    let UNIV3Factory: string;
    let dai: ERC20;
    let weth: ERC20;
    let account0: SignerWithAddress;
    let account1: SignerWithAddress;
    let account2: SignerWithAddress;
    let account3: SignerWithAddress;
    let migrationRegistry: MigrationRegistry;
    let migration: UniswapSingleTransferMigration;
    let meTokenRegistry: MeTokenRegistryFacet;
    let daiVault: SingleAssetVault;
    let wethVault: SingleAssetVault;
    let usdcVault: SingleAssetVault;
    let wbtcVault: SingleAssetVault;
    let foundry: FoundryFacet;
    let meToken: MeToken;
    let hub: HubFacet;
    let vaultRegistry: VaultRegistry;

    const hubId1 = 1; // DAI Hub
    const hubId2 = 2; // WETH Hub
    const hubId3 = 3; // USDC Hub
    const hubId4 = 4; // WBTC Hub
    const name = "Carl meToken";
    const symbol = "CARL";
    const amount = ethers.utils.parseEther("100");
    const fees = 3000;
    const refundRatio = 500000;
    const MAX_WEIGHT = 1000000;
    const reserveWeight = MAX_WEIGHT / 2;
    const PRECISION = BigNumber.from(10).pow(6);
    const baseY = PRECISION.div(1000);

    let encodedMigrationArgs: string;
    let badEncodedMigrationArgs: string;
    let encodedVaultDAIArgs: string;
    let encodedVaultWETHArgs: string;
    let block;
    let migrationDetails: [number, boolean] & {
      fee: number;
      started: boolean;
    };

    let snapshotId: any;
    let max = ethers.constants.MaxUint256;

    before(async () => {
      snapshotId = await network.provider.send("evm_snapshot");
      ({
        DAI,
        DAIWhale,
        WETH,
        WETHWhale,
        UNIV3Factory,
        USDC,
        USDCWhale,
        WBTC,
        WBTCWhale,
      } = await getNamedAccounts());

      encodedVaultDAIArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [DAI]
      );
      encodedVaultWETHArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [WETH]
      );

      encodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
        ["uint24"],
        [fees]
      );

      ({
        hub,
        foundry,
        migrationRegistry,
        singleAssetVault: daiVault,
        vaultRegistry,
        meTokenRegistry,
        account0,
        account1,
        account2,
        account3,
      } = await hubSetup(
        baseY,
        reserveWeight,
        encodedVaultDAIArgs,
        refundRatio
      ));

      wethVault = await deploy<SingleAssetVault>(
        "SingleAssetVault",
        undefined, //no libs
        account0.address, // DAO
        hub.address // diamond
      );
      await vaultRegistry.approve(wethVault.address);

      usdcVault = await deploy<SingleAssetVault>(
        "SingleAssetVault",
        undefined, //no libs
        account0.address, // DAO
        hub.address // diamond
      );
      await vaultRegistry.approve(usdcVault.address);

      wbtcVault = await deploy<SingleAssetVault>(
        "SingleAssetVault",
        undefined, //no libs
        account0.address, // DAO
        hub.address // diamond
      );
      await vaultRegistry.approve(wbtcVault.address);

      // Register 2nd hub to which we'll migrate to
      await hub.register(
        account0.address,
        WETH,
        wethVault.address,
        refundRatio,
        baseY,
        reserveWeight,
        encodedVaultWETHArgs
      );
      // Register 3rd hub to which we'll migrate to
      await hub.register(
        account0.address,
        USDC,
        usdcVault.address,
        refundRatio,
        baseY,
        reserveWeight,
        encodedVaultWETHArgs
      );
      // Register 4th hub to which we'll migrate to
      await hub.register(
        account0.address,
        WBTC,
        wbtcVault.address,
        refundRatio,
        baseY,
        reserveWeight,
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
        daiVault.address,
        wethVault.address,
        migration.address
      );
      // Pre fund owner & buyer w/ DAI & WETH
      dai = await getContractAt<ERC20>("ERC20", DAI);
      weth = await getContractAt<ERC20>("ERC20", WETH);
      daiHolder = await impersonate(DAIWhale);
      wethHolder = await impersonate(WETHWhale);
      dai
        .connect(daiHolder)
        .transfer(account0.address, ethers.utils.parseEther("50000000"));
      dai
        .connect(daiHolder)
        .transfer(account2.address, ethers.utils.parseEther("1000"));
      weth
        .connect(wethHolder)
        .transfer(account0.address, ethers.utils.parseEther("10"));
      weth
        .connect(wethHolder)
        .transfer(account2.address, ethers.utils.parseEther("1000"));
      await dai.connect(account0).approve(daiVault.address, max);
      await dai.connect(account1).approve(daiVault.address, max);
      await dai.connect(account2).approve(daiVault.address, max);
      await weth.connect(account2).approve(migration.address, max);
      await weth.connect(account2).approve(wethVault.address, max);

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
      it("Returns false for invalid encoding", async () => {
        const isValid = await migration.isValid("0x");
        expect(isValid).to.be.false;
      });
      it("Returns true for valid encoding", async () => {
        const isValid = await migration.isValid(encodedMigrationArgs);
        expect(isValid).to.be.true;
      });
      it("Returns false when pass soonest", async () => {
        badEncodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
          ["uint256", "uint24"],
          [1000, fees] // invalid encoding
        );
        const isValid = await migration.isValid(badEncodedMigrationArgs);
        expect(isValid).to.be.false;
      });
      it("Returns false for invalid fee", async () => {
        badEncodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
          ["uint24"],
          [2999]
        );
        const isValid = await migration.isValid(badEncodedMigrationArgs);
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
      it("Reverts when hub and targetHub asset are same", async () => {
        // Hub 3
        await hub.register(
          account0.address,
          DAI,
          daiVault.address,
          refundRatio,
          baseY,
          reserveWeight,
          encodedVaultDAIArgs
        );

        await migrationRegistry.approve(
          daiVault.address,
          daiVault.address,
          migration.address
        );

        await expect(
          meTokenRegistry
            .connect(account1)
            .initResubscribe(
              meToken.address,
              5,
              migration.address,
              encodedMigrationArgs
            )
        ).to.be.revertedWith("same asset");
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
      });
    });

    describe("poke()", () => {
      it("should be able to call for invalid metoken, but wont run startMigration()", async () => {
        const tx = await migration.poke(account0.address);
        await tx.wait();

        await expect(tx).to.not.emit(daiVault, "StartMigration");
      });
      it("should be able to call before startTime, but wont run startMigration()", async () => {
        block = await ethers.provider.getBlock("latest");
        expect(
          (await meTokenRegistry.getMeTokenInfo(meToken.address)).startTime
        ).to.be.gt(block.timestamp);

        const tx = await migration.poke(meToken.address);
        await tx.wait();

        await expect(tx).to.not.emit(daiVault, "StartMigration");
        migrationDetails = await migration.getDetails(meToken.address);
        expect(migrationDetails.started).to.be.equal(false);
      });
      it("Triggers startMigration()", async () => {
        const meTokenRegistryDetails = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        await mineBlock(meTokenRegistryDetails.startTime.toNumber() + 1);
        block = await ethers.provider.getBlock("latest");
        expect(meTokenRegistryDetails.startTime).to.be.lt(block.timestamp);
        const totalBalance = meTokenRegistryDetails.balanceLocked.add(
          meTokenRegistryDetails.balancePooled
        );
        const price = await getQuote(
          UNIV3Factory,
          dai,
          weth,
          migrationDetails.fee,
          totalBalance
        );
        const tx = await migration.poke(meToken.address);
        const receipt = await tx.wait();
        // extract the balance argument of UpdateBalances events
        const newBalance = BigNumber.from(
          meTokenRegistry.interface.parseLog(
            receipt.logs.find((l) => l.address == meTokenRegistry.address) ?? {
              topics: [""],
              data: "",
            }
          ).args[1]
        );

        await expect(tx)
          .to.emit(daiVault, "StartMigration")
          .withArgs(meToken.address);
        await expect(tx)
          .to.emit(meTokenRegistry, "UpdateBalances")
          .withArgs(meToken.address, newBalance);
        // assert that newBalance make sense compared to the current market price
        expect(toETHNumber(newBalance)).to.be.approximately(
          Number(price.token0Price),
          0.01
        );
        migrationDetails = await migration.getDetails(meToken.address);
        expect(migrationDetails.started).to.be.equal(true);
      });
      it("should be able to call when migration already started, but wont run startMigration()", async () => {
        const tx = await migration.poke(meToken.address);
        await tx.wait();

        await expect(tx).to.not.emit(daiVault, "StartMigration");
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
          .to.emit(weth, "Transfer")
          .withArgs(
            migration.address,
            wethVault.address,
            meTokenRegistryDetails.balancePooled.add(
              meTokenRegistryDetails.balanceLocked
            )
          );
        await expect(tx).to.not.emit(daiVault, "StartMigration");

        migrationDetails = await migration.getDetails(meToken.address);
        expect(migrationDetails.fee).to.equal(0);
        expect(migrationDetails.started).to.equal(false);
      });
      it("should revert before endTime", async () => {
        let meTokenRegistryDetails = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );

        await migrationRegistry.approve(
          wethVault.address,
          daiVault.address,
          migration.address
        );

        encodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
          ["uint24"],
          [fees]
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

        meTokenRegistryDetails = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        await mineBlock(meTokenRegistryDetails.endTime.toNumber() - 2);
        block = await ethers.provider.getBlock("latest");
        expect(meTokenRegistryDetails.endTime).to.be.gt(block.timestamp);

        await expect(
          meTokenRegistry.finishResubscribe(meToken.address)
        ).to.be.revertedWith("block.timestamp < endTime");
      });
      it("Triggers startsMigration() if it hasn't already started", async () => {
        const meTokenRegistryDetailsBefore =
          await meTokenRegistry.getMeTokenInfo(meToken.address);

        await mineBlock(meTokenRegistryDetailsBefore.endTime.toNumber() + 2);
        block = await ethers.provider.getBlock("latest");
        expect(meTokenRegistryDetailsBefore.endTime).to.be.lt(block.timestamp);
        const totalBalance = meTokenRegistryDetailsBefore.balanceLocked.add(
          meTokenRegistryDetailsBefore.balancePooled
        );
        const price = await getQuote(
          UNIV3Factory,
          dai,
          weth,
          migrationDetails.fee,
          totalBalance
        );
        const tx = await meTokenRegistry.finishResubscribe(meToken.address);
        const receipt = await tx.wait();

        const meTokenRegistryDetailsAfter =
          await meTokenRegistry.getMeTokenInfo(meToken.address);

        await expect(tx).to.emit(meTokenRegistry, "FinishResubscribe");
        await expect(tx)
          .to.emit(wethVault, "StartMigration")
          .withArgs(meToken.address);
        await expect(tx)
          .to.emit(dai, "Transfer")
          .withArgs(
            migration.address,
            daiVault.address,
            meTokenRegistryDetailsAfter.balancePooled.add(
              meTokenRegistryDetailsAfter.balanceLocked
            )
          );
        // extract the balance argument of UpdateBalances events
        const newBalance = BigNumber.from(
          meTokenRegistry.interface.parseLog(
            receipt.logs.find((l) => l.address == meTokenRegistry.address) ?? {
              topics: [""],
              data: "",
            }
          ).args[1]
        );
        await expect(tx)
          .to.emit(meTokenRegistry, "UpdateBalances")
          .withArgs(meToken.address, newBalance);
        // assert that newBalance make sense compared to the current market price
        expect(toETHNumber(newBalance)).to.be.approximately(
          Number(price.token1Price),
          0.31
        );
        const precision = ethers.utils.parseEther("1");
        const calculatedNewBalancePooled =
          meTokenRegistryDetailsBefore.balancePooled
            .mul(precision)
            .mul(newBalance)
            .div(totalBalance.mul(precision));
        expect(meTokenRegistryDetailsAfter.balancePooled).to.equal(
          calculatedNewBalancePooled
        );
        const calculatedNewBalanceLocked =
          meTokenRegistryDetailsBefore.balanceLocked
            .mul(precision)
            .mul(newBalance)
            .div(totalBalance.mul(precision));
        expect(meTokenRegistryDetailsAfter.balanceLocked).to.equal(
          calculatedNewBalanceLocked
        );
        migrationDetails = await migration.getDetails(meToken.address);
        expect(migrationDetails.fee).to.equal(0);
        expect(migrationDetails.started).to.equal(false);
      });
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

        block = await ethers.provider.getBlock("latest");

        encodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
          ["uint24"],
          [fees]
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
      });

      it("From warmup => startTime: assets transferred to/from initial vault", async () => {
        const initialVaultBalanceBefore = await dai.balanceOf(daiVault.address);

        const tx = await foundry
          .connect(account2)
          .mint(meToken.address, amount, account2.address);
        await tx.wait();

        await expect(tx).to.be.emit(dai, "Transfer");

        const initialVaultBalanceAfter = await dai.balanceOf(daiVault.address);

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

        const initialVaultDAIBefore = await dai.balanceOf(daiVault.address);
        const initialVaultWETHBefore = await weth.balanceOf(daiVault.address);
        const migrationDAIBefore = await dai.balanceOf(migration.address);
        const migrationWETHBefore = await weth.balanceOf(migration.address);
        expect(migrationWETHBefore).to.be.equal(0);
        const DAIBalanceBefore = await dai.balanceOf(account2.address);
        const price = await getQuote(
          UNIV3Factory,
          dai,
          weth,
          migrationDetails.fee,
          amount.add(meTokenInfo.balanceLocked).add(meTokenInfo.balancePooled)
        );
        const tx = await foundry
          .connect(account2)
          .mint(meToken.address, amount, account2.address);
        await tx.wait();

        await expect(tx).to.be.emit(dai, "Transfer");
        const DAIBalanceAfter = await dai.balanceOf(account2.address);
        expect(DAIBalanceBefore.sub(DAIBalanceAfter)).to.equal(amount);
        const initialVaultDAIAfter = await dai.balanceOf(daiVault.address);
        const initialVaultWETHAfter = await weth.balanceOf(daiVault.address);
        const migrationDAIAfter = await dai.balanceOf(migration.address);
        const migrationWETHAfter = await weth.balanceOf(migration.address);
        // initial vault weth balance has no change
        expect(initialVaultWETHBefore.sub(initialVaultWETHAfter)).to.be.equal(
          0
        );
        // amount deposited before start time
        expect(initialVaultDAIBefore.sub(initialVaultDAIAfter)).to.equal(
          amount
        );
        expect(migrationDAIAfter.sub(migrationDAIBefore)).to.be.equal(0); // no change
        // dai to eth swap amount
        expect(toETHNumber(migrationWETHAfter)).to.be.approximately(
          Number(price.token0Price),
          0.01
        );
      });
      it("After endTime: assets transferred to/from target vault", async () => {
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );

        await mineBlock(meTokenInfo.endTime.toNumber() + 2);
        block = await ethers.provider.getBlock("latest");
        expect(meTokenInfo.endTime).to.be.lt(block.timestamp);

        const initialVaultDAIBefore = await dai.balanceOf(daiVault.address);
        const initialVaultWETHBefore = await weth.balanceOf(daiVault.address);
        const migrationDAIBefore = await dai.balanceOf(migration.address);
        const migrationWETHBefore = await weth.balanceOf(migration.address);
        const targetVaultDAIBefore = await dai.balanceOf(wethVault.address);
        const targetVaultWETHBefore = await weth.balanceOf(wethVault.address);

        const tx = await foundry
          .connect(account2)
          .mint(meToken.address, amount, account2.address);
        await tx.wait();

        await expect(tx).to.be.emit(weth, "Transfer");

        const initialVaultDAIAfter = await dai.balanceOf(daiVault.address);
        const initialVaultWETHAfter = await weth.balanceOf(daiVault.address);
        const migrationDAIAfter = await dai.balanceOf(migration.address);
        const migrationWETHAfter = await weth.balanceOf(migration.address);
        const targetVaultDAIAfter = await dai.balanceOf(wethVault.address);
        const targetVaultWETHAfter = await weth.balanceOf(wethVault.address);

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

    describe("Migrate with zero supply (0 balance)", () => {
      before(async () => {
        await meTokenRegistry
          .connect(account3)
          .subscribe(name, symbol, hubId1, 0);
        const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
          account3.address
        );
        meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);

        block = await ethers.provider.getBlock("latest");

        encodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
          ["uint24"],
          [fees]
        );

        await meTokenRegistry
          .connect(account3)
          .initResubscribe(
            meToken.address,
            hubId2,
            migration.address,
            encodedMigrationArgs
          );
        migrationDetails = await migration.getDetails(meToken.address);
        expect(migrationDetails.fee).to.equal(fees);
      });

      it("Call to poke does not swap as amountIn is 0", async () => {
        await mineBlock(
          (
            await meTokenRegistry.getMeTokenInfo(meToken.address)
          ).startTime.toNumber() + 1
        );
        block = await ethers.provider.getBlock("latest");
        expect(
          (await meTokenRegistry.getMeTokenInfo(meToken.address)).startTime
        ).to.be.lt(block.timestamp);

        const tx = await migration.poke(meToken.address);
        await tx.wait();

        await expect(tx)
          .to.emit(daiVault, "StartMigration")
          .withArgs(meToken.address);
        await expect(tx).to.not.emit(meTokenRegistry, "UpdateBalances");
        migrationDetails = await migration.getDetails(meToken.address);
        expect(migrationDetails.started).to.be.equal(true);
      });
    });

    describe("Slippage Tests", () => {
      before(async () => {
        await meTokenRegistry
          .connect(account0)
          .subscribe(name, symbol, hubId1, 0);
        const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
          account0.address
        );
        meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);
      });

      describe("DAI -> WETH resubscribe fails when slippage > 5%", () => {
        before(async () => {
          // Mint new collateral
          await foundry
            .connect(account0)
            .mint(
              meToken.address,
              ethers.utils.parseEther(String(50 * 1e6)),
              account0.address
            );

          encodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
            ["uint24"],
            [fees]
          );

          await meTokenRegistry
            .connect(account0)
            .initResubscribe(
              meToken.address,
              hubId2,
              migration.address,
              encodedMigrationArgs
            );
        });
        it("Call to poke reverts", async () => {
          // NOTE: at current market, 50M DAI would incur 6% slippage
          await increaseResubscribeTimeToStartTime(meTokenRegistry, meToken);
          await expect(migration.poke(meToken.address)).to.be.revertedWith(
            "Too little received"
          );
        });
        after(async () => {
          await meTokenRegistry
            .connect(account0)
            .cancelResubscribe(meToken.address);
          // Burn all collateral
          await foundry.burn(
            meToken.address,
            await meToken.balanceOf(account0.address),
            account0.address
          );
        });
      });

      describe("DAI -> WETH resubscribe passes when slippage < 5%", () => {
        before(async () => {
          await dai.connect(account0).approve(daiVault.address, max);
          // Mint new collateral
          await foundry
            .connect(account0)
            .mint(
              meToken.address,
              ethers.utils.parseEther(String(1e6)),
              account0.address
            );

          encodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
            ["uint24"],
            [fees]
          );

          await meTokenRegistry
            .connect(account0)
            .initResubscribe(
              meToken.address,
              hubId2,
              migration.address,
              encodedMigrationArgs
            );
        });
        it("Call to poke should NOT revert", async () => {
          await increaseResubscribeTimeToStartTime(meTokenRegistry, meToken);
          const metokenInfo = await meTokenRegistry.getMeTokenInfo(
            meToken.address
          );
          const expectedAmountOutMinimum =
            await migration.expectedAmountOutMinimum(
              (
                await hub.getHubInfo(metokenInfo.hubId)
              ).asset,
              (
                await hub.getHubInfo(metokenInfo.targetHubId)
              ).asset,
              (
                await meTokenRegistry.getMeTokenInfo(meToken.address)
              ).balancePooled
            );
          await migration.poke(meToken.address);
          const receivedAmountOut = (
            await meTokenRegistry.getMeTokenInfo(meToken.address)
          ).balancePooled;

          // expectedAmountOutMinimum is expectedAmountOutNoSlippage * 19/20 (aka 95%)
          // so therefore expectedAmountOutMinimum * 20/19 is the baseline to compare slippage to
          const expectedAmountOutNoSlippage = expectedAmountOutMinimum
            .mul(20)
            .div(19);
          const pctOfOrderFilled = receivedAmountOut
            .mul(100)
            .div(expectedAmountOutNoSlippage);
          expect(pctOfOrderFilled).gte(95);
        });
        after(async () => {
          await mineBlock(
            (
              await meTokenRegistry.getMeTokenInfo(meToken.address)
            ).endTime.toNumber() + 1
          );
          // Burn all collateral
          await foundry.burn(
            meToken.address,
            await meToken.balanceOf(account0.address),
            account0.address
          );
        });
      });

      describe("DAI -> USDC resubscribe passes when slippage < 5%", () => {
        before(async () => {
          await resubscribe(
            meToken,
            account0,
            hubId1,
            meTokenRegistry,
            migrationRegistry,
            wethVault,
            daiVault,
            migration,
            fees,
            false
          );

          await dai.connect(account0).approve(daiVault.address, max);
          // Mint new collateral
          await foundry
            .connect(account0)
            .mint(
              meToken.address,
              ethers.utils.parseEther("1000000"),
              account0.address
            );

          encodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
            ["uint24"],
            [500]
          );

          await migrationRegistry.approve(
            daiVault.address,
            usdcVault.address,
            migration.address
          );

          await meTokenRegistry
            .connect(account0)
            .initResubscribe(
              meToken.address,
              hubId3,
              migration.address,
              encodedMigrationArgs
            );

          const metokenInfo = await meTokenRegistry.getMeTokenInfo(
            meToken.address
          );

          expect((await hub.getHubInfo(metokenInfo.hubId)).asset).to.equal(
            dai.address
          );
          expect(
            (await hub.getHubInfo(metokenInfo.targetHubId)).asset
          ).to.equal(USDC);
        });
        it("Call to poke should NOT revert", async () => {
          await increaseResubscribeTimeToStartTime(meTokenRegistry, meToken);
          const metokenInfo = await meTokenRegistry.getMeTokenInfo(
            meToken.address
          );
          const expectedAmountOutMinimum =
            await migration.expectedAmountOutMinimum(
              (
                await hub.getHubInfo(metokenInfo.hubId)
              ).asset,
              (
                await hub.getHubInfo(metokenInfo.targetHubId)
              ).asset,
              (
                await meTokenRegistry.getMeTokenInfo(meToken.address)
              ).balancePooled
            );
          await migration.poke(meToken.address);
          const receivedAmountOut = (
            await meTokenRegistry.getMeTokenInfo(meToken.address)
          ).balancePooled;

          // expectedAmountOutMinimum is expectedAmountOutNoSlippage * 19/20 (aka 95%)
          // so therefore expectedAmountOutMinimum * 20/19 is the baseline to compare slippage to
          const expectedAmountOutNoSlippage = expectedAmountOutMinimum
            .mul(20)
            .div(19);
          const pctOfOrderFilled = receivedAmountOut
            .mul(100)
            .div(expectedAmountOutNoSlippage);
          expect(pctOfOrderFilled).gte(95);
        });
        after(async () => {
          await mineBlock(
            (
              await meTokenRegistry.getMeTokenInfo(meToken.address)
            ).endTime.toNumber() + 1
          );

          // Burn all collateral
          await foundry.burn(
            meToken.address,
            await meToken.balanceOf(account0.address),
            account0.address
          );
        });
      });
      describe("USDC -> DAI resubscribe passes when slippage < 5%", () => {
        before(async () => {
          const usdc = await getContractAt<ERC20>("ERC20", USDC);
          const usdcHolder = await impersonate(USDCWhale);

          await usdc
            .connect(usdcHolder)
            .transfer(
              account0.address,
              ethers.utils.parseUnits(String(1e6), 6)
            );

          await usdc.connect(account0).approve(usdcVault.address, max);
          // Mint new collateral
          await foundry
            .connect(account0)
            .mint(
              meToken.address,
              ethers.utils.parseUnits(String(1e6), 6),
              account0.address
            );

          encodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
            ["uint24"],
            [500]
          );

          await migrationRegistry.approve(
            usdcVault.address,
            daiVault.address,
            migration.address
          );

          await meTokenRegistry
            .connect(account0)
            .initResubscribe(
              meToken.address,
              hubId1,
              migration.address,
              encodedMigrationArgs
            );

          const metokenInfo = await meTokenRegistry.getMeTokenInfo(
            meToken.address
          );

          expect((await hub.getHubInfo(metokenInfo.hubId)).asset).to.equal(
            USDC
          );
          expect(
            (await hub.getHubInfo(metokenInfo.targetHubId)).asset
          ).to.equal(DAI);
        });
        it("Call to poke should NOT revert", async () => {
          await increaseResubscribeTimeToStartTime(meTokenRegistry, meToken);
          const metokenInfo = await meTokenRegistry.getMeTokenInfo(
            meToken.address
          );
          const expectedAmountOutMinimum =
            await migration.expectedAmountOutMinimum(
              (
                await hub.getHubInfo(metokenInfo.hubId)
              ).asset,
              (
                await hub.getHubInfo(metokenInfo.targetHubId)
              ).asset,
              (
                await meTokenRegistry.getMeTokenInfo(meToken.address)
              ).balancePooled
            );
          await migration.poke(meToken.address);
          const receivedAmountOut = (
            await meTokenRegistry.getMeTokenInfo(meToken.address)
          ).balancePooled;

          // expectedAmountOutMinimum is expectedAmountOutNoSlippage * 19/20 (aka 95%)
          // so therefore expectedAmountOutMinimum * 20/19 is the baseline to compare slippage to
          const expectedAmountOutNoSlippage = expectedAmountOutMinimum
            .mul(20)
            .div(19);
          const pctOfOrderFilled = receivedAmountOut
            .mul(100)
            .div(expectedAmountOutNoSlippage);
          expect(pctOfOrderFilled).gte(95);
        });
        after(async () => {
          await mineBlock(
            (
              await meTokenRegistry.getMeTokenInfo(meToken.address)
            ).endTime.toNumber() + 1
          );

          // Burn all collateral
          await foundry.burn(
            meToken.address,
            await meToken.balanceOf(account0.address),
            account0.address
          );
        });
      });
      describe("WBTC -> WETH resubscribe passes when slippage < 5%", () => {
        before(async () => {
          await resubscribe(
            meToken,
            account0,
            hubId4,
            meTokenRegistry,
            migrationRegistry,
            daiVault,
            wbtcVault,
            migration,
            fees
          );

          const wbtc = await getContractAt<ERC20>("ERC20", WBTC);
          const wbtcHolder = await impersonate(WBTCWhale);
          await wbtc
            .connect(wbtcHolder)
            .transfer(
              account0.address,
              ethers.utils.parseUnits(String(1000), 8)
            );
          await wbtc.connect(account0).approve(wbtcVault.address, max);

          // Mint new collateral
          await foundry
            .connect(account0)
            .mint(
              meToken.address,
              ethers.utils.parseUnits(String(1000), 8),
              account0.address
            );

          encodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
            ["uint24"],
            [fees]
          );

          await migrationRegistry.approve(
            wbtcVault.address,
            wethVault.address,
            migration.address
          );

          await meTokenRegistry
            .connect(account0)
            .initResubscribe(
              meToken.address,
              hubId2,
              migration.address,
              encodedMigrationArgs
            );

          const metokenInfo = await meTokenRegistry.getMeTokenInfo(
            meToken.address
          );

          expect((await hub.getHubInfo(metokenInfo.hubId)).asset).to.equal(
            WBTC
          );
          expect(
            (await hub.getHubInfo(metokenInfo.targetHubId)).asset
          ).to.equal(WETH);
        });
        it("Call to poke should NOT revert", async () => {
          const metokenInfo = await meTokenRegistry.getMeTokenInfo(
            meToken.address
          );
          const expectedAmountOutMinimum =
            await migration.expectedAmountOutMinimum(
              (
                await hub.getHubInfo(metokenInfo.hubId)
              ).asset,
              (
                await hub.getHubInfo(metokenInfo.targetHubId)
              ).asset,
              (
                await meTokenRegistry.getMeTokenInfo(meToken.address)
              ).balancePooled
            );
          await increaseResubscribeTimeToStartTime(meTokenRegistry, meToken);
          await migration.poke(meToken.address);
          const receivedAmountOut = (
            await meTokenRegistry.getMeTokenInfo(meToken.address)
          ).balancePooled;

          // expectedAmountOutMinimum is expectedAmountOutNoSlippage * 19/20 (aka 95%)
          // so therefore expectedAmountOutMinimum * 20/19 is the baseline to compare slippage to
          const expectedAmountOutNoSlippage = expectedAmountOutMinimum
            .mul(20)
            .div(19);
          const pctOfOrderFilled = receivedAmountOut
            .mul(100)
            .div(expectedAmountOutNoSlippage);
          expect(pctOfOrderFilled).gte(95);
        });
        after(async () => {
          await mineBlock(
            (
              await meTokenRegistry.getMeTokenInfo(meToken.address)
            ).endTime.toNumber() + 1
          );

          // Burn all collateral
          await foundry.burn(
            meToken.address,
            await meToken.balanceOf(account0.address),
            account0.address
          );
        });
      });
      describe("WETH -> WBTC resubscribe passes when slippage < 5%", () => {
        before(async () => {
          const weth = await getContractAt<ERC20>("ERC20", WETH);
          const wethHolder = await impersonate(WETHWhale);

          await weth
            .connect(wethHolder)
            .transfer(
              account0.address,
              ethers.utils.parseUnits(String(1000), 18)
            );
          await weth.connect(account0).approve(wethVault.address, max);

          // Mint new collateral
          await foundry
            .connect(account0)
            .mint(
              meToken.address,
              ethers.utils.parseUnits(String(1000), 18),
              account0.address
            );

          encodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
            ["uint24"],
            [fees]
          );

          await migrationRegistry.approve(
            wethVault.address,
            wbtcVault.address,
            migration.address
          );

          await meTokenRegistry
            .connect(account0)
            .initResubscribe(
              meToken.address,
              hubId4,
              migration.address,
              encodedMigrationArgs
            );

          const metokenInfo = await meTokenRegistry.getMeTokenInfo(
            meToken.address
          );

          expect((await hub.getHubInfo(metokenInfo.hubId)).asset).to.equal(
            WETH
          );
          expect(
            (await hub.getHubInfo(metokenInfo.targetHubId)).asset
          ).to.equal(WBTC);
        });
        it("Call to poke should NOT revert", async () => {
          await increaseResubscribeTimeToStartTime(meTokenRegistry, meToken);
          const metokenInfo = await meTokenRegistry.getMeTokenInfo(
            meToken.address
          );
          const expectedAmountOutMinimum =
            await migration.expectedAmountOutMinimum(
              (
                await hub.getHubInfo(metokenInfo.hubId)
              ).asset,
              (
                await hub.getHubInfo(metokenInfo.targetHubId)
              ).asset,
              (
                await meTokenRegistry.getMeTokenInfo(meToken.address)
              ).balancePooled
            );
          await migration.poke(meToken.address);
          const receivedAmountOut = (
            await meTokenRegistry.getMeTokenInfo(meToken.address)
          ).balancePooled;

          // expectedAmountOutMinimum is expectedAmountOutNoSlippage * 19/20 (aka 95%)
          // so therefore expectedAmountOutMinimum * 20/19 is the baseline to compare slippage to
          const expectedAmountOutNoSlippage = expectedAmountOutMinimum
            .mul(20)
            .div(19);
          const pctOfOrderFilled = receivedAmountOut
            .mul(100)
            .div(expectedAmountOutNoSlippage);
          expect(pctOfOrderFilled).gte(95);
        });
        after(async () => {
          await mineBlock(
            (
              await meTokenRegistry.getMeTokenInfo(meToken.address)
            ).endTime.toNumber() + 1
          );

          // Burn all collateral
          await foundry.burn(
            meToken.address,
            await meToken.balanceOf(account0.address),
            account0.address
          );
        });
      });
      describe("WBTC -> USDC resubscribe passes when slippage < 5%", () => {
        before(async () => {
          const wbtc = await getContractAt<ERC20>("ERC20", WBTC);
          const wbtcHolder = await impersonate(WBTCWhale);
          await wbtc
            .connect(wbtcHolder)
            .transfer(
              account0.address,
              ethers.utils.parseUnits(String(100), 8)
            );

          await wbtc.connect(account0).approve(wbtcVault.address, max);

          // Mint new collateral
          await foundry
            .connect(account0)
            .mint(
              meToken.address,
              ethers.utils.parseUnits(String(100), 8),
              account0.address
            );

          encodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
            ["uint24"],
            [fees]
          );

          await migrationRegistry.approve(
            wbtcVault.address,
            usdcVault.address,
            migration.address
          );

          await meTokenRegistry
            .connect(account0)
            .initResubscribe(
              meToken.address,
              hubId3,
              migration.address,
              encodedMigrationArgs
            );

          const metokenInfo = await meTokenRegistry.getMeTokenInfo(
            meToken.address
          );

          expect((await hub.getHubInfo(metokenInfo.hubId)).asset).to.equal(
            WBTC
          );
          expect(
            (await hub.getHubInfo(metokenInfo.targetHubId)).asset
          ).to.equal(USDC);
        });
        it("Call to poke should NOT revert", async () => {
          await increaseResubscribeTimeToStartTime(meTokenRegistry, meToken);
          const metokenInfo = await meTokenRegistry.getMeTokenInfo(
            meToken.address
          );
          const expectedAmountOutMinimum =
            await migration.expectedAmountOutMinimum(
              (
                await hub.getHubInfo(metokenInfo.hubId)
              ).asset,
              (
                await hub.getHubInfo(metokenInfo.targetHubId)
              ).asset,
              (
                await meTokenRegistry.getMeTokenInfo(meToken.address)
              ).balancePooled
            );
          await migration.poke(meToken.address);
          const receivedAmountOut = (
            await meTokenRegistry.getMeTokenInfo(meToken.address)
          ).balancePooled;

          // expectedAmountOutMinimum is expectedAmountOutNoSlippage * 19/20 (aka 95%)
          // so therefore expectedAmountOutMinimum * 20/19 is the baseline to compare slippage to
          const expectedAmountOutNoSlippage = expectedAmountOutMinimum
            .mul(20)
            .div(19);
          const pctOfOrderFilled = receivedAmountOut
            .mul(100)
            .div(expectedAmountOutNoSlippage);
          expect(pctOfOrderFilled).gte(95);
        });
        after(async () => {
          await mineBlock(
            (
              await meTokenRegistry.getMeTokenInfo(meToken.address)
            ).endTime.toNumber() + 1
          );

          // Burn all collateral
          await foundry.burn(
            meToken.address,
            await meToken.balanceOf(account0.address),
            account0.address
          );
        });
      });
      describe("USDC -> WBTC resubscribe passes when slippage < 5%", () => {
        before(async () => {
          const usdc = await getContractAt<ERC20>("ERC20", USDC);
          const usdcWhale = await impersonate(USDCWhale);
          await usdc
            .connect(usdcWhale)
            .transfer(
              account0.address,
              ethers.utils.parseUnits(String(1e6), 6)
            );
          await usdc.connect(account0).approve(usdcVault.address, max);

          // Mint new collateral
          await foundry
            .connect(account0)
            .mint(
              meToken.address,
              ethers.utils.parseUnits(String(1e6), 6),
              account0.address
            );

          encodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
            ["uint24"],
            [fees]
          );

          await migrationRegistry.approve(
            usdcVault.address,
            wbtcVault.address,
            migration.address
          );

          await meTokenRegistry
            .connect(account0)
            .initResubscribe(
              meToken.address,
              hubId4,
              migration.address,
              encodedMigrationArgs
            );

          const metokenInfo = await meTokenRegistry.getMeTokenInfo(
            meToken.address
          );

          expect((await hub.getHubInfo(metokenInfo.hubId)).asset).to.equal(
            USDC
          );
          expect(
            (await hub.getHubInfo(metokenInfo.targetHubId)).asset
          ).to.equal(WBTC);
        });
        it("Call to poke should NOT revert", async () => {
          await increaseResubscribeTimeToStartTime(meTokenRegistry, meToken);
          const metokenInfo = await meTokenRegistry.getMeTokenInfo(
            meToken.address
          );
          const expectedAmountOutMinimum =
            await migration.expectedAmountOutMinimum(
              (
                await hub.getHubInfo(metokenInfo.hubId)
              ).asset,
              (
                await hub.getHubInfo(metokenInfo.targetHubId)
              ).asset,
              (
                await meTokenRegistry.getMeTokenInfo(meToken.address)
              ).balancePooled
            );
          await migration.poke(meToken.address);
          const receivedAmountOut = (
            await meTokenRegistry.getMeTokenInfo(meToken.address)
          ).balancePooled;

          // expectedAmountOutMinimum is expectedAmountOutNoSlippage * 19/20 (aka 95%)
          // so therefore expectedAmountOutMinimum * 20/19 is the baseline to compare slippage to
          const expectedAmountOutNoSlippage = expectedAmountOutMinimum
            .mul(20)
            .div(19);
          const pctOfOrderFilled = receivedAmountOut
            .mul(100)
            .div(expectedAmountOutNoSlippage);
          expect(pctOfOrderFilled).gte(95);
        });

        after(async () => {
          await mineBlock(
            (
              await meTokenRegistry.getMeTokenInfo(meToken.address)
            ).endTime.toNumber() + 1
          );
          // Burn all collateral
          await foundry.burn(
            meToken.address,
            await meToken.balanceOf(account0.address),
            account0.address
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
