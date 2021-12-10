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
  });

  describe("subscribe()", () => {
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
      console.log(`    calculatedRes:${calculatedRes}`);
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

      const tx = meTokenRegistry
        .connect(account2)
        .subscribe(name, symbol, hubId, assetsDeposited);
      await expect(tx).to.be.revertedWith("Dai/insufficient-balance");
    });
  });

  describe("initResubscribe()", () => {
    it("Fails if msg.sender not meToken owner", async () => {});
    it("Fails if resubscribing to same hub", async () => {});
    it("Fails if resubscribing to inactive hub", async () => {});
    it("Fails if current hub currently updating", async () => {});
    it("Fails if target hub currently updating", async () => {});
    it("Fails if attempting to use an unapproved migration", async () => {});
    it("Fails from invalid _encodedMigrationArgs", async () => {});
    it("Successfully calls IMigration.initMigration()", async () => {});
    it("Successfully sets meToken resubscription details", async () => {});
    it("Emits InitResubscribe()", async () => {});
  });

  describe("cancelResubscribe()", () => {
    it("Fails if a called by non-owner", async () => {});
    it("Fails if meToken not resubscribing", async () => {});
    it("Fails if resubscription already started", async () => {});
    it("Successfully resets meToken details", async () => {});
    it("Emits CancelResubscribe()", async () => {});
  });

  describe("finishResubscribe()", () => {
    it("Fails if meToken not resubscribing", async () => {});
    it("Fails if updating but cooldown not reached", async () => {});
    it("Succesfully calls IMigration.finishMigration()", async () => {});
    it("Succesfully updates meToken details", async () => {});
    it("Emits FinishResubscribe()", async () => {});
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
    it("Succesfully cancels transfer and removes from _pendingOwners", async () => {
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
