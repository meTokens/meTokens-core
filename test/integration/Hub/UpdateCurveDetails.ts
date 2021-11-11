import { ethers, getNamedAccounts } from "hardhat";
import { deploy, getContractAt } from "../../utils/helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Signer, BigNumber } from "ethers";
import { impersonate, mineBlock, passOneHour } from "../../utils/hardhatNode";
import { expect } from "chai";

describe("Hub - update CurveDetails", () => {
  const hubIdTarget = 2;
  let encodedCurveDetailsTarget: string;

  before(async () => {
    setup();
  });

  describe("During warmup", () => {
    it("initUpdate() cannot be called", async () => {
      // TODO: fast fwd a little bit
    });

    it("Assets received based on initial curveDetails", async () => {});
  });

  describe("During duration", () => {
    it("initUpdate() cannot be called", async () => {
      // TODO: fast fwd to active duration
    });

    it("mint(): assets received based on weighted average", async () => {});

    it("burn(): assets received for owner based on weighted average", async () => {
      // TODO: calculate weighted curveDetails based on current time relative to duration
    });

    it("burn(): assets received for buyer based on weighted average", async () => {});
  });

  describe("During cooldown", () => {
    it("initUpdate() cannot be called", async () => {
      // TODO: fast fwd to active cooldown
    });

    it("Before refundRatio set, burn() should use the targetRefundRatio", async () => {});

    it("Call finishUpdate() and update refundRatio to targetRefundRatio", async () => {});
  });

  describe("After cooldown", () => {
    it("initUpdate() can be called again", async () => {
      // TODO: fast fwd to after cooldown
    });

    it("If no burns during cooldown, initUpdate() first calls finishUpdate()", async () => {});

    it("If no burns during cooldown, initUpdate() args are compared to new vals set from on finishUpdate()", async () => {});
  });
});
