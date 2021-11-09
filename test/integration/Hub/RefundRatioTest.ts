import { ethers, getNamedAccounts } from "hardhat";
import { Foundry } from "../../../artifacts/types/Foundry";
import { Hub } from "../../../artifacts/types/Hub";
import { deploy, getContractAt } from "../../utils/helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Signer, BigNumber } from "ethers";
import { ERC20 } from "../../../artifacts/types/ERC20";
import { MeTokenRegistry } from "../../../artifacts/types/MeTokenRegistry";
import { impersonate, mineBlock, passOneHour } from "../../utils/hardhatNode";
import { MeToken } from "../../../artifacts/types/MeToken";
import { expect } from "chai";

describe("Hub - update RefundRatio", () => {
  let DAI: string;
  let dai: ERC20;
  let daiHolder: Signer;
  let DAIWhale: string;
  let meTokenRegistry: MeTokenRegistry;
  let foundry: Foundry;
  let meToken: MeToken;
  let hub: Hub;
  let account0: SignerWithAddress;
  let account1: SignerWithAddress;
  let account2: SignerWithAddress;

  const hubId = 1;
  const name = "Carl0 meToken";
  const symbol = "CARL";
  const PRECISION = BigNumber.from(10).pow(6);
  const MAX_WEIGHT = 1000000;
  const amount = ethers.utils.parseEther("100");
  const initRefundRatio = 500000;
  const targetRefundRatio = 750000;

  // for 1 DAI we get 1000 metokens
  const baseY = ethers.utils.parseEther("1").mul(1000).toString();
  // weight at 50% linear curve
  const reserveWeight = BigNumber.from(MAX_WEIGHT).div(2).toString();

  before(async () => {
    ({ DAI, DAIWhale } = await getNamedAccounts());
    [account0, account1, account2] = await ethers.getSigners();
    dai = await getContractAt<ERC20>("ERC20", DAI);
    daiHolder = await impersonate(DAIWhale);
    await dai.approve(DAIWhale, amount);
    dai.connect(daiHolder).transfer(account0.address, amount);
    dai
      .connect(daiHolder)
      .transfer(account1.address, ethers.utils.parseEther("1000"));
    dai
      .connect(daiHolder)
      .transfer(account2.address, ethers.utils.parseEther("1000"));

    // register a metoken
    await dai.approve(foundry.address, amount);
    const tx = await meTokenRegistry
      .connect(account0)
      .subscribe(name, symbol, hubId, 0);

    // assert token infos
    const meTokenAddr = await meTokenRegistry.getOwnerMeToken(account0.address);
    meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);

    await hub.initUpdate(
      hubId,
      ethers.constants.AddressZero,
      targetRefundRatio,
      ethers.utils.toUtf8Bytes("")
    );
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

    it("Assets received for owner based on weighted average", async () => {});

    it("Assets received for buyer based on weighted average", async () => {});
  });

  describe("During cooldown", () => {
    it("initUpdate() cannot be called", async () => {
      // TODO: fast fwd to active cooldown
    });

    it("Before refundRatio set, burn() should use the targetRefundRatio", async () => {});

    it("Should update refundRatio to targetRefundRatio", async () => {});
  });

  describe("After cooldown", () => {
    it("initUpdate() can be called again", async () => {
      // TODO: fast fwd to after cooldown
    });

    it("If no burns during cooldown, new targetRefundRatio cannot equal hub.targetRefundRatio", async () => {});

    it("If no burns during cooldown, set refundRatio to old targetRefundRatio", async () => {});
  });
});
