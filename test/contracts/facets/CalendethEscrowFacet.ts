import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Signer } from "ethers";
import { ethers, getNamedAccounts } from "hardhat";
import {
  CalendethEscrowFacet,
  ERC20,
  FoundryFacet,
  MeToken,
  MeTokenRegistryFacet,
  SingleAssetVault,
} from "../../../artifacts/types";
import { mineBlock } from "../../utils/hardhatNode";
import { getContractAt } from "../../utils/helpers";
import { hubSetup } from "../../utils/hubSetup";

const setup = async () => {
  describe("CalendethEscrowFacet", () => {
    let ceContract: CalendethEscrowFacet;
    let meTokenRegistry: MeTokenRegistryFacet;
    let account0MeToken: MeToken;
    let account1MeToken: MeToken;
    let account0: SignerWithAddress;
    let account1: SignerWithAddress;
    let account2: SignerWithAddress;

    const inviterClaimWaiting = 3 * 24 * 60 * 60; // 3 days
    const account0PerMinuteFee = ethers.utils.parseEther("0.01");
    const meetingTimestamp = new Date().getTime() + 24 * 60 * 60;
    const minutes = 30;

    before(async () => {
      const MAX_WEIGHT = 1000000;
      const reserveWeight = MAX_WEIGHT / 2;
      const baseY = ethers.utils.parseEther("1").div(1000);
      const { DAI } = await getNamedAccounts();
      const encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [DAI]
      );
      const initRefundRatio = 50000;
      const max = ethers.constants.MaxUint256;

      let token: ERC20;
      let whale: Signer;
      let singleAssetVault: SingleAssetVault;
      let foundry: FoundryFacet;

      ({
        token,
        whale,
        account0,
        account1,
        account2,
        meTokenRegistry,
        singleAssetVault,
        calendethEscrow: ceContract,
        foundry,
      } = await hubSetup(
        baseY,
        reserveWeight,
        encodedVaultArgs,
        initRefundRatio
      ));

      await token
        .connect(whale)
        .transfer(account0.address, ethers.utils.parseEther("10"));
      await token
        .connect(whale)
        .transfer(account1.address, ethers.utils.parseEther("10"));

      await token.connect(account0).approve(singleAssetVault.address, max);
      await token.connect(account1).approve(singleAssetVault.address, max);

      await meTokenRegistry.connect(account0).subscribe("Test", "Test", 1, 0);
      await meTokenRegistry.connect(account1).subscribe("Test", "Test", 1, 0);

      account0MeToken = await getContractAt<MeToken>(
        "MeToken",
        await meTokenRegistry.getOwnerMeToken(account0.address)
      );
      account1MeToken = await getContractAt<MeToken>(
        "MeToken",
        await meTokenRegistry.getOwnerMeToken(account1.address)
      );

      await foundry.mint(
        account0MeToken.address,
        ethers.utils.parseEther("1"),
        account1.address
      );
      await foundry.mint(
        account1MeToken.address,
        ethers.utils.parseEther("1"),
        account0.address
      );
    });

    it("should have initialized correctly", async () => {
      expect(await ceContract.inviterClaimWaiting()).to.be.equal(
        inviterClaimWaiting
      );
      expect(await ceContract.meetingCounter()).to.be.equal(0);
    });

    describe("setScheduleFee()", () => {
      it("should revert if sender is not metoken owner", async () => {
        await expect(
          ceContract.connect(account2).setScheduleFee(account0PerMinuteFee)
        ).to.be.revertedWith("not a metoken owner");
      });

      it("should be able to set schedule fee", async () => {
        expect(await ceContract.scheduleFee(account0.address)).to.equal(0);

        const tx = await ceContract.setScheduleFee(account0PerMinuteFee);

        await expect(tx)
          .to.emit(ceContract, "SetScheduleFee")
          .withArgs(account0PerMinuteFee);
        expect(await ceContract.scheduleFee(account0.address)).to.equal(
          account0PerMinuteFee
        );
      });
    });

    describe("scheduleMeeting()", () => {
      before(async () => {
        const meetingDetails = await ceContract.meetings(1);
        expect(meetingDetails._claim).to.equal(false);
        expect(meetingDetails._inviter).to.equal(ethers.constants.AddressZero);
        expect(meetingDetails._meHolder).to.equal(ethers.constants.AddressZero);
        expect(meetingDetails._timestamp).to.equal(0);
        expect(meetingDetails._totalFee).to.equal(0);
      });
      it("should revert to schedule meeting when transferFrom fails", async () => {
        const invitee = account0.address;
        const minutes = 30;

        const tx = ceContract
          .connect(account1)
          .scheduleMeeting(invitee, minutes, meetingTimestamp);

        await expect(tx).to.revertedWith("ERC20: insufficient allowance");
      });
      it("should be able to schedule meeting with schedule cost > 0", async () => {
        const invitee = account0.address;
        const expectedMeetingCounter = 1;
        const expectedTotalFee = account0PerMinuteFee.mul(minutes);

        // approve to escrow
        await account0MeToken
          .connect(account1)
          .approve(ceContract.address, expectedTotalFee);

        const oldCEA0MTBalance = await account0MeToken.balanceOf(
          ceContract.address
        );
        const oldA1A0MTBalance = await account0MeToken.balanceOf(
          account1.address
        );

        const tx = await ceContract
          .connect(account1)
          .scheduleMeeting(invitee, minutes, meetingTimestamp);

        await expect(tx)
          .to.emit(ceContract, "ScheduleMeeting")
          .withArgs(
            account1.address,
            invitee,
            expectedMeetingCounter,
            minutes,
            expectedTotalFee
          );

        await expect(tx)
          .to.emit(account0MeToken, "Transfer")
          .withArgs(account1.address, ceContract.address, expectedTotalFee);

        const newCEA0MTBalance = await account0MeToken.balanceOf(
          ceContract.address
        );
        const newA1A0MTBalance = await account0MeToken.balanceOf(
          account1.address
        );
        const meetingDetails = await ceContract.meetings(1);

        expect(newCEA0MTBalance.sub(oldCEA0MTBalance))
          .to.equal(oldA1A0MTBalance.sub(newA1A0MTBalance))
          .to.equal(expectedTotalFee);
        expect(meetingDetails._claim).to.equal(false);
        expect(meetingDetails._inviter).to.equal(account1.address);
        expect(meetingDetails._meHolder).to.equal(account0.address);
        expect(meetingDetails._timestamp).to.equal(meetingTimestamp);
        expect(meetingDetails._totalFee).to.equal(expectedTotalFee);
        expect(await ceContract.meetingCounter()).to.be.equal(1);
      });
      it("should be able to schedule meeting when schedule cost is 0", async () => {
        const invitee = account1.address;
        const expectedMeetingCounter = 2;
        const minutes = 30;
        const expectedTotalFee = 0;

        const oldCEA1MTBalance = await account1MeToken.balanceOf(
          ceContract.address
        );
        const oldA0A1MTBalance = await account1MeToken.balanceOf(
          account0.address
        );

        const tx = await ceContract
          .connect(account0)
          .scheduleMeeting(invitee, minutes, meetingTimestamp);

        await expect(tx).to.not.emit(account1MeToken, "Transfer");

        await expect(tx)
          .to.emit(ceContract, "ScheduleMeeting")
          .withArgs(
            account0.address,
            invitee,
            expectedMeetingCounter,
            minutes,
            expectedTotalFee
          );

        const newCEA1MTBalance = await account1MeToken.balanceOf(
          ceContract.address
        );
        const newA0A1MTBalance = await account1MeToken.balanceOf(
          account0.address
        );
        const meetingDetails = await ceContract.meetings(2);

        expect(newCEA1MTBalance.sub(oldCEA1MTBalance))
          .to.equal(oldA0A1MTBalance.sub(newA0A1MTBalance))
          .to.equal(expectedTotalFee);
        expect(meetingDetails._claim).to.equal(false);
        expect(meetingDetails._inviter).to.equal(account0.address);
        expect(meetingDetails._meHolder).to.equal(invitee);
        expect(meetingDetails._timestamp).to.equal(meetingTimestamp);
        expect(meetingDetails._totalFee).to.equal(expectedTotalFee);
        expect(await ceContract.meetingCounter()).to.be.equal(2);
      });
    });

    describe("noShowClaim", () => {
      let meetingId = 2;
      it("should revert with not called with invitee", async () => {
        const tx = ceContract.connect(account0).noShowClaim(meetingId);
        await expect(tx).to.be.revertedWith("only invitee");
      });
      it("should revert when timestamp < meeting start timestamp", async () => {
        const tx = ceContract.connect(account1).noShowClaim(meetingId);
        await expect(tx).to.be.revertedWith("too soon");
      });
      it("should be able to claim no show", async () => {
        await mineBlock(meetingTimestamp + 1);
        const tx = await ceContract.connect(account1).noShowClaim(meetingId);

        await expect(tx).to.emit(ceContract, "Claim").withArgs(meetingId, true);

        const meetingDetails = await ceContract.meetings(meetingId);
        expect(meetingDetails._claim).to.equal(true);
        expect(meetingDetails._inviter).to.equal(account0.address);
        expect(meetingDetails._meHolder).to.equal(account1.address);
        expect(meetingDetails._timestamp).to.equal(meetingTimestamp);
        expect(meetingDetails._totalFee).to.equal(0);
      });
      it("should revert with already claimed", async () => {
        let tx = ceContract.connect(account1).noShowClaim(meetingId);
        await expect(tx).to.be.revertedWith("already claimed");
        tx = ceContract.connect(account0).inviterClaim(meetingId);
        await expect(tx).to.be.revertedWith("already claimed");
      });
    });

    describe("inviterClaim", () => {
      let meetingId = 1;
      it("should revert with not called with inviter", async () => {
        const tx = ceContract.connect(account0).inviterClaim(meetingId);
        await expect(tx).to.be.revertedWith("only inviter");
      });
      it("should revert when timestamp < (meeting start timestamp + inviterClaimWaiting)", async () => {
        const tx = ceContract.connect(account1).inviterClaim(meetingId);
        await expect(tx).to.be.revertedWith("too soon");
      });
      it("should be able to inviter claim", async () => {
        await mineBlock(meetingTimestamp + inviterClaimWaiting + 1);
        const tx = await ceContract.connect(account1).inviterClaim(meetingId);

        await expect(tx)
          .to.emit(ceContract, "Claim")
          .withArgs(meetingId, false);

        const meetingDetails = await ceContract.meetings(meetingId);
        expect(meetingDetails._claim).to.equal(true);
      });
      it("should revert with already claimed", async () => {
        let tx = ceContract.connect(account1).inviterClaim(meetingId);
        await expect(tx).to.be.revertedWith("already claimed");
        tx = ceContract.connect(account1).inviterClaim(meetingId);
        await expect(tx).to.be.revertedWith("already claimed");
      });
    });
  });
};

setup().then(() => {
  run();
});
