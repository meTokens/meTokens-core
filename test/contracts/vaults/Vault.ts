const fs = require("fs");

// const { ethers } = require("hardhat");
const Vault = artifacts.require("Vault");

const ZEROADDRESS = "0x0000000000000000000000000000000000000000";
const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const json = JSON.parse(fs.readFileSync("./test/abi/dai.json"));

describe("Vault.sol", () => {
  const amount = 3;
  let dai;
  let vault;

  before(async () => {
    [owner, addr1, addr2] = await ethers.getSigners();
    vault = await Vault.new();
    dai = new ethers.Contract(DAI, json, owner);
  });

  describe("addFee()", () => {
    it("Reverts when not called by owner", async () => {
      // expect(await vault.addFee(amount, {from:addr1})).to.be.reverted;
    });

    it("Increments accruedFees by amount", async () => {
      const accruedFeesBefore = await vault.accruedFees();
      await vault.addFee(amount);
      const accruedFeesAfter = await vault.accruedFees();
      expect(Number(accruedFeesBefore)).to.equal(accruedFeesAfter - amount);
    });

    it("Emits AddFee(amount)", async () => {
      expect(await vault.addFee(amount))
        .to.emit(vault, "AddFee")
        .withArgs(amount);
    });
  });

  describe("withdrawFees()", () => {
    it("Reverts when not called by owner", async () => {
      // expect(
      //     await vault.withdrawFees(true, 0, ZEROADDRESS)
      // ).to.be.reverted;
    });

    it("Transfer some accrued fees", async () => {
      // TODO
    });

    it("Transfer all remaining accrued fees", async () => {
      // TODO
    });
  });
});
