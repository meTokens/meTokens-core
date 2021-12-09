import { ethers, getNamedAccounts } from "hardhat";
import { MeTokenRegistry } from "../../../artifacts/types/MeTokenRegistry";
import { BancorABDK } from "../../../artifacts/types/BancorABDK";
import { MeToken } from "../../../artifacts/types/MeToken";
import { Hub } from "../../../artifacts/types/Hub";
import { ERC20 } from "../../../artifacts/types/ERC20";
import {
  calculateTokenReturnedFromZero,
  deploy,
  getContractAt,
  toETHNumber,
} from "../../utils/helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { hubSetup } from "../../utils/hubSetup";
import { BigNumber, ContractTransaction, Signer } from "ethers";
import { expect } from "chai";
import { WeightedAverage } from "../../../artifacts/types/WeightedAverage";
import { MeTokenFactory } from "../../../artifacts/types/MeTokenFactory";
import { CurveRegistry } from "../../../artifacts/types/CurveRegistry";
import { VaultRegistry } from "../../../artifacts/types/VaultRegistry";
import { MigrationRegistry } from "../../../artifacts/types/MigrationRegistry";
import { SingleAssetVault } from "../../../artifacts/types/SingleAssetVault";
import { Foundry } from "../../../artifacts/types/Foundry";
import { Fees } from "../../../artifacts/types/Fees";
import { mineBlock } from "../../utils/hardhatNode";

