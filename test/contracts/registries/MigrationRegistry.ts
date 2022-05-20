import { expect } from "chai";
import { ethers, getNamedAccounts } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { deploy } from "../../utils/helpers";
import { hubSetup } from "../../utils/hubSetup";
import {
  HubFacet,
  VaultRegistry,
  MigrationRegistry,
  SingleAssetVault,
  UniswapSingleTransferMigration,
} from "../../../artifacts/types";

const setup = async () => {
  describe("MigrationRegistry.sol", () => {
    let DAI: string;
    let WETH: string;
    let account0: SignerWithAddress;
    let account1: SignerWithAddress;
    let migrationRegistry: MigrationRegistry;
    let migration: UniswapSingleTransferMigration;
    let initialVault: SingleAssetVault;
    let targetVault: SingleAssetVault;
    let hub: HubFacet;
    let vaultRegistry: VaultRegistry;

    const fees = 3000;
    const refundRatio = 500000;
    const MAX_WEIGHT = 1000000;
    const reserveWeight = MAX_WEIGHT / 2;
    const PRECISION = BigNumber.from(10).pow(6);
    const baseY = PRECISION.div(1000);

    let encodedMigrationArgs: string;
    let encodedVaultDAIArgs: string;
    let encodedVaultWETHArgs: string;

    before(async () => {
      ({ DAI, WETH } = await getNamedAccounts());

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
        migrationRegistry,
        singleAssetVault: initialVault,
        vaultRegistry,
        account0,
        account1,
      } = await hubSetup(
        baseY,
        reserveWeight,
        encodedVaultDAIArgs,
        refundRatio
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
    });

    it("should revert approve when sender is not owner", async () => {
      await expect(
        migrationRegistry
          .connect(account1)
          .approve(initialVault.address, targetVault.address, migration.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("should approve", async () => {
      const tx = await migrationRegistry.approve(
        initialVault.address,
        targetVault.address,
        migration.address
      );

      await expect(tx)
        .to.emit(migrationRegistry, "Approve")
        .withArgs(initialVault.address, targetVault.address, migration.address);

      expect(
        await migrationRegistry.isApproved(
          initialVault.address,
          targetVault.address,
          migration.address
        )
      ).to.equal(true);
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
    it("should revert unapprove when sender is not owner", async () => {
      await expect(
        migrationRegistry
          .connect(account1)
          .unapprove(
            initialVault.address,
            targetVault.address,
            migration.address
          )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("should be able to unapprove migration vaults", async () => {
      const tx = await migrationRegistry.unapprove(
        initialVault.address,
        targetVault.address,
        migration.address
      );

      await expect(tx)
        .to.emit(migrationRegistry, "Unapprove")
        .withArgs(initialVault.address, targetVault.address, migration.address);

      expect(
        await migrationRegistry.isApproved(
          initialVault.address,
          targetVault.address,
          migration.address
        )
      ).to.equal(false);
    });
    it("should revert when try to unapprove already unapproved vaults", async () => {
      await expect(
        migrationRegistry.unapprove(
          initialVault.address,
          targetVault.address,
          migration.address
        )
      ).to.be.revertedWith("migration not approved");
    });
  });
};

setup().then(() => {
  run();
});
