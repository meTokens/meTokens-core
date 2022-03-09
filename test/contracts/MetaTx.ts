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
  ICurve,
  MeToken,
  MeTokenRegistryFacet,
  SingleAssetVault,
  Diamond,
  OwnershipFacet,
} from "../../artifacts/types";

const setup = async () => {
  describe("Meta Transactions", () => {
    let account0: SignerWithAddress;
    let account1: SignerWithAddress;
    let account2: SignerWithAddress;
    let curve: ICurve;
    let hub: HubFacet;
    let hubId: BigNumber;
    let singleAssetVault: SingleAssetVault;
    let encodedVaultDAIArgs: string;
    let encodedCurveInfo: string;
    let token: ERC20;
    let diamond: Diamond;
    let forwarder: MinimalForwarder;
    let foundry: FoundryFacet;
    let domain: TypedDataDomain;
    let ownershipFacet: OwnershipFacet;
    let refundRatio: number;
    let meTokenRegistry: MeTokenRegistryFacet;
    let DAI: string;
    let DAIWhale: string;
    let meToken: MeToken;
    const ForwardRequest = [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "gas", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "data", type: "bytes" },
    ];
    before("setup", async () => {
      ({ DAI, DAIWhale } = await getNamedAccounts());
      encodedVaultDAIArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [DAI]
      );
      const PRECISION = ethers.utils.parseEther("1");
      const MAX_WEIGHT = 1000000;
      const reserveWeight = MAX_WEIGHT / 2;
      const baseY = PRECISION.div(1000);
      encodedCurveInfo = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint32"],
        [baseY, reserveWeight]
      );

      ({
        hub,
        curve,
        singleAssetVault,
        account0,
        account1,
        account2,
        diamond,
        meTokenRegistry,
        foundry,
      } = await hubSetupWithoutRegister("BancorCurve"));
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
        DAI,
        singleAssetVault.address,
        curve.address,
        refundRatio,
        encodedCurveInfo,
        encodedVaultDAIArgs
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
        gas: gasLimit.toNumber() * 2,
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
          DAI,
          singleAssetVault.address,
          curve.address,
          refundRatio,
          encodedCurveInfo,
          encodedVaultDAIArgs
        );
      expect(await forwarder.getNonce(message.from)).to.equal(1);
    });
    it("should revert if trying to register a hub with a non controller account", async () => {
      const { data } = await hub.populateTransaction.register(
        account0.address,
        DAI,
        singleAssetVault.address,
        curve.address,
        refundRatio,
        encodedCurveInfo,
        encodedVaultDAIArgs
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
        gas: gasLimit.toNumber() * 2,
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
          DAI,
          0,
          name,
          symbol,
          hubId
        );
      expect(await forwarder.getNonce(message.from)).to.equal(1);
    });
    it("should mint", async () => {
      const amount = ethers.utils.parseEther("20");
      const res = await transferFromWhale(account1.address, DAI, DAIWhale);
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
