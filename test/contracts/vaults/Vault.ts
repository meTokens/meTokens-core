import { ethers, getNamedAccounts } from "hardhat";
import { expect } from "chai";
import { SingleAssetVault } from "../../../artifacts/types/SingleAssetVault";

describe("Vault.sol", () => {
  const amount = 3;
  let vault: SingleAssetVault;
  let DAI: string;
  before(async () => {
    ({ DAI } = await getNamedAccounts());
    const vaultFactory = await ethers.getContractFactory("SingleAssetVault");
    vault = (await vaultFactory.deploy()) as SingleAssetVault;
    await vault.deployed();
  });

  describe("addFee()", () => {
    it("Reverts when not called by owner", async () => {
      // TODO
    });

    it("Increments accruedFees by amount", async () => {
      const accruedFeesBefore = await vault.getAccruedFees(DAI);
      await vault.addFee(DAI, amount);
      const accruedFeesAfter = await vault.getAccruedFees(DAI);
      expect(Number(accruedFeesBefore)).to.equal(
        Number(accruedFeesAfter) - amount
      );
    });

    it("Emits AddFee(amount)", async () => {
      expect(await vault.addFee(DAI, amount))
        .to.emit(vault, "AddFee")
        .withArgs(amount);
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
