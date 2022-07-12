import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { hubSetupWithoutRegister } from "../../utils/hubSetup";
import { FeesFacet } from "../../../artifacts/types";

const setup = async () => {
  describe("FeesFacet.sol", () => {
    let fees: FeesFacet;

    const mintFee = 10000000;
    const burnBuyerFee = 10000000;
    const burnOwnerFee = 10000000;
    let account1: SignerWithAddress;
    before(async () => {
      ({ fee: fees, account1 } = await hubSetupWithoutRegister([
        mintFee,
        burnBuyerFee,
        burnOwnerFee,
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
  });
};

setup().then(() => {
  run();
});
