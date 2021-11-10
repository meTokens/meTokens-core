import { ethers, getNamedAccounts } from "hardhat";
import { deploy, getContractAt } from "../../utils/helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Signer, BigNumber } from "ethers";
import { ERC20 } from "../../../artifacts/types/ERC20";
import { impersonate, mineBlock, passOneHour } from "../../utils/hardhatNode";
import { MeToken } from "../../../artifacts/types/MeToken";
import { expect } from "chai";

describe("Hub - update RefundRatio", () => {
  // TODO: these should all be already initialized
  // let DAI: string;
  // let dai: ERC20;
  // let daiHolder: Signer;
  // let DAIWhale: string;
  // const hubId = 1;
  // const meTokenName = "Carl meToken";
  // const meTokenSymbol = "CARL";
  // const PRECISION = BigNumber.from(10).pow(6);
  // const MAX_WEIGHT = 1000000;
  // const amount = ethers.utils.parseEther("100");
  // const baseY = ethers.utils.parseEther("1").mul(1000).toString();
  // const reserveWeight = BigNumber.from(MAX_WEIGHT).div(2).toString();

  const hubIdTarget = 2;
  const refundRatioInitial = 500000;
  const refundRatioTarget = 750000;

  before(async () => {
    // TODO: pre-load contracts
    // NOTE: hub.register() should have already been called
    setup();

    // Pre-load owner and buyer w/ DAI

    // Create meToken and subscribe to Hub1

    // Register Hub2 w/ same args but different refund Ratio

    // Initialize Hub1 update to Hub2 param
  });

  describe("During warmup", () => {
    it("initUpdate() cannot be called", async () => {
      // TODO: fast fwd a little bit
    });

    it("Assets received based on initialRefundRatio", async () => {});
  });

  describe("During duration", () => {
    it("initUpdate() cannot be called", async () => {
      // TODO: fast to active duration
    });

    it("Assets received for owner based on weighted average", async () => {
      // TODO: calculate weighted refundRatio based on current time relative to duration
    });

    it("Assets received for buyer based on weighted average", async () => {});
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
