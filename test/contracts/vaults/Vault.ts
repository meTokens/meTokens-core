import { ethers, getNamedAccounts } from "hardhat";
import { expect } from "chai";
import { SingleAssetVault } from "../../../artifacts/types/SingleAssetVault";
import { impersonate } from "../../utils/hardhatNode";
import { ERC20 } from "../../../artifacts/types/ERC20";
import { deploy, getContractAt } from "../../utils/helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Signer } from "ethers";

describe("Vault.sol", () => {
  let DAI: string;
  let dai: ERC20;
  let DAIWhale: string;
  let daiHolder: Signer;
  let account0: SignerWithAddress;
  let account1: SignerWithAddress;
  let vault: SingleAssetVault;
  const amount = 3;

  before(async () => {
    [account0, account1] = await ethers.getSigners();
    ({ DAI, DAIWhale } = await getNamedAccounts());
    dai = await getContractAt<ERC20>("ERC20", DAI);
    daiHolder = await impersonate(DAIWhale);
    dai
      .connect(daiHolder)
      .transfer(account1.address, ethers.utils.parseEther("1000"));
    // vault = await deploy<SingleAssetVault>("SingleAssetVault");
  });

  describe("addFee()", () => {
    it("Increments accruedFees by amount", async () => {
      // const accruedFeesBefore = await vault.accruedFees(DAI);
      // await vault.addFee(DAI, amount);
      // const accruedFeesAfter = await vault.accruedFees(DAI);
      // expect(Number(accruedFeesBefore)).to.equal(
      //   Number(accruedFeesAfter) - amount
      // );
    });

    it("Emits AddFee(asset, amount)", async () => {
      // expect(await vault.addFee(DAI, amount))
      //   .to.emit(vault, "AddFee")
      //   .withArgs(DAI, amount);
    });
  });

  describe("withdrawFees()", () => {
    it("Reverts when not called by owner", async () => {
      // TODO
    });

    it("Transfer some accrued fees", async () => {
      // TODO
    });

    it("Transfer all remaining accrued fees", async () => {
      // TODO
    });
  });
});
