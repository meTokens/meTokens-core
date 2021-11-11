import { ethers, getNamedAccounts } from "hardhat";
import { expect } from "chai";

describe("Hub - update CurveDetails", () => {
  const hubIdTarget = 2;
  let encodedCurveDetailsTarget: string;

  before(async () => {
    setupHub();
  });

  describe("Warmup", () => {
    it("Assets received based on initial curveDetails", async () => {});
  });

  describe("Duration", () => {
    it("mint(): assets received based on weighted average", async () => {});

    it("burn(): assets received for owner based on weighted average", async () => {
      // TODO: calculate weighted curveDetails based on current time relative to duration
    });

    it("burn(): assets received for buyer based on weighted average", async () => {});
  });

  describe("Cooldown", () => {
    it("Before refundRatio set, burn() should use the targetRefundRatio", async () => {});

    it("Call finishUpdate() and update refundRatio to targetRefundRatio", async () => {});
  });

  describe("Hub not", () => {
    it("If no burns during cooldown, initUpdate() first calls finishUpdate()", async () => {});

    it("If no burns during cooldown, initUpdate() args are compared to new vals set from on finishUpdate()", async () => {});
  });
});
