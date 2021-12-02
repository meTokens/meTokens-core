import { ethers, getNamedAccounts } from "hardhat";
import { MeTokenRegistry } from "../../../artifacts/types/MeTokenRegistry";
import { BancorZeroCurve } from "../../../artifacts/types/BancorZeroCurve";
import { MeToken } from "../../../artifacts/types/MeToken";
import { Hub } from "../../../artifacts/types/Hub";
import { ERC20 } from "../../../artifacts/types/ERC20";
import {
  calculateTokenReturnedFromZero,
  deploy,
  getContractAt,
  toETHNumber,
} from "../../utils/helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { hubSetup } from "../../utils/hubSetup";
import { BigNumber } from "ethers";
import { expect } from "chai";

describe("MeTokenRegistry.sol", () => {
  let meTokenRegistry: MeTokenRegistry;

  let hub: Hub;
  let token: ERC20;
  let account0: SignerWithAddress;
  let account1: SignerWithAddress;
  let account2: SignerWithAddress;
  let account3: SignerWithAddress;

  const hubId = 1;
  const MAX_WEIGHT = 1000000;
  const PRECISION = BigNumber.from(10).pow(18);
  const reserveWeight = MAX_WEIGHT / 2;
  const baseY = PRECISION.div(1000);
  before(async () => {
    let DAI;
    ({ DAI } = await getNamedAccounts());

    const encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint32"],
      [baseY, reserveWeight]
    );
    const encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
      ["address"],
      [DAI]
    );
    const bancorZeroCurve = await deploy<BancorZeroCurve>("BancorZeroCurve");
    ({ token, hub, account0, account1, account2, account3, meTokenRegistry } =
      await hubSetup(
        encodedCurveDetails,
        encodedVaultArgs,
        50000,
        bancorZeroCurve
      ));
  });

  describe("register()", () => {
    it("User can create a meToken with no collateral", async () => {
      const name = "Carl0 meToken";
      const symbol = "CARL";

      const tx = await meTokenRegistry
        .connect(account0)
        .subscribe(name, "CARL", hubId, 0);
      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account0.address
      );
      /*  expect(tx)
        .to.emit(meTokenRegistry, "Register")
        .withArgs(meTokenAddr, account0.address, name, symbol, hubId); */

      // assert token infos
      const meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);
      expect(await meToken.name()).to.equal(name);
      expect(await meToken.symbol()).to.equal(symbol);
      expect(await meToken.decimals()).to.equal(18);
      expect(await meToken.totalSupply()).to.equal(0);
    });
    it("User can't create two meToken", async () => {
      const name = "Carl0 meToken";
      const symbol = "CARL";
      await expect(
        meTokenRegistry.connect(account0).subscribe(name, "CARL", hubId, 0)
      ).to.be.revertedWith("msg.sender already owns a meToken");
    });

    it("User can create a meToken with 100 DAI as collateral", async () => {
      const amount = ethers.utils.parseEther("20");
      const balBefore = await token.balanceOf(account1.address);
      // need an approve of metoken registry first
      await token.connect(account1).approve(meTokenRegistry.address, amount);
      await meTokenRegistry
        .connect(account1)
        .subscribe("Carl1 meToken", "CARL", hubId, amount);
      const balAfter = await token.balanceOf(account1.address);
      expect(balBefore.sub(balAfter)).equal(amount);
      const hubDetail = await hub.getDetails(hubId);
      const balVault = await token.balanceOf(hubDetail.vault);
      expect(balVault).equal(amount);
      // assert token infos
      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account1.address
      );
      const meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);
      // should be greater than 0

      const calculatedRes = calculateTokenReturnedFromZero(
        20,
        toETHNumber(baseY),
        reserveWeight / MAX_WEIGHT
      );
      console.log(`    calculatedRes:${calculatedRes}`);
      expect(toETHNumber(await meToken.totalSupply())).to.equal(calculatedRes);
    });
  });

  describe("transferMeTokenOwnership()", () => {
    it("Fails if not a meToken owner", async () => {
      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account1.address
      );
      await expect(
        meTokenRegistry
          .connect(account3)
          .transferMeTokenOwnership(account2.address)
      ).to.revertedWith("meToken does not exist");
    });
    it("Fails if recipient already owns a meToken", async () => {
      await expect(
        meTokenRegistry.transferMeTokenOwnership(account1.address)
      ).to.revertedWith("_newOwner already owns a meToken");
    });
    it("Fails if _newOwner is address(0)", async () => {
      // TODO
    });
    it("Successfully queues a recipient to claim ownership", async () => {
      // TODO
    });
    it("Emits TransferOwnership()", async () => {
      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account1.address
      );
      const tx = await meTokenRegistry
        .connect(account1)
        .transferMeTokenOwnership(account2.address);

      /*    await expect(tx)
        .to.emit(meTokenRegistry, "TransferOwnership")
        .withArgs(account1.address, account2.address, meTokenAddr); */
    });
  });

  describe("cancelTransferMeTokenOwnership()", () => {
    it("Fails if owner has never called transferMeTokenOwnership()", async () => {
      // TODO
    });
    it("Fails if owner does not own a meToken", async () => {
      // TODO
    });
    it("Succesfully cancels transfer and removes from _pendingOwners", async () => {
      // TODO
    });
  });

  describe("claimMeTokenOwnership()", () => {
    it("Fails if claimer already owns a meToken", async () => {
      // TODO
    });
    it("Fails if not claimer not pending owner from oldOwner", async () => {
      // TODO
    });
    it("Successfully completes transfer, updates meToken struct, and deletes old mappings", async () => {
      // TODO
    });
    it("Emits ClaimMeTokenOwnership()", async () => {
      // TODO
    });
  });

  describe("isOwner()", () => {
    it("Returns false for address(0)", async () => {
      expect(await meTokenRegistry.isOwner(ethers.constants.AddressZero)).to.be
        .false;
    });
    it("Returns true for a meToken issuer", async () => {
      expect(await meTokenRegistry.isOwner(account1.address)).to.be.true;
    });
  });
  describe("balancePool", () => {
    it("Fails if not foundry", async () => {
      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account1.address
      );
      await expect(
        meTokenRegistry.updateBalancePooled(true, meTokenAddr, account2.address)
      ).to.revertedWith("!foundry");
    });
    it("updateBalancePooled()", async () => {
      //  const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
      //   account2.address
      // );
      // const tx = meTokenRegistry
      //   .connect(account2)
      //   .incrementBalancePooled(true, meTokenAddr, account2.address);
    });

    it("updateBalanceLocked()", async () => {});
  });
});
