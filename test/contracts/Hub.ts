import { ethers } from "hardhat";
import { Hub } from "../../artifacts/types/Hub";

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
    it("Cannot be called if all values are the same", async () => {});
    it("Can be called a first time", async () => {
      // TODO: call initUpdate()
    });

    it("Cannot be called during warmup, duration, and cooldown", async () => {
      // TODO: fast fwd to warmup, duration, cooldown and try expect
      // calling initUpdate() to revert
    });

    it("Sets target values to values if finishUpdate() never after from first update", async () => {});

    it("Can be called a second time after cooldown", async () => {
      // TODO: fast fwd to after cooldown and call initUpdate()
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
});
