import { BigNumber } from "ethers";
import { expect } from "chai";
import { ethers, getNamedAccounts } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { TypedDataDomain } from "@ethersproject/abstract-signer";
import { deploy, getContractAt } from "../utils/helpers";
import { hubSetupWithoutRegister, transferFromWhale } from "../utils/hubSetup";
import {
  HubFacet,
  MinimalForwarder,
  ERC20,
  FoundryFacet,
  ICurveFacet,
  MeToken,
  MeTokenRegistryFacet,
  SingleAssetVault,
  Diamond,
  OwnershipFacet,
} from "../../artifacts/types";
import { impersonate } from "../utils/hardhatNode";

const setup = async () => {
  describe("Meta Transactions", () => {
    let account0: SignerWithAddress;
    let account1: SignerWithAddress;
    let account2: SignerWithAddress;
    let curve: ICurveFacet;
    let hub: HubFacet;
    let hubId: BigNumber;
    let singleAssetVault: SingleAssetVault;
    let encodedVaultUSDCArgs: string;
    let baseY: BigNumber;
    let amount: BigNumber;
    let reserveWeight: number;
    let token: ERC20;
    let diamond: Diamond;
    let forwarder: MinimalForwarder;
    let foundry: FoundryFacet;
    let domain: TypedDataDomain;
    let domainUSDC: TypedDataDomain;
    let ownershipFacet: OwnershipFacet;
    let refundRatio: number;
    let meTokenRegistry: MeTokenRegistryFacet;
    let USDC: string;
    let USDCWhale: string;
    let usdc: ERC20;
    let meToken: MeToken;
    const ForwardRequest = [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "gas", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "data", type: "bytes" },
    ];
    const Permit = [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ];
    before("setup", async () => {
      ({ USDC, USDCWhale } = await getNamedAccounts());

      encodedVaultUSDCArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [USDC]
      );
      const PRECISION = ethers.utils.parseEther("1");
      const MAX_WEIGHT = 1000000;
      reserveWeight = MAX_WEIGHT / 2;
      baseY = PRECISION.div(1000);
      amount = ethers.utils.parseUnits("20", 6);

      ({
        hub,
        singleAssetVault,
        account0,
        account1,
        account2,
        diamond,
        meTokenRegistry,
        curve,
        foundry,
      } = await hubSetupWithoutRegister());

      // usdc = await getContractAt<ERC20>("ERC20", USDC);
      // const usdcWhale = await impersonate(USDCWhale);
      // await usdc.connect(usdcWhale).transfer(account2.address, amount);

      forwarder = await deploy<MinimalForwarder>("MinimalForwarder");
      ownershipFacet = await getContractAt<OwnershipFacet>(
        "OwnershipFacet",
        diamond.address
      );

      await ownershipFacet.setTrustedForwarder(forwarder.address);
      let { chainId } = await ethers.provider.getNetwork();
      refundRatio = 500000;
      domain = {
        name: "MinimalForwarder",
        version: "0.0.1",
        chainId,
        verifyingContract: forwarder.address,
      };
      hubId = await hub.count();
    });
    it("should register a hub", async () => {
      const { data } = await hub.populateTransaction.register(
        account0.address,
        USDC,
        singleAssetVault.address,
        refundRatio,
        baseY,
        reserveWeight,
        encodedVaultUSDCArgs
      );

      if (!data) {
        throw Error("No data");
      }
      const gasLimit = await ethers.provider.estimateGas({
        to: hub.address,
        from: account0.address,
        data,
      });
      const message = {
        from: account0.address,
        to: hub.address,
        value: 0,
        gas: gasLimit.toNumber() * 10,
        nonce: 0,
        data,
      };
      const nonce = await forwarder.getNonce(message.from);
      expect(nonce).to.equal(0);
      const signature = await account0._signTypedData(
        domain,
        { ForwardRequest },
        message
      );
      const verifiedAddress = ethers.utils.verifyTypedData(
        domain,
        { ForwardRequest },
        message,
        signature
      );
      const verifiedFromContract = await forwarder.verify(message, signature);

      expect(verifiedFromContract).to.equal(true);

      expect(verifiedAddress).to.equal(account0.address);

      // @ts-ignore
      const tx = await forwarder.connect(account2).execute(message, signature);
      const hubCount = (await hub.count()).toNumber();
      expect(hubCount).to.equal(hubId.toNumber() + 1);
      hubId = hubId.add(1);
      await expect(tx)
        .to.emit(hub, "Register")
        .withArgs(
          hubCount,
          account0.address,
          USDC,
          singleAssetVault.address,
          refundRatio,
          baseY,
          reserveWeight,
          encodedVaultUSDCArgs
        );
      expect(await forwarder.getNonce(message.from)).to.equal(1);
    });
    it("should revert if trying to register a hub with a non controller account", async () => {
      const { data } = await hub.populateTransaction.register(
        account0.address,
        USDC,
        singleAssetVault.address,
        refundRatio,
        baseY,
        reserveWeight,
        encodedVaultUSDCArgs
      );
      if (!data) {
        throw Error("No data");
      }
      const gasLimit = await ethers.provider.estimateGas({
        to: hub.address,
        from: account0.address,
        data,
      });

      const message = {
        from: account0.address,
        to: hub.address,
        value: 0,
        gas: gasLimit.toNumber() * 10,
        nonce: 1,
        data,
      };
      const nonce = await forwarder.getNonce(message.from);
      expect(nonce).to.equal(1);

      const signature = await account1._signTypedData(
        domain,
        { ForwardRequest },
        message
      );
      const verifiedFromContract = await forwarder.verify(message, signature);
      expect(verifiedFromContract).to.equal(false);

      // @ts-ignore
      await expect(
        forwarder.connect(account2).execute(message, signature)
      ).to.revertedWith("MinimalForwarder: signature does not match request");

      expect(await forwarder.getNonce(message.from)).to.equal(1);
    });
    it("should subscribe", async () => {
      const name = "TOP TOKEN";
      const symbol = "TOP";
      const { data } = await meTokenRegistry.populateTransaction.subscribe(
        name,
        symbol,
        hubId,
        0
      );
      if (!data) {
        throw Error("No data");
      }
      const gasLimit = await ethers.provider.estimateGas({
        to: meTokenRegistry.address,
        from: account1.address,
        data,
      });
      const message = {
        from: account1.address,
        to: hub.address,
        value: 0,
        gas: gasLimit.toNumber() * 10,
        nonce: 0,
        data,
      };
      const nonce = await forwarder.getNonce(message.from);
      expect(nonce).to.equal(0);

      const signature = await account1._signTypedData(
        domain,
        { ForwardRequest },
        message
      );
      const verifiedAddress = ethers.utils.verifyTypedData(
        domain,
        { ForwardRequest },
        message,
        signature
      );
      const verifiedFromContract = await forwarder.verify(message, signature);

      expect(verifiedFromContract).to.equal(true);

      expect(verifiedAddress).to.equal(account1.address);

      // @ts-ignore
      const tx = await forwarder.connect(account2).execute(message, signature);
      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account1.address
      );
      meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);
      expect(await meToken.totalSupply()).to.equal(0);
      await expect(tx)
        .to.emit(meTokenRegistry, "Subscribe")
        .withArgs(
          meTokenAddr,
          account1.address,
          0,
          USDC,
          0,
          name,
          symbol,
          hubId
        );
      expect(await forwarder.getNonce(message.from)).to.equal(1);
    });

    it("should subscribeWithPermit()", async () => {
      /*
      BUILDING THE PERMIT SIGNATURE
      */
      const domainUSDC = {
        name: "USD Coin",
        version: "2",
        chainId: "1",
        verifyingContract: USDC,
      };
      const permitMsg = {
        owner: account2.address,
        spender: singleAssetVault.address,
        value: amount,
        nonce: 0,
        deadline: ethers.constants.MaxUint256,
      };

      const permitSig = await account2._signTypedData(
        domainUSDC,
        { Permit },
        permitMsg
      );
      const { v, r, s } = ethers.utils.splitSignature(permitSig);

      /*
      BUILDING THE TX
      */

      const name = "TOP TOKEN";
      const symbol = "TOP";
      const { data } =
        await meTokenRegistry.populateTransaction.subscribeWithPermit(
          name,
          symbol,
          hubId,
          amount,
          ethers.constants.MaxUint256,
          v,
          r,
          s
        );
      if (!data) {
        throw Error("No data");
      }
      // const gasLimit = await ethers.provider.estimateGas({
      //   to: meTokenRegistry.address,
      //   from: account2.address,
      //   data,
      // });
      const message = {
        from: account2.address,
        to: hub.address,
        value: 0,
        gas: 3000000,
        nonce: 0,
        data,
      };
      const nonce = await forwarder.getNonce(message.from);
      expect(nonce).to.equal(0);

      const signature = await account2._signTypedData(
        domain,
        { ForwardRequest },
        message
      );
      const verifiedAddress = ethers.utils.verifyTypedData(
        domain,
        { ForwardRequest },
        message,
        signature
      );
      const verifiedFromContract = await forwarder.verify(message, signature);

      expect(verifiedFromContract).to.equal(true);

      expect(verifiedAddress).to.equal(account2.address);

      // @ts-ignore
      console.log("made it to execute");
      const tx = await forwarder.connect(account1).execute(message, signature);
      const receipt = await tx.wait();
      console.log("made it past execute!");
      console.log(receipt);
      console.log(receipt.events);
      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account2.address
      );
      console.log(meTokenAddr);
      // const meToken2 = await getContractAt<MeToken>("MeToken", meTokenAddr);
      // const meTokensMinted = await meToken2.totalSupply();
      // expect(meTokensMinted).to.be.gt(0);
      await expect(tx)
        .to.emit(meTokenRegistry, "Subscribe")
        .withArgs(
          meTokenAddr,
          account2.address,
          0,
          USDC,
          amount,
          name,
          symbol,
          hubId
        );
      expect(await forwarder.getNonce(message.from)).to.equal(1);
    });

    it("should mint", async () => {
      const amount = ethers.utils.parseUnits("20", 6);
      const res = await transferFromWhale(account1.address, USDC, USDCWhale);
      token = res.token;
      await token.connect(account1).approve(singleAssetVault.address, amount);

      const { data } = await foundry.populateTransaction.mint(
        meToken.address,
        amount,
        account0.address
      );
      if (!data) {
        throw Error("No data");
      }
      const gasLimit = await ethers.provider.estimateGas({
        to: foundry.address,
        from: account1.address,
        data,
      });
      const message = {
        from: account1.address,
        to: foundry.address,
        value: 0,
        gas: gasLimit.toNumber() * 10,
        nonce: 1,
        data,
      };
      const nonce = await forwarder.getNonce(message.from);
      expect(nonce).to.equal(1);

      const signature = await account1._signTypedData(
        domain,
        { ForwardRequest },
        message
      );
      const verifiedAddress = ethers.utils.verifyTypedData(
        domain,
        { ForwardRequest },
        message,
        signature
      );
      const verifiedFromContract = await forwarder.verify(message, signature);

      expect(verifiedFromContract).to.equal(true);

      expect(verifiedAddress).to.equal(account1.address);

      // @ts-ignore
      const tx = await forwarder.connect(account2).execute(message, signature);
      expect(await meToken.totalSupply()).to.be.gt(0);
      await expect(tx).to.emit(foundry, "Mint");

      expect(await forwarder.getNonce(message.from)).to.equal(2);
    });
    it("should burn", async () => {
      const amount = await meToken.balanceOf(account0.address);
      const daiBalanceBeforeBurn = await token.balanceOf(account0.address);

      const { data } = await foundry.populateTransaction.burn(
        meToken.address,
        amount,
        account0.address
      );
      if (!data) {
        throw Error("No data");
      }
      const gasLimit = await ethers.provider.estimateGas({
        to: foundry.address,
        from: account0.address,
        data,
      });
      const message = {
        from: account0.address,
        to: foundry.address,
        value: 0,
        gas: gasLimit.toNumber() * 10,
        nonce: 1,
        data,
      };
      const nonce = await forwarder.getNonce(message.from);
      expect(nonce).to.equal(1);

      const signature = await account0._signTypedData(
        domain,
        { ForwardRequest },
        message
      );
      const verifiedAddress = ethers.utils.verifyTypedData(
        domain,
        { ForwardRequest },
        message,
        signature
      );
      const verifiedFromContract = await forwarder.verify(message, signature);

      expect(verifiedFromContract).to.equal(true);

      expect(verifiedAddress).to.equal(account0.address);

      // @ts-ignore
      const tx = await forwarder.connect(account2).execute(message, signature);
      expect(await meToken.totalSupply()).to.equal(0);

      await expect(tx).to.emit(foundry, "Burn");
      const daiBalanceBeforeAfter = await token.balanceOf(account0.address);
      expect(daiBalanceBeforeAfter.sub(daiBalanceBeforeBurn)).to.equal(
        ethers.utils.parseEther("10")
      );
      expect(await forwarder.getNonce(message.from)).to.equal(2);
    });
  });
};
setup().then(() => {
  run();
});
