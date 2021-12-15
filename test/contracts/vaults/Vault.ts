import { ethers, getNamedAccounts } from "hardhat";
import { expect } from "chai";
import { SingleAssetVault } from "../../../artifacts/types/SingleAssetVault";
import { Foundry } from "../../../artifacts/types/Foundry";
import { Hub } from "../../../artifacts/types/Hub";
import { MeTokenFactory } from "../../../artifacts/types/MeTokenFactory";
import { MeTokenRegistry } from "../../../artifacts/types/MeTokenRegistry";
import { MigrationRegistry } from "../../../artifacts/types/MigrationRegistry";
import { WeightedAverage } from "../../../artifacts/types/WeightedAverage";
import { deploy, getContractAt } from "../../utils/helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { hubSetup } from "../../utils/hubSetup";
import { CurveRegistry } from "../../../artifacts/types/CurveRegistry";
import { BancorABDK } from "../../../artifacts/types/BancorABDK";
import { ERC20 } from "../../../artifacts/types/ERC20";
import { BigNumber, Signer } from "ethers";
import { MeToken } from "../../../artifacts/types/MeToken";
import { Fees } from "../../../artifacts/types/Fees";

describe("Vault.sol", () => {
  let token: ERC20;
  let vault: SingleAssetVault;
  let DAI: string;
  let account0: SignerWithAddress;
  let account1: SignerWithAddress;
  let account2: SignerWithAddress;
  let dao: SignerWithAddress;
  let weightedAverage: WeightedAverage;
  let migrationRegistry: MigrationRegistry;
  let foundry: Foundry;
  let hub: Hub;
  let meTokenFactory: MeTokenFactory;
  let meTokenRegistry: MeTokenRegistry;
  let curve: BancorABDK;
  let curveRegistry: CurveRegistry;
  let tokenHolder: Signer;
  let meToken: MeToken;
  let fees: Fees;
  let accruedFee: BigNumber;

  const amount = ethers.utils.parseEther("100");
  const precision = ethers.utils.parseUnits("1");
  const initRefundRatio = 50000;
  const MAX_WEIGHT = 1000000;
  const reserveWeight = MAX_WEIGHT / 2;
  const baseY = precision.div(1000);
  const hubId = 1;
  before(async () => {
    ({ DAI } = await getNamedAccounts());

    [account0, account1, account2] = await ethers.getSigners();
    dao = account0;
    weightedAverage = await deploy<WeightedAverage>("WeightedAverage");

    const encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
      ["address"],
      [DAI]
    );
    const encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint32"],
      [baseY, reserveWeight]
    );
    curve = await deploy<BancorABDK>("BancorABDK");
    ({
      token,
      tokenHolder,
      hub,
      foundry,
      account0,
      account1,
      account2,
      meTokenRegistry,
      curveRegistry,
      migrationRegistry,
      singleAssetVault: vault,
      fee: fees,
    } = await hubSetup(
      encodedCurveDetails,
      encodedVaultArgs,
      initRefundRatio,
      curve
    ));

    await token.connect(tokenHolder).transfer(account0.address, amount.mul(3));
    await token.connect(tokenHolder).transfer(account1.address, amount);
    await token.connect(tokenHolder).transfer(account2.address, amount);
  });

  describe("Check initial state", () => {
    it("check initial state", async () => {
      expect(await vault.owner()).to.be.equal(account0.address);
      expect(await vault.PRECISION()).to.be.equal(precision);
      expect(await vault.dao()).to.be.equal(dao.address);
      expect(await vault.foundry()).to.be.equal(foundry.address);
      expect(await vault.hub()).to.be.equal(hub.address);
      expect(await vault.meTokenRegistry()).to.be.equal(
        meTokenRegistry.address
      );
      expect(await vault.migrationRegistry()).to.be.equal(
        migrationRegistry.address
      );
      expect(await vault.accruedFees(DAI)).to.be.equal(0);
      expect(await vault.getAccruedFees(DAI)).to.be.equal(0);
    });
  });

  describe("approveAsset()", () => {
    it("Successfully called from meTokenRegistry", async () => {
      await token.approve(meTokenRegistry.address, amount);
      const tx = await meTokenRegistry.subscribe(
        "METOKEN",
        "MT",
        hubId,
        amount
      );
      await tx.wait();

      await expect(tx)
        .to.emit(token, "Approval")
        .withArgs(vault.address, foundry.address, amount);

      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account0.address
      );
      meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);
    });
    it("Successfully called from foundry", async () => {
      await token.approve(foundry.address, amount);
      const tx = await foundry.mint(meToken.address, amount, account1.address);
      await tx.wait();

      await expect(tx)
        .to.emit(token, "Approval")
        .withArgs(vault.address, foundry.address, amount.mul(2)); // adding up approval from subscribe
    });
    it("reverts when sender is not foundry or meTokenRegistry", async () => {
      await expect(vault.approveAsset(DAI, amount)).to.be.revertedWith(
        "!foundry||!meTokenRegistry"
      );
    });
  });

  describe("addFee()", () => {
    it("Increments accruedFees revert if not foundry", async () => {
      await expect(
        vault.connect(account1).addFee(DAI, amount)
      ).to.be.revertedWith("!foundry");
    });
    it("should be call addFee() from foundry", async () => {
      await fees.setMintFee(1e8);
      await token.approve(foundry.address, amount);
      const tx = await foundry.mint(meToken.address, amount, account1.address);
      await tx.wait();

      accruedFee = (await fees.mintFee()).mul(amount).div(precision);
      await expect(tx).to.emit(vault, "AddFee").withArgs(DAI, accruedFee);

      expect(await vault.accruedFees(DAI)).to.be.equal(accruedFee);
    });
  });

  describe("withdraw()", () => {
    it("Reverts when not called by owner", async () => {
      await expect(
        vault.connect(account1).withdraw(DAI, true, 0)
      ).to.be.revertedWith("!DAO");
    });

    it("should revert when amount is 0", async () => {
      await expect(vault.withdraw(DAI, false, 0)).to.be.revertedWith(
        "amount < 0"
      );
    });

    it("should revert when try to withdraw more than accruedFees[_asset]", async () => {
      await expect(
        vault.withdraw(DAI, false, accruedFee.add(1))
      ).to.be.revertedWith("amount > accrued fees");
    });

    it("Transfer some accrued fees", async () => {
      const amountToWithdraw = accruedFee.div(2);
      const daoBalanceBefore = await token.balanceOf(dao.address);

      const tx = await vault.withdraw(DAI, false, amountToWithdraw);
      await tx.wait();

      await expect(tx)
        .to.emit(vault, "Withdraw")
        .withArgs(DAI, amountToWithdraw);

      const daoBalanceAfter = await token.balanceOf(dao.address);
      accruedFee = accruedFee.sub(amountToWithdraw);
      expect(await vault.accruedFees(DAI)).to.be.equal(accruedFee);
      expect(daoBalanceAfter.sub(daoBalanceBefore)).to.be.equal(
        amountToWithdraw
      );
    });

    it("Transfer all remaining accrued fees", async () => {
      const amountToWithdraw = accruedFee;
      const daoBalanceBefore = await token.balanceOf(dao.address);
      const tx = await vault.withdraw(DAI, true, 0);
      await tx.wait();

      await expect(tx)
        .to.emit(vault, "Withdraw")
        .withArgs(DAI, amountToWithdraw);

      const daoBalanceAfter = await token.balanceOf(dao.address);
      accruedFee = accruedFee.sub(amountToWithdraw);
      expect(await vault.accruedFees(DAI)).to.be.equal(accruedFee);
      expect(daoBalanceAfter.sub(daoBalanceBefore)).to.be.equal(
        amountToWithdraw
      );
    });
  });
});
