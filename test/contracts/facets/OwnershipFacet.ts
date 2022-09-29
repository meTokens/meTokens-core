import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { hubSetupWithoutRegister } from "../../utils/hubSetup";
import {
  HubFacet,
  MinimalForwarder,
  Diamond,
  OwnershipFacet,
} from "../../../artifacts/types";
import { BigNumber } from "ethers";
import { deploy, getContractAt } from "../../utils/helpers";

const setup = async () => {
  describe("Ownership Facet", () => {
    let account0: SignerWithAddress;
    let account1: SignerWithAddress;
    let hub: HubFacet;
    let hubId: BigNumber;
    let diamond: Diamond;
    let forwarder: MinimalForwarder;
    let ownershipFacet: OwnershipFacet;

    before("setup", async () => {
      ({ hub, account0, account1, diamond } = await hubSetupWithoutRegister());
      forwarder = await deploy<MinimalForwarder>("MinimalForwarder");
      ownershipFacet = await getContractAt<OwnershipFacet>(
        "OwnershipFacet",
        diamond.address
      );
      hubId = await hub.count();
    });

    describe("setDiamondController", () => {
      let oldDiamondController: SignerWithAddress;
      let newDiamondController: SignerWithAddress;
      before(async () => {
        oldDiamondController = account0;
        newDiamondController = account1;
        expect(await ownershipFacet.diamondController()).to.equal(
          oldDiamondController.address
        );
      });
      it("should revert when caller is not diamond controller", async () => {
        await expect(
          ownershipFacet
            .connect(newDiamondController)
            .setDiamondController(newDiamondController.address)
        ).to.be.revertedWith("!diamondController");
      });
      it("should revert when new controller is same as old", async () => {
        await expect(
          ownershipFacet
            .connect(oldDiamondController)
            .setDiamondController(oldDiamondController.address)
        ).to.be.revertedWith("same");
      });
      it("should change diamond controller", async () => {
        await ownershipFacet
          .connect(oldDiamondController)
          .setDiamondController(newDiamondController.address);
        expect(await ownershipFacet.diamondController()).to.equal(
          newDiamondController.address
        );
      });
      after(async () => {
        //  reset diamond controller back to account0 (original)
        await ownershipFacet
          .connect(newDiamondController)
          .setDiamondController(oldDiamondController.address);
        expect(await ownershipFacet.diamondController()).to.equal(
          oldDiamondController.address
        );
      });
    });

    describe("setTrustedForwarder", () => {
      before(async () => {
        expect(await ownershipFacet.trustedForwarder()).to.equal(
          ethers.constants.AddressZero
        );
      });
      it("should revert when caller is not diamond controller", async () => {
        await expect(
          ownershipFacet
            .connect(account1)
            .setTrustedForwarder(forwarder.address)
        ).to.be.revertedWith("!diamondController");
      });
      it("should revert when new forwarder is same as old", async () => {
        await expect(
          ownershipFacet.setTrustedForwarder(ethers.constants.AddressZero)
        ).to.be.revertedWith("same");
      });
      it("should be able to set new trusted forwarder", async () => {
        await ownershipFacet.setTrustedForwarder(forwarder.address);
        expect(await ownershipFacet.trustedForwarder()).to.equal(
          forwarder.address
        );
      });
      after(async () => {
        // set back original forwarder
        await ownershipFacet.setTrustedForwarder(ethers.constants.AddressZero);
        expect(await ownershipFacet.trustedForwarder()).to.equal(
          ethers.constants.AddressZero
        );
      });
    });

    describe("setFeesController", () => {
      let oldFeeController: SignerWithAddress;
      let newFeeController: SignerWithAddress;
      before(async () => {
        oldFeeController = account0;
        newFeeController = account1;
        expect(await ownershipFacet.feesController()).to.equal(
          oldFeeController.address
        );
      });
      it("should revert when caller is not fee controller", async () => {
        await expect(
          ownershipFacet
            .connect(newFeeController)
            .setFeesController(newFeeController.address)
        ).to.be.revertedWith("!feesController");
      });
      it("should revert when new fee controller is same as old", async () => {
        await expect(
          ownershipFacet.setFeesController(oldFeeController.address)
        ).to.be.revertedWith("same");
      });
      it("should be able to set new fee controller", async () => {
        await ownershipFacet.setFeesController(newFeeController.address);
        expect(await ownershipFacet.feesController()).to.equal(
          newFeeController.address
        );
      });
      after(async () => {
        // set back original fee controller
        await ownershipFacet
          .connect(account1)
          .setFeesController(oldFeeController.address);
        expect(await ownershipFacet.feesController()).to.equal(
          oldFeeController.address
        );
      });
    });

    describe("setDurationsController", () => {
      let oldDurationController: SignerWithAddress;
      let newDurationController: SignerWithAddress;
      before(async () => {
        oldDurationController = account0;
        newDurationController = account1;
        expect(await ownershipFacet.durationsController()).to.equal(
          oldDurationController.address
        );
      });
      it("should revert when caller is not duration controller", async () => {
        await expect(
          ownershipFacet
            .connect(newDurationController)
            .setDurationsController(newDurationController.address)
        ).to.be.revertedWith("!durationsController");
      });
      it("should revert when new duration controller is same as old", async () => {
        await expect(
          ownershipFacet.setDurationsController(oldDurationController.address)
        ).to.be.revertedWith("same");
      });
      it("should be able to set new duration controller", async () => {
        await ownershipFacet.setDurationsController(
          newDurationController.address
        );
        expect(await ownershipFacet.durationsController()).to.equal(
          newDurationController.address
        );
      });
      after(async () => {
        // set back original duration controller
        await ownershipFacet
          .connect(account1)
          .setDurationsController(oldDurationController.address);
        expect(await ownershipFacet.durationsController()).to.equal(
          oldDurationController.address
        );
      });
    });

    describe("setRegisterController", () => {
      let oldRegisterController: SignerWithAddress;
      let newRegisterController: SignerWithAddress;
      before(async () => {
        oldRegisterController = account0;
        newRegisterController = account1;
        expect(await ownershipFacet.registerController()).to.equal(
          oldRegisterController.address
        );
      });
      it("should revert when caller is not register controller", async () => {
        await expect(
          ownershipFacet
            .connect(newRegisterController)
            .setRegisterController(newRegisterController.address)
        ).to.be.revertedWith("!registerController");
      });
      it("should revert when new register controller is same as old", async () => {
        await expect(
          ownershipFacet.setRegisterController(oldRegisterController.address)
        ).to.be.revertedWith("same");
      });
      it("should be able to set new register controller", async () => {
        await ownershipFacet.setRegisterController(
          newRegisterController.address
        );
        expect(await ownershipFacet.registerController()).to.equal(
          newRegisterController.address
        );
      });
      after(async () => {
        // set back original register controller
        await ownershipFacet
          .connect(account1)
          .setRegisterController(oldRegisterController.address);
        expect(await ownershipFacet.registerController()).to.equal(
          oldRegisterController.address
        );
      });
    });

    describe("setDeactivateController", () => {
      let oldRegisterController: SignerWithAddress;
      let newRegisterController: SignerWithAddress;
      before(async () => {
        oldRegisterController = account0;
        newRegisterController = account1;
        expect(await ownershipFacet.deactivateController()).to.equal(
          oldRegisterController.address
        );
      });
      it("should revert when caller is not deactivate controller", async () => {
        await expect(
          ownershipFacet
            .connect(newRegisterController)
            .setDeactivateController(newRegisterController.address)
        ).to.be.revertedWith("!deactivateController");
      });
      it("should revert when new deactivate controller is same as old", async () => {
        await expect(
          ownershipFacet.setDeactivateController(oldRegisterController.address)
        ).to.be.revertedWith("same");
      });
      it("should be able to set new deactivate controller", async () => {
        await ownershipFacet.setDeactivateController(
          newRegisterController.address
        );
        expect(await ownershipFacet.deactivateController()).to.equal(
          newRegisterController.address
        );
      });
      after(async () => {
        // set back original deactivate controller
        await ownershipFacet
          .connect(account1)
          .setDeactivateController(oldRegisterController.address);
        expect(await ownershipFacet.deactivateController()).to.equal(
          oldRegisterController.address
        );
      });
    });
  });
};

setup().then(() => {
  run();
});
