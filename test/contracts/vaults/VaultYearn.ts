import { ethers, getNamedAccounts } from "hardhat";
import { BigNumber, ContractTransaction, Signer } from "ethers";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { getContractAt, toETHNumber } from "../../utils/helpers";
import { hubSetup, transferFromWhale } from "../../utils/hubSetup";
import {
  Diamond,
  FoundryFacet,
  MeTokenRegistryFacet,
  FeesFacet,
  ERC20,
  MeToken,
  SingleAssetVault,
  VaultAPI,
  IERC20,
  HubFacet,
} from "../../../artifacts/types";
import { after } from "mocha";
import { resetFork } from "../../utils/hardhatNode";

//const setup = async () => {
describe("Vault with Yearn Token", () => {
  let yDAItoken: ERC20;
  let vault: SingleAssetVault;
  let DAI: string;
  let YDAI: string;
  let YDAIWhale: string;
  let DAIWhale: string;
  let account0: SignerWithAddress;
  let account1: SignerWithAddress;
  let account2: SignerWithAddress;
  let dao: SignerWithAddress;
  let diamond: Diamond;
  let foundry: FoundryFacet;
  let meTokenRegistry: MeTokenRegistryFacet;
  let tokenHolder: Signer;
  let meToken: MeToken;
  let fees: FeesFacet;
  let accruedFee: BigNumber;
  let tx: ContractTransaction;
  let initialPricePerShare: BigNumber;
  let pricePerShare: BigNumber;
  let yDaiVault: VaultAPI;
  let daiToken: IERC20;
  let hub: HubFacet;
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
    ({ DAI, DAIWhale, YDAI, YDAIWhale } = await getNamedAccounts());

    [account0, account1, account2] = await ethers.getSigners();
    dao = account0;

    const encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
      ["address"],
      [YDAI]
    );
    ({
      token: yDAItoken,
      diamond,
      foundry,
      whale: tokenHolder,
      account0,
      account1,
      account2,
      meTokenRegistry,
      singleAssetVault: vault,
      fee: fees,
      hub,
    } = await hubSetup(
      baseY,
      reserveWeight,
      encodedVaultArgs,
      initRefundRatio,
      undefined,
      YDAI,
      YDAIWhale
    ));

    await fees.setMintFee(1e8);
    await fees.setBurnOwnerFee(1e8);
    daiToken = await getContractAt<IERC20>("IERC20", DAI);
    await yDAItoken
      .connect(tokenHolder)
      .transfer(account0.address, tokenDeposited.mul(3));
    await yDAItoken
      .connect(tokenHolder)
      .transfer(account1.address, tokenDeposited);
    await yDAItoken
      .connect(tokenHolder)
      .transfer(account2.address, tokenDeposited);

    await yDAItoken.approve(
      meTokenRegistry.address,
      ethers.constants.MaxUint256
    );
    await yDAItoken.approve(vault.address, ethers.constants.MaxUint256);
    const tx = await meTokenRegistry.subscribe("METOKEN", "MT", hubId, 0);
    await tx.wait();

    const meTokenAddr = await meTokenRegistry.getOwnerMeToken(account0.address);
    meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);

    //withdraw

    yDaiVault = await getContractAt<VaultAPI>("VaultAPI", YDAI);

    initialPricePerShare = await yDaiVault.pricePerShare();
  });
  it("price per share should increase", async () => {
    //  const whaleDaiBal = await daiToken.balanceOf(YDAIWhale);
  });
  it("metoken issuer should benefits from price per share increase", async () => {
    expect(await vault.PRECISION()).to.be.equal(precision);
    expect(await vault.owner()).to.be.equal(dao.address);
    expect(await vault.diamond()).to.be.equal(diamond.address);
    expect(await vault.accruedFees(YDAI)).to.be.equal(0);
  });

  describe("handleDeposit()", () => {
    it("Reverts when not called by diamond", async () => {
      await expect(
        vault.handleDeposit(account0.address, yDAItoken.address, 1, 1)
      ).to.be.revertedWith("!diamond");
    });
    it("Transfer asset from recipient to vault", async () => {
      const accountTokenBefore = await yDAItoken.balanceOf(account0.address);
      const vaultTokenBefore = await yDAItoken.balanceOf(vault.address);

      tx = await foundry.mint(
        meToken.address,
        tokenDeposited,
        account0.address
      );
      await tx.wait();
      const ownerMetokenBalance = await meToken.balanceOf(account0.address);
      expect(ownerMetokenBalance).to.be.gt(0);

      const accountTokenAfter = await yDAItoken.balanceOf(account0.address);
      const vaultTokenAfter = await yDAItoken.balanceOf(vault.address);

      accruedFee = (await fees.mintFee()).mul(tokenDeposited).div(precision);

      expect(accountTokenBefore.sub(accountTokenAfter)).to.equal(
        tokenDeposited
      );
      expect(vaultTokenAfter.sub(vaultTokenBefore)).to.equal(tokenDeposited);
      // artificially increase price per share

      // transfer all whale dai to the yearn yDai vault
      const res = await transferFromWhale(yDaiVault.address, DAI, DAIWhale);
      const yVaultDaiBalBefore = await daiToken.balanceOf(yDaiVault.address);
      const whaleBal = (await res.token.balanceOf(DAIWhale)).div(2);
      await res.token.connect(res.whale).transfer(yDaiVault.address, whaleBal);
      const yVaultDaiBalAfter = await daiToken.balanceOf(yDaiVault.address);
      expect(yVaultDaiBalAfter).to.equal(yVaultDaiBalBefore.add(whaleBal));

      pricePerShare = await yDaiVault.pricePerShare();
      expect(pricePerShare).to.be.gt(initialPricePerShare);
    });
    it("Increments accruedFees", async () => {
      expect(await vault.accruedFees(yDAItoken.address)).to.equal(accruedFee);
    });
    it("Emits HandleDeposit()", async () => {
      await expect(tx)
        .to.emit(vault, "HandleDeposit")
        .withArgs(
          account0.address,
          yDAItoken.address,
          tokenDeposited,
          accruedFee
        );
    });
  });

  describe("handleWithdrawal()", () => {
    let burnFee: BigNumber;
    it("Reverts when not called by diamond", async () => {
      await expect(
        vault.handleWithdrawal(account0.address, yDAItoken.address, 1, 1)
      ).to.be.revertedWith("!diamond");
    });
    it("Transfer asset from vault to recipient", async () => {
      const accountTokenBefore = await yDAItoken.balanceOf(account0.address);
      const vaultTokenBefore = await yDAItoken.balanceOf(vault.address);

      tx = await foundry.burn(
        meToken.address,
        await meToken.totalSupply(),
        account0.address
      );
      await tx.wait();

      const accountTokenAfter = await yDAItoken.balanceOf(account0.address);
      const vaultTokenAfter = await yDAItoken.balanceOf(vault.address);
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

      // user can withdraw
      const accDaiBalBefore = await daiToken.balanceOf(account0.address);

      const withdrawAmount = accountTokenAfter.sub(tokenDeposited);
      await yDaiVault["withdraw(uint256)"](withdrawAmount);
      const accDaiBalAfter = await daiToken.balanceOf(account0.address);

      const daiWithdraw = toETHNumber(accDaiBalAfter.sub(accDaiBalBefore));

      const initPrice = toETHNumber(initialPricePerShare);
      const price = toETHNumber(pricePerShare);
      const percentageIncrease = price / initPrice;

      expect(daiWithdraw).to.be.approximately(
        toETHNumber(withdrawAmount) * percentageIncrease,
        toETHNumber(precision)
      );
    });
    it("Increments accruedFees", async () => {
      expect(await vault.accruedFees(yDAItoken.address)).to.equal(accruedFee);
    });
    it("Emits HandleWithdrawal()", async () => {
      await expect(tx)
        .to.emit(vault, "HandleWithdrawal")
        .withArgs(
          account0.address,
          yDAItoken.address,
          tokenDeposited.sub(accruedFee),
          burnFee
        );
    });
  });

  describe("claim()", () => {
    before(async () => {
      const tx = await vault.claim(YDAI, true, 0);
      await tx.wait();
    });
    it("Reverts when not called by owner", async () => {
      await expect(
        vault.connect(account1).claim(YDAI, true, 0)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should revert when amount is 0", async () => {
      await expect(vault.claim(YDAI, false, 0)).to.be.revertedWith(
        "amount < 0"
      );
    });

    it("should revert when try to claim more than accruedFees[_asset]", async () => {
      await foundry.mint(meToken.address, tokenDeposited, account1.address);
      accruedFee = (await fees.mintFee()).mul(tokenDeposited).div(precision);

      await expect(
        vault.claim(YDAI, false, accruedFee.add(1))
      ).to.be.revertedWith("amount > accrued fees");
    });

    it("Transfer some accrued fees", async () => {
      const amountToClaim = accruedFee.div(2);
      const daoBalanceBefore = await yDAItoken.balanceOf(dao.address);

      const tx = await vault.claim(YDAI, false, amountToClaim);
      await tx.wait();

      await expect(tx)
        .to.emit(vault, "Claim")
        .withArgs(dao.address, YDAI, amountToClaim);

      const daoBalanceAfter = await yDAItoken.balanceOf(dao.address);
      accruedFee = accruedFee.sub(amountToClaim);
      expect(await vault.accruedFees(YDAI)).to.be.equal(accruedFee);
      expect(daoBalanceAfter.sub(daoBalanceBefore)).to.be.equal(amountToClaim);
    });

    it("Transfer all remaining accrued fees", async () => {
      const amountToClaim = accruedFee;
      const daoBalanceBefore = await yDAItoken.balanceOf(dao.address);
      const tx = await vault.claim(YDAI, true, 0);
      await tx.wait();

      await expect(tx)
        .to.emit(vault, "Claim")
        .withArgs(dao.address, YDAI, amountToClaim);

      const daoBalanceAfter = await yDAItoken.balanceOf(dao.address);
      accruedFee = accruedFee.sub(amountToClaim);
      expect(await vault.accruedFees(YDAI)).to.be.equal(accruedFee);
      expect(daoBalanceAfter.sub(daoBalanceBefore)).to.be.equal(amountToClaim);
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
//};

/* setup().then(() => {
  run();
}); */