describe("MeTokenRegistry.sol", () => {
  let meTokenAddr0: string;
  let meTokenAddr1: string;
  let tx: ContractTransaction;
  let meTokenRegistry: MeTokenRegistry;
  let refundRatio = 50000;

  let tokenAddr: string;
  let weightedAverage: WeightedAverage;
  let meTokenFactory: MeTokenFactory;
  let curveRegistry: CurveRegistry;
  let vaultRegistry: VaultRegistry;
  let migrationRegistry: MigrationRegistry;
  let singleAssetVault: SingleAssetVault;
  let foundry: Foundry;
  let hub: Hub;
  let token: ERC20;
  let fee: Fees;
  let account0: SignerWithAddress;
  let account1: SignerWithAddress;
  let account2: SignerWithAddress;
  let account3: SignerWithAddress;
  let tokenHolder: Signer;
  let tokenWhale: string;
  let bancorABDK: BancorABDK;

  const hubId = 1;
  const hubId2 = 2;
  const MAX_WEIGHT = 1000000;
  const PRECISION = BigNumber.from(10).pow(18);
  const reserveWeight = MAX_WEIGHT / 2;
  const baseY = PRECISION.div(1000);
  const hubWarmup = 7 * 60 * 24 * 24; // 1 week
  const warmup = 2 * 60 * 24 * 24; // 2 days
  const duration = 4 * 60 * 24 * 24; // 4 days
  const coolDown = 5 * 60 * 24 * 24; // 5 days
  let block: any;
  before(async () => {
    let DAI;
    ({ DAI } = await getNamedAccounts());

    const encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint32"],
      [baseY, reserveWeight]
    );
    const encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
      ["address"],
      [DAI]
    );
    bancorABDK = await deploy<BancorABDK>("BancorABDK");
    ({
      tokenAddr,
      weightedAverage,
      meTokenRegistry,
      meTokenFactory,
      curveRegistry,
      vaultRegistry,
      migrationRegistry,
      singleAssetVault,
      foundry,
      hub,
      token,
      fee,
      account0,
      account1,
      account2,
      account3,
      tokenHolder,
      tokenWhale,
    } = await hubSetup(
      encodedCurveDetails,
      encodedVaultArgs,
      refundRatio,
      bancorABDK
    ));

    await hub.register(
      account0.address,
      tokenAddr,
      singleAssetVault.address,
      bancorABDK.address,
      refundRatio, //refund ratio
      encodedCurveDetails,
      encodedVaultArgs
    );
    await hub.setWarmup(hubWarmup);
  });

  describe("subscribe()", () => {
    it("should revert when hub is updating", async () => {
      await hub.initUpdate(hubId, bancorABDK.address, refundRatio / 2, "0x");
      const name = "Carl0 meToken";
      const symbol = "CARL";
      const assetsDeposited = 0;

      const tx = meTokenRegistry.subscribe(
        name,
        symbol,
        hubId,
        assetsDeposited
      );
      await expect(tx).to.be.revertedWith("Hub updating");
      await hub.cancelUpdate(hubId);
    });
    it("User can create a meToken with no collateral", async () => {
      const name = "Carl0 meToken";
      const symbol = "CARL";
      const assetsDeposited = 0;

      const tx = await meTokenRegistry.subscribe(
        name,
        symbol,
        hubId,
        assetsDeposited
      );
      await tx.wait();

      meTokenAddr0 = await meTokenRegistry.getOwnerMeToken(account0.address);
      const meTokensMinted = await bancorABDK.viewMeTokensMinted(
        assetsDeposited,
        hubId,
        0,
        0
      );

      await expect(tx)
        .to.emit(meTokenRegistry, "Subscribe")
        .withArgs(
          meTokenAddr0,
          account0.address,
          meTokensMinted,
          tokenAddr,
          assetsDeposited,
          name,
          symbol,
          hubId
        );

      // assert token infos
      const meToken = await getContractAt<MeToken>("MeToken", meTokenAddr0);
      expect(await meToken.name()).to.equal(name);
      expect(await meToken.symbol()).to.equal(symbol);
      expect(await meToken.decimals()).to.equal(18);
      expect(await meToken.totalSupply()).to.equal(0);
      expect(await meToken.totalSupply()).to.equal(0);
      const meTokenRegistryDetails = await meTokenRegistry.getDetails(
        meTokenAddr0
      );
      expect(meTokenRegistryDetails.owner).to.equal(account0.address);
      expect(meTokenRegistryDetails.hubId).to.equal(hubId);
      expect(meTokenRegistryDetails.balancePooled).to.equal(assetsDeposited);
      expect(meTokenRegistryDetails.balanceLocked).to.equal(0);
      expect(meTokenRegistryDetails.startTime).to.equal(0);
      expect(meTokenRegistryDetails.endTime).to.equal(0);
      expect(meTokenRegistryDetails.endCooldown).to.equal(0);
      expect(meTokenRegistryDetails.targetHubId).to.equal(0);
      expect(meTokenRegistryDetails.migration).to.equal(
        ethers.constants.AddressZero
      );
    });

    it("User can't create two meToken", async () => {
      const name = "Carl0 meToken";
      const symbol = "CARL";
      await expect(
        meTokenRegistry.connect(account0).subscribe(name, symbol, hubId, 0)
      ).to.be.revertedWith("msg.sender already owns a meToken");
    });

    it("User can create a meToken with 100 DAI as collateral", async () => {
      const amount = ethers.utils.parseEther("20");
      const balBefore = await token.balanceOf(account1.address);
      // need an approve of metoken registry first
      await token.connect(account1).approve(meTokenRegistry.address, amount);
      await meTokenRegistry
        .connect(account1)
        .subscribe("Carl1 meToken", "CARL", hubId, amount);
      const balAfter = await token.balanceOf(account1.address);
      expect(balBefore.sub(balAfter)).equal(amount);
      const hubDetail = await hub.getDetails(hubId);
      const balVault = await token.balanceOf(hubDetail.vault);
      expect(balVault).equal(amount);
      // assert token infos
      meTokenAddr1 = await meTokenRegistry.getOwnerMeToken(account1.address);
      const meToken = await getContractAt<MeToken>("MeToken", meTokenAddr1);
      // should be greater than 0

      const calculatedRes = calculateTokenReturnedFromZero(
        20,
        toETHNumber(baseY),
        reserveWeight / MAX_WEIGHT
      );
      expect(toETHNumber(await meToken.totalSupply())).to.equal(calculatedRes);
    });

    it("should revert to subscribe to invalid hub", async () => {
      const name = "Carl0 meToken";
      const symbol = "CARL";
      const assetsDeposited = 0;
      const invalidHub = 0;

      const tx = meTokenRegistry
        .connect(account2)
        .subscribe(name, symbol, invalidHub, assetsDeposited);
      expect(tx).to.be.revertedWith("Hub inactive");
    });

    it("should revert when _assetsDeposited transferFrom fails", async () => {
      // there can be multiple external cause here. Only checking for one
      const name = "Carl0 meToken";
      const symbol = "CARL";
      const assetsDeposited = ethers.utils.parseEther("20");
      await token
        .connect(tokenHolder)
        .transfer(account2.address, assetsDeposited);

      const tx = meTokenRegistry
        .connect(account2)
        .subscribe(name, symbol, hubId, assetsDeposited);
      await expect(tx).to.be.revertedWith("Dai/insufficient-allowance");
    });
  });

  describe("setWarmup()", () => {
    it("should revert to setWarmup if not owner", async () => {
      const tx = meTokenRegistry.connect(account1).setWarmup(warmup);
      await expect(tx).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("should revert to setWarmup if same as before", async () => {
      const oldWarmup = await meTokenRegistry.getWarmup();
      const tx = meTokenRegistry.setWarmup(oldWarmup);
      await expect(tx).to.be.revertedWith("warmup_ == _warmup");
    });
    it("should revert when warmup + duration > hub's warmup", async () => {
      const tx = meTokenRegistry.setWarmup(hubWarmup);
      await expect(tx).to.be.revertedWith("too long");
    });
    it("should be able to setWarmup", async () => {
      const tx = await meTokenRegistry.setWarmup(warmup);
      await tx.wait();
      expect(await meTokenRegistry.getWarmup()).to.be.equal(warmup);
    });
  });

  describe("setDuration()", () => {
    it("should revert to setDuration if not owner", async () => {
      const tx = meTokenRegistry.connect(account1).setDuration(duration);
      await expect(tx).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("should revert to setDuration if same as before", async () => {
      const oldWarmup = await meTokenRegistry.getDuration();
      const tx = meTokenRegistry.setDuration(oldWarmup);
      await expect(tx).to.be.revertedWith("duration_ == _duration");
    });
    it("should revert when warmup + duration > hub's warmup", async () => {
      const tx = meTokenRegistry.setDuration(hubWarmup);
      await expect(tx).to.be.revertedWith("too long");
    });
    it("should be able to setDuration", async () => {
      const tx = await meTokenRegistry.setDuration(duration);
      await tx.wait();
      expect(await meTokenRegistry.getDuration()).to.be.equal(duration);
    });
  });

  describe("setCooldown()", () => {
    it("should revert to setCooldown if not owner", async () => {
      const tx = meTokenRegistry.connect(account1).setCooldown(coolDown);
      await expect(tx).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("should revert to setCooldown if same as before", async () => {
      const oldWarmup = await meTokenRegistry.getCooldown();
      const tx = meTokenRegistry.setCooldown(oldWarmup);
      await expect(tx).to.be.revertedWith("cooldown_ == _cooldown");
    });
    it("should be able to setCooldown", async () => {
      const tx = await meTokenRegistry.setCooldown(coolDown);
      await tx.wait();
      expect(await meTokenRegistry.getCooldown()).to.be.equal(coolDown);
    });
  });

  describe("initResubscribe()", () => {
    it("Fails if msg.sender not meToken owner", async () => {
      const meToken = meTokenAddr0;
      const targetHubId = hubId2;
      const migration = ethers.constants.AddressZero;
      const encodedMigrationArgs = "0x";

      const tx = meTokenRegistry
        .connect(account1)
        .initResubscribe(meToken, targetHubId, migration, encodedMigrationArgs);
      await expect(tx).to.be.revertedWith("!owner");
    });
    it("Fails if resubscribing to same hub", async () => {
      const meToken = meTokenAddr0;
      const targetHubId = hubId; // exiting hubId
      const migration = ethers.constants.AddressZero;
      const encodedMigrationArgs = "0x";

      const tx = meTokenRegistry.initResubscribe(
        meToken,
        targetHubId,
        migration,
        encodedMigrationArgs
      );
      await expect(tx).to.be.revertedWith("same hub");
    });
    xit("Fails if current hub is inactive");
    it("Fails if resubscribing to inactive hub", async () => {
      const meToken = meTokenAddr0;
      const targetHubId = 0; // inactive hub
      const migration = ethers.constants.AddressZero;
      const encodedMigrationArgs = "0x";

      const tx = meTokenRegistry.initResubscribe(
        meToken,
        targetHubId,
        migration,
        encodedMigrationArgs
      );
      await expect(tx).to.be.revertedWith("targetHub inactive");
    });
    it("Fails if current hub currently updating", async () => {
      await (
        await hub.initUpdate(hubId, bancorABDK.address, refundRatio / 2, "0x")
      ).wait();

      const tx = meTokenRegistry.initResubscribe(
        meTokenAddr0,
        hubId2,
        ethers.constants.AddressZero,
        "0x"
      );
      await expect(tx).to.be.revertedWith("hub updating");
      await (await hub.cancelUpdate(hubId)).wait();
    });
    it("Fails if target hub currently updating", async () => {
      await (
        await hub.initUpdate(hubId2, bancorABDK.address, refundRatio / 2, "0x")
      ).wait();

      const tx = meTokenRegistry.initResubscribe(
        meTokenAddr0,
        hubId2,
        ethers.constants.AddressZero,
        "0x"
      );
      await expect(tx).to.be.revertedWith("targetHub updating");
      await (await hub.cancelUpdate(hubId2)).wait();
    });
    xit("Fails if attempting to use an unapproved migration", async () => {});
    xit("Fails from invalid _encodedMigrationArgs", async () => {});
    it("Successfully calls IMigration.initMigration() and set correct resubscription details", async () => {
      const meToken = meTokenAddr0;
      const targetHubId = hubId2;
      const migration = ethers.constants.AddressZero;
      const encodedMigrationArgs = "0x";

      const tx = await meTokenRegistry.initResubscribe(
        meToken,
        targetHubId,
        migration,
        encodedMigrationArgs
      );
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      const expectedStartTime = block.timestamp + warmup;
      const expectedEndTime = block.timestamp + warmup + duration;
      const expectedEndCooldownTime =
        block.timestamp + warmup + duration + coolDown;

      await expect(tx)
        .to.emit(meTokenRegistry, "InitResubscribe")
        .withArgs(meToken, targetHubId, migration, encodedMigrationArgs);

      const meTokenRegistryDetails = await meTokenRegistry.getDetails(
        meTokenAddr0
      );
      expect(meTokenRegistryDetails.startTime).to.equal(expectedStartTime);
      expect(meTokenRegistryDetails.endTime).to.equal(expectedEndTime);
      expect(meTokenRegistryDetails.endCooldown).to.equal(
        expectedEndCooldownTime
      );
      expect(meTokenRegistryDetails.targetHubId).to.equal(targetHubId);
      expect(meTokenRegistryDetails.migration).to.equal(migration);
    });
    it("Fail if already resubscribing before endCoolDown", async () => {
      const meToken = meTokenAddr0;
      const targetHubId = hubId2;
      const migration = ethers.constants.AddressZero;
      const encodedMigrationArgs = "0x";

      const tx = meTokenRegistry.initResubscribe(
        meToken,
        targetHubId,
        migration,
        encodedMigrationArgs
      );
      await expect(tx).to.be.revertedWith("Cooldown not complete");
    });
  });

  describe("cancelResubscribe()", () => {
    it("Fails if a called by non-owner", async () => {
      await expect(
        meTokenRegistry.connect(account1).cancelResubscribe(meTokenAddr0)
      ).to.be.revertedWith("!owner");
    });
    it("Fails if meToken not resubscribing", async () => {
      await expect(
        meTokenRegistry.connect(account1).cancelResubscribe(meTokenAddr1)
      ).to.be.revertedWith("!resubscribing");
    });
    it("Successfully resets meToken details", async () => {
      block = await ethers.provider.getBlock("latest");
      expect(
        (await meTokenRegistry.getDetails(meTokenAddr0)).startTime
      ).to.be.gt(block.timestamp);
      const tx = await meTokenRegistry.cancelResubscribe(meTokenAddr0);
      await tx.wait();

      await expect(tx)
        .to.emit(meTokenRegistry, "CancelResubscribe")
        .withArgs(meTokenAddr0);

      const meTokenRegistryDetails = await meTokenRegistry.getDetails(
        meTokenAddr0
      );
      expect(meTokenRegistryDetails.startTime).to.be.equal(0);
      expect(meTokenRegistryDetails.endTime).to.be.equal(0);
      expect(meTokenRegistryDetails.targetHubId).to.be.equal(0);
      expect(meTokenRegistryDetails.migration).to.be.equal(
        ethers.constants.AddressZero
      );
    });
    it("Fails if resubscription already started", async () => {
      const oldMeTokenRegistryDetails = await meTokenRegistry.getDetails(
        meTokenAddr0
      );
      // forward time after start time
      await mineBlock(oldMeTokenRegistryDetails.endCooldown.toNumber() + 2);
      block = await ethers.provider.getBlock("latest");
      expect(oldMeTokenRegistryDetails.endCooldown).to.be.lt(block.timestamp);

      const meToken = meTokenAddr0;
      const targetHubId = hubId2;
      const migration = ethers.constants.AddressZero;
      const encodedMigrationArgs = "0x";

      const tx = await meTokenRegistry.initResubscribe(
        meToken,
        targetHubId,
        migration,
        encodedMigrationArgs
      );
      await tx.wait();

      const meTokenRegistryDetails = await meTokenRegistry.getDetails(
        meTokenAddr0
      );
      // forward time after start time
      await mineBlock(meTokenRegistryDetails.startTime.toNumber() + 2);
      block = await ethers.provider.getBlock("latest");
      expect(meTokenRegistryDetails.startTime).to.be.lt(block.timestamp);

      await expect(
        meTokenRegistry.cancelResubscribe(meTokenAddr0)
      ).to.be.revertedWith("Resubscription has started");
    });
  });

  describe("finishResubscribe()", () => {
    xit("Fails if meToken not resubscribing", async () => {});
    xit("Fails if updating but cooldown not reached", async () => {});
    xit("Successfully calls IMigration.finishMigration()", async () => {});
    xit("Successfully updates meToken details", async () => {});
    xit("Emits FinishResubscribe()", async () => {});
  });

  describe("transferMeTokenOwnership()", () => {
    it("Fails if not a meToken owner", async () => {
      await expect(
        meTokenRegistry
          .connect(account3)
          .transferMeTokenOwnership(account2.address)
      ).to.revertedWith("meToken does not exist");
    });
    it("Fails if recipient already owns a meToken", async () => {
      await expect(
        meTokenRegistry.transferMeTokenOwnership(account1.address)
      ).to.revertedWith("_newOwner already owns a meToken");
    });
    it("Fails if _newOwner is address(0)", async () => {
      await expect(
        meTokenRegistry.transferMeTokenOwnership(ethers.constants.AddressZero)
      ).to.be.revertedWith("Cannot transfer to 0 address");
    });
    it("Successfully queues a recipient to claim ownership", async () => {
      expect(await meTokenRegistry.getPendingOwner(account1.address)).to.equal(
        ethers.constants.AddressZero
      );
      tx = await meTokenRegistry
        .connect(account1)
        .transferMeTokenOwnership(account2.address);
      expect(await meTokenRegistry.getPendingOwner(account1.address)).to.equal(
        account2.address
      );
    });
    it("Emits TransferOwnership()", async () => {
      expect(tx)
        .to.emit(meTokenRegistry, "TransferMeTokenOwnership")
        .withArgs(account1.address, account2.address, meTokenAddr1);
    });
    it("Fails to when pending ownership", async () => {
      await expect(
        meTokenRegistry
          .connect(account1)
          .transferMeTokenOwnership(account2.address)
      ).to.be.revertedWith("transfer ownership already pending");
    });
  });

  describe("cancelTransferMeTokenOwnership()", () => {
    it("Fails if owner has never called transferMeTokenOwnership()", async () => {
      await expect(
        meTokenRegistry.connect(account0).cancelTransferMeTokenOwnership()
      ).to.be.revertedWith("transferMeTokenOwnership() not initiated");
    });
    it("Fails if owner does not own a meToken", async () => {
      await expect(
        meTokenRegistry.connect(account2).cancelTransferMeTokenOwnership()
      ).to.be.revertedWith("meToken does not exist");
    });
    it("Successfully cancels transfer and removes from _pendingOwners", async () => {
      tx = await meTokenRegistry
        .connect(account1)
        .cancelTransferMeTokenOwnership();
      expect(await meTokenRegistry.getPendingOwner(account1.address)).to.equal(
        ethers.constants.AddressZero
      );
    });
    it("Emits CancelTransferMeTokenOwnership()", async () => {
      expect(tx)
        .to.emit(meTokenRegistry, "CancelTransferMeTokenOwnership")
        .withArgs(account1.address, meTokenAddr1);
    });
  });

  describe("claimMeTokenOwnership()", () => {
    it("Fails if claimer already owns a meToken", async () => {
      // scenario 1: already owns a meToken, not a pending owner
      await expect(
        meTokenRegistry
          .connect(account0)
          .claimMeTokenOwnership(ethers.constants.AddressZero)
      ).to.be.revertedWith("Already owns a meToken");
      // Scenario 2: doesn't own a meToken and becomes pending owner for 2 meTokens,
      // claims ownership to the first, then tries claiming ownership to the second
      await meTokenRegistry
        .connect(account0)
        .transferMeTokenOwnership(account2.address);
      await meTokenRegistry
        .connect(account1)
        .transferMeTokenOwnership(account2.address);
      tx = await meTokenRegistry
        .connect(account2)
        .claimMeTokenOwnership(account0.address);
      await expect(
        meTokenRegistry
          .connect(account2)
          .claimMeTokenOwnership(account1.address)
      ).to.be.revertedWith("Already owns a meToken");
    });
    it("Fails if not claimer not pending owner from oldOwner", async () => {
      await expect(
        meTokenRegistry
          .connect(account3)
          .claimMeTokenOwnership(account1.address)
      ).to.be.revertedWith("!_pendingOwner");
    });
    it("Successfully completes claim and updates meToken struct, deletes old mappings", async () => {
      expect(await meTokenRegistry.getOwnerMeToken(account2.address)).to.equal(
        meTokenAddr0
      );
      const details = await meTokenRegistry.getDetails(meTokenAddr0);
      expect(details.owner).to.equal(account2.address);
      expect(await meTokenRegistry.getPendingOwner(account0.address)).to.equal(
        ethers.constants.AddressZero
      );
      expect(await meTokenRegistry.getOwnerMeToken(account0.address)).to.equal(
        ethers.constants.AddressZero
      );
    });
    it("Emits ClaimMeTokenOwnership()", async () => {
      expect(tx)
        .to.emit(meTokenRegistry, "ClaimMeTokenOwnership")
        .withArgs(account0.address, account2.address, meTokenAddr0);
    });
  });

  describe("isOwner()", () => {
    it("Returns false for address(0)", async () => {
      expect(await meTokenRegistry.isOwner(ethers.constants.AddressZero)).to.be
        .false;
    });
    it("Returns false for if address not an owner", async () => {
      expect(await meTokenRegistry.isOwner(account3.address)).to.be.false;
    });
    it("Returns true for a meToken issuer", async () => {
      expect(await meTokenRegistry.isOwner(account1.address)).to.be.true;
    });
  });
  describe("balancePool", () => {
    it("Fails if not foundry", async () => {
      await expect(
        meTokenRegistry.updateBalancePooled(
          true,
          meTokenAddr1,
          account2.address
        )
      ).to.revertedWith("!foundry");
    });
    it("updateBalancePooled()", async () => {
      //  const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
      //   account2.address
      // );
      // const tx = meTokenRegistry
      //   .connect(account2)
      //   .incrementBalancePooled(true, meTokenAddr, account2.address);
    });

    it("updateBalanceLocked()", async () => {});
  });
});
