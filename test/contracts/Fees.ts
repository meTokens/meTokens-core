import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { FeesFacet } from "../../artifacts/types/FeesFacet";
import { hubSetupWithoutRegister } from "../utils/hubSetup";

const setup = async () => {
  describe("FeesFacet.sol", () => {
    let fees: FeesFacet;

    const mintFee = 10000000;
    const burnBuyerFee = 10000000;
    const burnOwnerFee = 10000000;
    const transferFee = 10000000;
    const interestFee = 10000000;
    const yieldFee = 10000000;
    const FEE_MAX = 10 ** 18;
    let account0: SignerWithAddress;
    let account1: SignerWithAddress;
    before(async () => {
      ({
        fee: fees,
        account0,
        account1,
      } = await hubSetupWithoutRegister("bancorABDK", [
        mintFee,
        burnBuyerFee,
        burnOwnerFee,
        transferFee,
        interestFee,
        yieldFee,
      ]));
    });

    describe("setMintFee()", () => {
      it("Returns correct value of fee", async () => {
        const curMintFee = await fees.mintFee();
        expect(curMintFee).to.equal(mintFee);
      });
      it("Non-owner cannot set fee", async () => {
        await expect(fees.connect(account1).setMintFee(1)).to.revertedWith(
          "!feesController"
        );
      });
      it("Cannot set fee to the same fee", async () => {
        await expect(fees.setMintFee(mintFee)).to.revertedWith("out of range");
      });
      it("Cannot set fee above the fee max", async () => {
        await expect(
          fees.setMintFee(ethers.utils.parseEther("100"))
        ).to.revertedWith("out of range");
      });
      it("Sets fee to the new value", async () => {
        const tx = await fees.setMintFee(90000);
        expect(tx).to.emit(fees, "SetMintFee").withArgs(90000);
        const curMintFee = await fees.mintFee();
        expect(curMintFee).to.equal(90000);
      });
    });
    describe("setBurnBuyerFee()", () => {
      it("Returns correct value of fee", async () => {
        const curBurnBuyerFee = await fees.burnBuyerFee();
        expect(curBurnBuyerFee).to.equal(burnBuyerFee);
      });
      it("Non-owner cannot set fee", async () => {
        await expect(fees.connect(account1).setBurnBuyerFee(1)).to.revertedWith(
          "!feesController"
        );
      });
      it("Cannot set fee to the same fee", async () => {
        await expect(fees.setBurnBuyerFee(burnBuyerFee)).to.revertedWith(
          "out of range"
        );
      });
      it("Cannot set fee above the fee max", async () => {
        await expect(
          fees.setBurnBuyerFee(ethers.utils.parseEther("100"))
        ).to.revertedWith("out of range");
      });
      it("Sets fee to the new value", async () => {
        const tx = await fees.setBurnBuyerFee(90000);
        expect(tx).to.emit(fees, "SetBurnBuyerFee").withArgs(90000);
        const curBurnBuyerFee = await fees.burnBuyerFee();
        expect(curBurnBuyerFee).to.equal(90000);
      });
    });
    describe("setBurnOwnerFee()", () => {
      it("Returns correct value of fee", async () => {
        const curBurnOwnerFee = await fees.burnOwnerFee();
        expect(curBurnOwnerFee).to.equal(burnBuyerFee);
      });
      it("Non-owner cannot set fee", async () => {
        await expect(fees.connect(account1).setBurnOwnerFee(1)).to.revertedWith(
          "!feesController"
        );
      });
      it("Cannot set fee to the same fee", async () => {
        await expect(fees.setBurnOwnerFee(burnBuyerFee)).to.revertedWith(
          "out of range"
        );
      });
      it("Cannot set fee above the fee max", async () => {
        await expect(
          fees.setBurnOwnerFee(ethers.utils.parseEther("100"))
        ).to.revertedWith("out of range");
      });
      it("Sets fee to the new value", async () => {
        const tx = await fees.setBurnOwnerFee(90000);
        expect(tx).to.emit(fees, "SetBurnOwnerFee").withArgs(90000);
        const curBurnOwnerFee = await fees.burnBuyerFee();
        expect(curBurnOwnerFee).to.equal(90000);
      });
    });
    describe("setTransferFee()", () => {
      it("Returns correct value of fee", async () => {
        const curTransferFee = await fees.transferFee();
        expect(curTransferFee).to.equal(transferFee);
      });
      it("Non-owner cannot set fee", async () => {
        await expect(fees.connect(account1).setTransferFee(1)).to.revertedWith(
          "!feesController"
        );
      });
      it("Cannot set fee to the same fee", async () => {
        await expect(fees.setTransferFee(transferFee)).to.revertedWith(
          "out of range"
        );
      });
      it("Cannot set fee above the fee max", async () => {
        await expect(
          fees.setTransferFee(ethers.utils.parseEther("100"))
        ).to.revertedWith("out of range");
      });
      it("Sets fee to the new value", async () => {
        const tx = await fees.setTransferFee(90000);
        expect(tx).to.emit(fees, "SetTransferFee").withArgs(90000);
        const curTransferFee = await fees.transferFee();
        expect(curTransferFee).to.equal(90000);
      });
    });
    describe("setInterestFee()", () => {
      it("Returns correct value of fee", async () => {
        const curInterestFee = await fees.interestFee();
        expect(curInterestFee).to.equal(interestFee);
      });
      it("Non-owner cannot set fee", async () => {
        await expect(fees.connect(account1).setInterestFee(1)).to.revertedWith(
          "!feesController"
        );
      });
      it("Cannot set fee to the same fee", async () => {
        await expect(fees.setInterestFee(interestFee)).to.revertedWith(
          "out of range"
        );
      });
      it("Cannot set fee above the fee max", async () => {
        await expect(
          fees.setInterestFee(ethers.utils.parseEther("100"))
        ).to.revertedWith("out of range");
      });
      it("Sets fee to the new value", async () => {
        const tx = await fees.setInterestFee(90000);
        expect(tx).to.emit(fees, "SetInterestFee").withArgs(90000);
        const curInterestFee = await fees.interestFee();
        expect(curInterestFee).to.equal(90000);
      });
    });
    describe("setYieldFee()", () => {
      it("Returns correct value of fee", async () => {
        const curYieldFee = await fees.yieldFee();
        expect(curYieldFee).to.equal(yieldFee);
      });
      it("Non-owner cannot set fee", async () => {
        await expect(fees.connect(account1).setYieldFee(1)).to.revertedWith(
          "!feesController"
        );
      });
      it("Cannot set fee to the same fee", async () => {
        await expect(fees.setYieldFee(yieldFee)).to.revertedWith(
          "out of range"
        );
      });
      it("Cannot set fee above the fee max", async () => {
        await expect(
          fees.setYieldFee(ethers.utils.parseEther("100"))
        ).to.revertedWith("out of range");
      });
      it("Sets fee to the new value", async () => {
        const tx = await fees.setYieldFee(90000);
        expect(tx).to.emit(fees, "SetYieldFee").withArgs(90000);
        const curYieldFee = await fees.interestFee();
        expect(curYieldFee).to.equal(90000);
      });
    });
  });
};

setup().then(() => {
  run();
});
