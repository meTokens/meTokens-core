import { ethers } from "hardhat";
import { Hub } from "../../artifacts/types/Hub";
import { Foundry } from "../../artifacts/types/Foundry";
import { CurveRegistry } from "../../artifacts/types/CurveRegistry";
import { VaultRegistry } from "../../artifacts/types/VaultRegistry";

/*
const paginationFactory = await ethers.getContractFactory("Pagination", {});
const paginationLib = await paginationFactory.deploy();

const policyFactory = await ethers.getContractFactory("PolicyLib", {
  libraries: {
    Pagination: paginationLib.address,
  },
});
*/

describe("Hub.sol", () => {
  before(async () => {});

  describe("register()", () => {
    it("Should revert from invalid address arguments", async () => {
      // TODO
    });
    it("Should revert from invalid encodedCurveDetails", async () => {
      // TODO
    });
    it("Should revert from invalid encodedVaultArgs", async () => {
      // TODO
    });
  });

  describe("initUpdate()", () => {
    it("Fails when nothing to update", async () => {
      // TODO: Hub to check
    });

    it("fails on ICurve.initReconfigure() from invalid encodedCurveDetails", async () => {});

    it("fails on ICurve.register() from invalid encodedCurveDetails", async () => {});

    it("", async () => {
      // TODO: call initUpdate()
    });

    it("Cannot be called during warmup, duration, and cooldown", async () => {
      // TODO: fast fwd to warmup, duration, cooldown and use expect() for each
      // calling initUpdate() to revert
    });

    it("Sets target values to values if finishUpdate() never after from first update", async () => {});

    it("Can be called a second time after cooldown", async () => {
      // TODO: fast fwd to after cooldown and call initUpdate()
    });
  });

  describe("cancelUpdate()", () => {
    it("Cannot be called by non-owner", async () => {
      // TODO
    });
    it("Can only be called when updating and during the warmup period", async () => {
      // TODO
    });
    it("Correctly cancels a hub update and resets hub struct update values", async () => {
      // TODO
    });
  });

  describe("finishUpdate()", () => {
    it("Should revert if all arguments are the same", async () => {
      // TODO
    });
    it("Doesn't trigger during warmup or duration", async () => {
      // TODO
    });

    it("Trigger once when mint() called during cooldown", async () => {
      // TODO
    });

    it("Trigger once when burn() called during cooldown", async () => {
      // TODO
    });

    it("Trigger once when mint() called if no mint() / burn() called during cooldown", async () => {
      // TODO
    });

    it("Trigger once when burn() called if no mint() / burn() called during cooldown", async () => {
      // TODO
    });

    it("Correctly set HubDetails when called during cooldown", async () => {
      // TODO
    });
    it("Correctly set HubDetails when called after cooldown", async () => {
      // TODO
    });
    it("Correctly set HubDetails when called during second initUpdate()", async () => {
      // TODO
    });
  });

  describe("transferHubOwnership()", () => {
    it("Cannot be called by non-owner", async () => {
      // TODO
    });
    it("Cannot be set to the current owner", async () => {
      // TODO
    });
    it("Successfully transfers hub ownership", async () => {
      // TODO
    });
  });
});
