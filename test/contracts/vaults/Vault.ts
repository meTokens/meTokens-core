import { ethers, getNamedAccounts } from "hardhat";
import { BigNumber, ContractTransaction, Signer } from "ethers";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { getContractAt } from "../../utils/helpers";
import { hubSetup } from "../../utils/hubSetup";
import {
  Diamond,
  FoundryFacet,
  MeTokenRegistryFacet,
  FeesFacet,
  ERC20,
  MeToken,
  SingleAssetVault,
} from "../../../artifacts/types";

const setup = async () => {
  describe("Vault.sol", () => {
    let token: ERC20;
    let vault: SingleAssetVault;
    let DAI: string;
    let account0: SignerWithAddress;
    let account1: SignerWithAddress;
    let account2: SignerWithAddress;
    let dao: SignerWithAddress;
    let diamond: Diamond;
    let foundry: FoundryFacet;
    let meTokenRegistry: MeTokenRegistryFacet;
    let whale: Signer;
    let meToken: MeToken;
    let fees: FeesFacet;
    let accruedFee: BigNumber;
    let tx: ContractTransaction;

    const precision = ethers.utils.parseUnits("1");
    const initRefundRatio = 50000;
    const MAX_WEIGHT = 1000000;
    const reserveWeight = MAX_WEIGHT / 2;
    const baseY = precision.div(1000);
    const hubId = 1;
    const tokenDepositedInETH = 10;
    const tokenDeposited = ethers.utils.parseEther(
      tokenDepositedInETH.toString()
    );
    before(async () => {
      ({ DAI } = await getNamedAccounts());

      [account0, account1, account2] = await ethers.getSigners();
      dao = account0;

      const encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [DAI]
      );
      ({
        token,
        diamond,
        foundry,
        whale,
        account0,
        account1,
        account2,
        meTokenRegistry,
        singleAssetVault: vault,
        fee: fees,
      } = await hubSetup(
        baseY,
        reserveWeight,
        encodedVaultArgs,
        initRefundRatio
      ));

      await fees.setMintFee(1e8);
      await fees.setBurnOwnerFee(1e8);

      await token
        .connect(whale)
        .transfer(account0.address, tokenDeposited.mul(3));
      await token.connect(whale).transfer(account1.address, tokenDeposited);
      await token.connect(whale).transfer(account2.address, tokenDeposited);

      await token.approve(vault.address, ethers.constants.MaxUint256);
      const tx = await meTokenRegistry.subscribe("METOKEN", "MT", hubId, 0);
      await tx.wait();

      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account0.address
      );
      meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);
    });

    describe("Check initial state", () => {
      it("check initial state", async () => {
        expect(await vault.PRECISION()).to.be.equal(precision);
        expect(await vault.owner()).to.be.equal(dao.address);
        expect(await vault.diamond()).to.be.equal(diamond.address);
        expect(await vault.feeRecipient()).to.be.equal(dao.address);
        expect(await vault.accruedFees(DAI)).to.be.equal(0);
      });
    });

    describe("isValid", () => {
      it("should return true for inValid in all normal vaults", async () => {
        expect(await vault.isValid("0x")).to.equal(true);
      });
    });

    describe("handleDeposit()", () => {
      it("Reverts when not called by diamond", async () => {
        await expect(
          vault.handleDeposit(account0.address, token.address, 1, 1)
        ).to.be.revertedWith("!diamond");
      });
      it("Transfer asset from recipient to vault", async () => {
        const accountTokenBefore = await token.balanceOf(account0.address);
        const vaultTokenBefore = await token.balanceOf(vault.address);

        tx = await foundry.mint(
          meToken.address,
          tokenDeposited,
          account0.address
        );
        await tx.wait();

        const accountTokenAfter = await token.balanceOf(account0.address);
        const vaultTokenAfter = await token.balanceOf(vault.address);

        accruedFee = (await fees.mintFee()).mul(tokenDeposited).div(precision);

        expect(accountTokenBefore.sub(accountTokenAfter)).to.equal(
          tokenDeposited
        );
        expect(vaultTokenAfter.sub(vaultTokenBefore)).to.equal(tokenDeposited);
      });
      it("Increments accruedFees", async () => {
        expect(await vault.accruedFees(token.address)).to.equal(accruedFee);
      });
      it("Emits HandleDeposit()", async () => {
        await expect(tx)
          .to.emit(vault, "HandleDeposit")
          .withArgs(
            account0.address,
            token.address,
            tokenDeposited,
            accruedFee
          );
      });
    });

    describe("handleWithdrawal()", () => {
      let burnFee: BigNumber;
      it("Reverts when not called by diamond", async () => {
        await expect(
          vault.handleWithdrawal(account0.address, token.address, 1, 1)
        ).to.be.revertedWith("!diamond");
      });
      it("Transfer asset from vault to recipient", async () => {
        const accountTokenBefore = await token.balanceOf(account0.address);
        const vaultTokenBefore = await token.balanceOf(vault.address);

        tx = await foundry.burn(
          meToken.address,
          await meToken.totalSupply(),
          account0.address
        );
        await tx.wait();

        const accountTokenAfter = await token.balanceOf(account0.address);
        const vaultTokenAfter = await token.balanceOf(vault.address);
        burnFee = (await fees.burnOwnerFee())
          .mul(tokenDeposited.sub(accruedFee))
          .div(precision);

        expect(accountTokenAfter.sub(accountTokenBefore)).to.equal(
          tokenDeposited.sub(accruedFee).sub(burnFee)
        );
        expect(vaultTokenBefore.sub(vaultTokenAfter)).to.equal(
          tokenDeposited.sub(accruedFee).sub(burnFee)
        );
        accruedFee = accruedFee.add(burnFee);
      });
      it("Increments accruedFees", async () => {
        expect(await vault.accruedFees(token.address)).to.equal(accruedFee);
      });
      it("Emits HandleWithdrawal()", async () => {
        await expect(tx)
          .to.emit(vault, "HandleWithdrawal")
          .withArgs(
            account0.address,
            token.address,
            tokenDeposited.sub(accruedFee),
            burnFee
          );
      });
    });

    describe("claim()", () => {
      before(async () => {
        const tx = await vault.claim(DAI, true, 0);
        await tx.wait();
      });
      it("should revert when not called by owner", async () => {
        await expect(
          vault.connect(account1).claim(DAI, true, 0)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("should revert when amount is 0", async () => {
        await expect(vault.claim(DAI, false, 0)).to.be.revertedWith(
          "amount < 0"
        );
      });

      it("should revert when try to claim more than accruedFees[_asset]", async () => {
        await foundry.mint(meToken.address, tokenDeposited, account1.address);
        accruedFee = (await fees.mintFee()).mul(tokenDeposited).div(precision);

        await expect(
          vault.claim(DAI, false, accruedFee.add(1))
        ).to.be.revertedWith("amount > accrued fees");
      });

      it("Transfer some accrued fees", async () => {
        const amountToClaim = accruedFee.div(2);
        const daoBalanceBefore = await token.balanceOf(dao.address);

        const tx = await vault.claim(DAI, false, amountToClaim);
        await tx.wait();

        await expect(tx)
          .to.emit(vault, "Claim")
          .withArgs(dao.address, DAI, amountToClaim);

        const daoBalanceAfter = await token.balanceOf(dao.address);
        accruedFee = accruedFee.sub(amountToClaim);
        expect(await vault.accruedFees(DAI)).to.be.equal(accruedFee);
        expect(daoBalanceAfter.sub(daoBalanceBefore)).to.be.equal(
          amountToClaim
        );
      });

      it("Transfer all remaining accrued fees", async () => {
        const amountToClaim = accruedFee;
        const daoBalanceBefore = await token.balanceOf(dao.address);
        const tx = await vault.claim(DAI, true, 0);
        await tx.wait();

        await expect(tx)
          .to.emit(vault, "Claim")
          .withArgs(dao.address, DAI, amountToClaim);

        const daoBalanceAfter = await token.balanceOf(dao.address);
        accruedFee = accruedFee.sub(amountToClaim);
        expect(await vault.accruedFees(DAI)).to.be.equal(accruedFee);
        expect(daoBalanceAfter.sub(daoBalanceBefore)).to.be.equal(
          amountToClaim
        );
      });
    });

    describe("setFeeRecipient()", () => {
      it("should revert when not called by owner", async () => {
        await expect(
          vault.connect(account1).setFeeRecipient(account1.address)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });
      it("should revert if set to address(0)", async () => {
        await expect(
          vault.setFeeRecipient(ethers.constants.AddressZero)
        ).to.be.revertedWith("address(0)");
      });
      it("should revert if set to the same address as before", async () => {
        await expect(vault.setFeeRecipient(dao.address)).to.be.revertedWith(
          "Same address"
        );
      });
      it("should succeed in changing fee recipient", async () => {
        const tx = await vault.setFeeRecipient(account1.address);
        await tx.wait();
        await expect(tx)
          .to.emit(vault, "SetFeeRecipient")
          .withArgs(account1.address);
        expect(await vault.feeRecipient()).to.be.equal(account1.address);
      });
    });

    describe("Negative tests", () => {
      it("should revert startMigration() when sender is not migration", async () => {
        await expect(vault.startMigration(meToken.address)).to.be.revertedWith(
          "!migration"
        );
      });
    });
  });
};

setup().then(() => {
  run();
});
