import { ethers, getNamedAccounts } from "hardhat";
import { expect } from "chai";
import { SingleAssetVault } from "../../../artifacts/types/SingleAssetVault";
import { BancorZeroCurve } from "../../../artifacts/types/BancorZeroCurve";
import { CurveRegistry } from "../../../artifacts/types/CurveRegistry";
import { ERC20 } from "../../../artifacts/types/ERC20";
import { Foundry } from "../../../artifacts/types/Foundry";
import { Hub } from "../../../artifacts/types/Hub";
import { MeTokenFactory } from "../../../artifacts/types/MeTokenFactory";
import { MeTokenRegistry } from "../../../artifacts/types/MeTokenRegistry";
import { MigrationRegistry } from "../../../artifacts/types/MigrationRegistry";
import { WeightedAverage } from "../../../artifacts/types/WeightedAverage";
import VaultRegistry from "../../../deploy/VaultRegistry";
import { impersonate } from "../../utils/hardhatNode";
import { getContractAt, deploy } from "../../utils/helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Vault.sol", () => {
  const amount = 3;
  let vault: SingleAssetVault;
  let DAI: string;
  let account0: SignerWithAddress;
  let account1: SignerWithAddress;
  let account2: SignerWithAddress;
  before(async () => {
    ({ DAI } = await getNamedAccounts());

    [account0, account1, account2] = await ethers.getSigners();

    const weightedAverage = await deploy<WeightedAverage>("WeightedAverage");
    const migrationRegistry = await deploy<MigrationRegistry>(
      "MigrationRegistry"
    );

    const foundry = await deploy<Foundry>("Foundry", {
      WeightedAverage: weightedAverage.address,
    });
    const hub = await deploy<Hub>("Hub");
    const meTokenFactory = await deploy<MeTokenFactory>("MeTokenFactory");
    const meTokenRegistry = await deploy<MeTokenRegistry>(
      "MeTokenRegistry",
      undefined,
      hub.address,
      meTokenFactory.address,
      migrationRegistry.address
    );

    vault = await deploy<SingleAssetVault>(
      "SingleAssetVault",
      undefined, //no libs
      account1.address, // DAO
      foundry.address, // foundry
      hub.address, // hub
      meTokenRegistry.address, //IMeTokenRegistry
      migrationRegistry.address //IMigrationRegistry
    );
  });

  describe("addFee()", () => {
    it("Reverts when not called by owner", async () => {
      // TODO
    });
    it("Increments accruedFees revert if not foundry", async () => {
      await expect(vault.addFee(DAI, amount)).to.be.revertedWith("!foundry");
    });
  });

  describe("withdrawFees()", () => {
    it("Reverts when not called by owner", async () => {
      // TODO
    });

    it("Transfer some accrued fees", async () => {
      // TODO
    });

    it("Transfer all remaining accrued fees", async () => {
      // TODO
    });
  });
});
