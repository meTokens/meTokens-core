import { ethers, getNamedAccounts } from "hardhat";
import { expect } from "chai";
import { SingleAssetVault } from "../../../artifacts/types/SingleAssetVault";
import { Foundry } from "../../../artifacts/types/Foundry";
import { Hub } from "../../../artifacts/types/Hub";
import { MeTokenFactory } from "../../../artifacts/types/MeTokenFactory";
import { MeTokenRegistry } from "../../../artifacts/types/MeTokenRegistry";
import { MigrationRegistry } from "../../../artifacts/types/MigrationRegistry";
import { WeightedAverage } from "../../../artifacts/types/WeightedAverage";
import { deploy } from "../../utils/helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Vault.sol", () => {
  const amount = 3;
  let vault: SingleAssetVault;
  let DAI: string;
  let account0: SignerWithAddress;
  let account1: SignerWithAddress;
  let account2: SignerWithAddress;

  let dao: SignerWithAddress;
  let weightedAverage: WeightedAverage;
  let migrationRegistry: MigrationRegistry;
  let foundry: Foundry;
  let hub: Hub;
  let meTokenFactory: MeTokenFactory;
  let meTokenRegistry: MeTokenRegistry;

  const precision = ethers.utils.parseUnits("1");
  before(async () => {
    ({ DAI } = await getNamedAccounts());

    [account0, account1, account2] = await ethers.getSigners();
    dao = account1;
    weightedAverage = await deploy<WeightedAverage>("WeightedAverage");
    migrationRegistry = await deploy<MigrationRegistry>("MigrationRegistry");

    foundry = await deploy<Foundry>("Foundry", {
      WeightedAverage: weightedAverage.address,
    });
    hub = await deploy<Hub>("Hub");
    meTokenFactory = await deploy<MeTokenFactory>("MeTokenFactory");
    meTokenRegistry = await deploy<MeTokenRegistry>(
      "MeTokenRegistry",
      undefined,
      foundry.address,
      hub.address,
      meTokenFactory.address,
      migrationRegistry.address
    );

    vault = await deploy<SingleAssetVault>(
      "SingleAssetVault",
      undefined,
      dao.address, // DAO
      foundry.address, // foundry
      hub.address, // hub
      meTokenRegistry.address, //IMeTokenRegistry
      migrationRegistry.address //IMigrationRegistry
    );
  });

  describe("Check initial state", () => {
    it("check initial state", async () => {
      expect(await vault.owner()).to.be.equal(account0.address);
      expect(await vault.PRECISION()).to.be.equal(precision);
      expect(await vault.dao()).to.be.equal(dao.address);
      expect(await vault.foundry()).to.be.equal(foundry.address);
      expect(await vault.hub()).to.be.equal(hub.address);
      expect(await vault.meTokenRegistry()).to.be.equal(
        meTokenRegistry.address
      );
      expect(await vault.migrationRegistry()).to.be.equal(
        migrationRegistry.address
      );
      expect(await vault.accruedFees(dao.address)).to.be.equal(0);
    });
  });

  describe("approveAsset()", () => {
    it("reverts when sender is not foundry or meTokenRegistry", async () => {
      await expect(vault.approveAsset(DAI, amount)).to.be.revertedWith(
        "!foundry||!meTokenRegistry"
      );
    });
  });

  describe("addFee()", () => {
    xit("Reverts when not called by owner", async () => {
      // FIXME not a valid test
    });
    it("Increments accruedFees revert if not foundry", async () => {
      await expect(vault.addFee(DAI, amount)).to.be.revertedWith("!foundry");
    });
  });

  describe("withdrawFees()", () => {
    xit("Reverts when not called by owner", async () => {
      // TODO
    });

    xit("Transfer some accrued fees", async () => {
      // TODO
    });

    xit("Transfer all remaining accrued fees", async () => {
      // TODO
    });
  });

  describe("withdraw()", () => {
    it("reverts when sender is not dao", async () => {
      await expect(vault.withdraw(DAI, true, 0)).to.be.revertedWith("!DAO");
    });
  });
});
