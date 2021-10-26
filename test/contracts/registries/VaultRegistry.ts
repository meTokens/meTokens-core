import { expect } from "chai";
import { ethers, getNamedAccounts } from "hardhat";
import { Hub } from "../../../artifacts/types/Hub";
import { VaultRegistry } from "../../../artifacts/types/VaultRegistry";
import { SingleAssetVault } from "../../../artifacts/types/SingleAssetVault";
import { deploy } from "../../utils/helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Foundry } from "../../../artifacts/types/Foundry";
import { WeightedAverage } from "../../../artifacts/types/WeightedAverage";
import { BancorZeroCurve } from "../../../artifacts/types/BancorZeroCurve";
import { CurveRegistry } from "../../../artifacts/types/CurveRegistry";
import { MigrationRegistry } from "../../../artifacts/types/MigrationRegistry";

describe("VaultRegistry.sol", () => {
  let DAI: string;
  let vaultRegistry: VaultRegistry;
  let curveRegistry: CurveRegistry;
  let foundry: Foundry;
  let vault: SingleAssetVault;
  let hub: Hub;
  let signers: SignerWithAddress[];
  before(async () => {
    // NOTE: test address we're using for approvals
    ({ DAI } = await getNamedAccounts());
    hub = await deploy<Hub>("Hub");

    const weightedAverage = await deploy<WeightedAverage>("WeightedAverage");
    curveRegistry = await deploy<CurveRegistry>("CurveRegistry");
    vaultRegistry = await deploy<VaultRegistry>("VaultRegistry");
    const migrationRegistry = await deploy<MigrationRegistry>(
      "MigrationRegistry"
    );
    foundry = await deploy<Foundry>("Foundry", {
      WeightedAverage: weightedAverage.address,
    });
    vault = await deploy<SingleAssetVault>(
      "SingleAssetVault",
      undefined, //no libs
      signers[0].address, // DAO
      foundry.address // foundry
    );

    await hub.initialize(vaultRegistry.address, curveRegistry.address);

    signers = await ethers.getSigners();
  });

  describe("approve()", () => {
    it("Vault is not yet approved", async () => {
      expect(await vaultRegistry.isApproved(DAI)).to.equal(false);
    });

    it("Emits Approve(address)", async () => {
      const newVaultRegistry = await deploy<VaultRegistry>("VaultRegistry");

      expect(await newVaultRegistry.approve(DAI))
        .to.emit(newVaultRegistry, "Approve")
        .withArgs(DAI);
    });
  });
  describe("register()", () => {
    it("Reverts when called by unapproved factory", async () => {
      // TODO: make sure new implementation is deployed
    });

    it("Emits Register(address)", async () => {
      //vaultRegistry = await deploy<VaultRegistry>("VaultRegistry");
      const weightedAverage = await deploy<WeightedAverage>("WeightedAverage");
      const newFoundry = await deploy<Foundry>("Foundry", {
        WeightedAverage: weightedAverage.address,
      });
      vault = await deploy<SingleAssetVault>(
        "SingleAssetVault",
        undefined, //no libs
        signers[0].address, // DAO
        newFoundry.address // foundry
      );

      // clone implementation to make it a SingleAssetVault with hub and DAI
      await vaultRegistry.approve(vault.address);
      const encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [vault.address]
      );
      const bancorZeroCurve = await deploy<BancorZeroCurve>("BancorZeroCurve");
      const baseY = "10000000000000000";
      const reserveWeight = "500000";
      const encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint32"],
        [baseY, reserveWeight]
      );
      await curveRegistry.register(bancorZeroCurve.address);

      expect(
        await hub.register(
          vault.address,
          bancorZeroCurve.address,
          5000, //refund ratio
          encodedCurveDetails,
          encodedVaultArgs
        )
      ).to.emit(vaultRegistry, "Register");
    });
  });
  describe("unapprove()", () => {
    it("Revert if not yet approved", async () => {
      const newVaultRegistry = await deploy<VaultRegistry>("VaultRegistry");

      await expect(
        // TODO: This is supposed to revert, why error?
        newVaultRegistry.unapprove(DAI)
      ).to.revertedWith("Factory not _approved");
    });

    it("Emits Unapprove(address)", async () => {
      const newVaultRegistry = await deploy<VaultRegistry>("VaultRegistry");

      await newVaultRegistry.approve(DAI);
      await expect(newVaultRegistry.unapprove(DAI))
        .to.emit(newVaultRegistry, "Unapprove")
        .withArgs(DAI);
    });
  });

  describe("isActive()", () => {
    it("Return false for inactive/nonexistent vault", async () => {
      const newVaultRegistry = await deploy<VaultRegistry>("VaultRegistry");
      expect(await newVaultRegistry.isApproved(DAI)).to.equal(false);
    });
    it("register Revert if not yet approved", async () => {
      const _encodedArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [hub.address]
      );
      await expect(vault.register(0, _encodedArgs)).to.revertedWith("!hub");
    });
    it("Return true for active vault", async () => {
      const newVaultRegistry = await deploy<VaultRegistry>("VaultRegistry");
      const newVault = await deploy<SingleAssetVault>(
        "SingleAssetVault",
        undefined, //no libs
        signers[0].address, // DAO
        foundry.address // foundry
      );
      // TODO: vaultRegistry.approve(msg.sender)
      await newVaultRegistry.approve(newVault.address);
      const newBancorZeroCurve = await deploy<BancorZeroCurve>(
        "BancorZeroCurve"
      );
      const baseY = "10000000000000000";
      const reserveWeight = "500000";
      const encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint32"],
        [baseY, reserveWeight]
      );
      const encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [newVault.address]
      );
      await curveRegistry.register(newBancorZeroCurve.address);
      await hub.register(
        newVault.address,
        newBancorZeroCurve.address,
        5000, //refund ratio
        encodedCurveDetails,
        encodedVaultArgs
      );
      expect(await newVaultRegistry.isApproved(newVault.address)).to.equal(
        true
      );
    });
  });
});
