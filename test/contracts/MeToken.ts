import { expect } from "chai";
import { ethers, getNamedAccounts } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { hubSetup } from "../utils/hubSetup";
import { getContractAt } from "../utils/helpers";
import { MeTokenRegistryFacet, MeToken } from "../../artifacts/types";
import { StringifyOptions } from "querystring";
import { BigNumber } from "ethers";
import { TypedDataDomain } from "@ethersproject/abstract-signer";

const { domainSeparator } = require("../utils/eip712");

const setup = async () => {
  let DAI: string;
  let account0: SignerWithAddress;
  let account1: SignerWithAddress;
  let meTokenRegistry: MeTokenRegistryFacet;
  let meToken: MeToken;
  let encodedVaultArgs: string;
  let chainId: number;
  const initRefundRatio = 50000;
  const PRECISION = ethers.utils.parseEther("1");
  const MAX_WEIGHT = 1000000;
  const reserveWeight = MAX_WEIGHT / 2;
  const baseY = PRECISION.div(1000);
  const name = "TestMetoken";
  const symbol = "TMT";
  const version = "1";

  describe("MeToken", () => {
    before(async () => {
      ({ DAI } = await getNamedAccounts());
      encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [DAI]
      );

      ({ account0, account1, meTokenRegistry } = await hubSetup(
        baseY,
        reserveWeight,
        encodedVaultArgs,
        initRefundRatio
      ));

      await meTokenRegistry.connect(account0).subscribe(name, symbol, 1, 0);
      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account0.address
      );

      meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);
      chainId = await (await meToken.getChainId()).toNumber();
    });

    it("Check correct initialize", async () => {
      expect(await meToken.name()).to.equal(name);
      expect(await meToken.symbol()).to.equal(symbol);
      expect(await meToken.decimals()).to.equal(18);
      expect(await meToken.totalSupply()).to.equal(0);
    });

    it("mint() should revert when sender is not diamond", async () => {
      await expect(meToken.mint(account0.address, 1)).to.be.revertedWith(
        "!authorized"
      );
    });
    it("burn() should revert when sender is not diamond", async () => {
      await expect(
        meToken["burn(address,uint256)"](account0.address, 1)
      ).to.be.revertedWith("!authorized");
    });
    it("initial nonce is 0", async function () {
      expect(await meToken.nonces(account0.address)).to.equal(0);
    });

    it("domain separator", async function () {
      expect(await meToken.DOMAIN_SEPARATOR()).to.equal(
        await domainSeparator(name, version, chainId, meToken.address)
      );
    });

    describe("permit", function () {
      const value = 42;
      const nonce = 0;
      let deadline = ethers.constants.MaxUint256;
      let spender: string;
      let owner: string;
      const Permit = [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ];
      let domain: TypedDataDomain;
      let message: Record<string, any>;
      before(async () => {
        [account0, account1] = await ethers.getSigners();
        owner = account0.address;
        spender = account1.address;

        domain = {
          name,
          version,
          chainId,
          verifyingContract: meToken.address,
        };
        message = { owner, spender, value, nonce, deadline };
      });
      it("accepts owner signature", async function () {
        const signature = await account0._signTypedData(
          domain,
          { Permit },
          message
        );
        const { v, r, s } = ethers.utils.splitSignature(signature);

        const receipt = await meToken.permit(
          owner,
          spender,
          value,
          deadline,
          v,
          r,
          s
        );

        expect(await meToken.nonces(owner)).to.equal(1);
        expect(await meToken.allowance(owner, spender)).to.equal(value);
      });

      it("rejects reused signature", async function () {
        const signature = await account0._signTypedData(
          domain,
          { Permit },
          message
        );
        const { v, r, s } = ethers.utils.splitSignature(signature);

        await expect(
          meToken.permit(owner, spender, value, deadline, v, r, s)
        ).to.be.revertedWith("ERC20Permit: invalid signature");
      });

      it("rejects other signature", async function () {
        const signature = await account1._signTypedData(
          domain,
          { Permit },
          message
        );
        const { v, r, s } = ethers.utils.splitSignature(signature);

        await expect(
          meToken.permit(owner, spender, value, deadline, v, r, s)
        ).to.be.revertedWith("ERC20Permit: invalid signature");
      });

      it("rejects expired permit", async function () {
        deadline = BigNumber.from(
          (await ethers.provider.getBlock("latest")).timestamp
        );
        message = { owner, spender, value, nonce, deadline };
        const signature = await account0._signTypedData(
          domain,
          { Permit },
          message
        );
        const { v, r, s } = ethers.utils.splitSignature(signature);

        await expect(
          meToken.permit(owner, spender, value, deadline, v, r, s)
        ).to.be.revertedWith("ERC20Permit: expired deadline");
      });
    });
  });
};

setup().then(() => {
  run();
});
