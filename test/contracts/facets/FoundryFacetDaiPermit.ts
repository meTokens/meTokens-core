import { ethers, getNamedAccounts, network } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Signer, BigNumber } from "ethers";
import { expect } from "chai";
import { getContractAt } from "../../utils/helpers";
import { hubSetup } from "../../utils/hubSetup";
import {
  FoundryFacet,
  MeTokenRegistryFacet,
  MeToken,
  ERC20,
  SingleAssetVault,
  IERC20Permit,
} from "../../../artifacts/types";
import { TypedDataDomain } from "@ethersproject/abstract-signer";
import { domainSeparator } from "../../utils/eip712";

const setup = async () => {
  describe("FoundryFacet.sol - DAI Permit", () => {
    let DAI: string;
    let dai: ERC20;
    let account0: SignerWithAddress;
    let meTokenRegistry: MeTokenRegistryFacet;
    let foundry: FoundryFacet;
    let token: ERC20;
    let meToken: MeToken;
    let whale: Signer;
    let singleAssetVault: SingleAssetVault;
    let encodedVaultArgs: string;
    const hubId = 1;
    const name = "Carl meToken";
    const symbol = "CARL";
    const initRefundRatio = 50000;
    const PRECISION = ethers.utils.parseEther("1");
    const amount = ethers.utils.parseEther("100");

    const MAX_WEIGHT = 1000000;
    const reserveWeight = MAX_WEIGHT / 2;
    const baseY = PRECISION.div(1000);

    let domain: TypedDataDomain;
    let message: Record<string, any>;

    // for 1 DAI we get 1000 metokens
    // const baseY = ethers.utils.parseEther("1").mul(1000).toString();
    // weight at 50% linear curve
    // const reserveWeight = BigNumber.from(MAX_WEIGHT).div(2).toString();
    let snapshotId: any;
    before(async () => {
      snapshotId = await network.provider.send("evm_snapshot");
      ({ DAI } = await getNamedAccounts());
      encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [DAI]
      );
      ({ token, whale, foundry, singleAssetVault, meTokenRegistry, account0 } =
        await hubSetup(
          baseY,
          reserveWeight,
          encodedVaultArgs,
          initRefundRatio
        ));

      // Prefund owner/buyer w/ DAI
      dai = token;

      await dai.connect(whale).transfer(account0.address, amount);

      // account0 registers a meToken to DAI
      await meTokenRegistry.connect(account0).subscribe(name, symbol, hubId, 0);
      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account0.address
      );

      meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);
    });

    it("mint with permitting DAI", async () => {
      /* Signature building */
      // @DEV This is different than the EIP compliant permit scheme.
      const Permit = [
        { name: "holder", type: "address" },
        { name: "spender", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "expiry", type: "uint256" },
        { name: "allowed", type: "bool" },
      ];

      domain = {
        name: "Dai Stablecoin",
        version: "1",
        chainId: "1",
        verifyingContract: dai.address,
      };
      const daiPermit = await getContractAt<IERC20Permit>(
        "IERC20Permit",
        dai.address
      );
      expect(await daiPermit.DOMAIN_SEPARATOR()).to.equal(
        await domainSeparator(
          domain.name ?? "",
          domain.version ?? "",
          domain.chainId?.toString() ?? "1",
          dai.address
        )
      );
      const nonce = await daiPermit.nonces(account0.address);
      const expiry = 0;

      message = {
        holder: account0.address,
        spender: singleAssetVault.address,
        nonce: nonce.toNumber(),
        expiry: expiry,
        allowed: true,
      };

      const signature = await account0._signTypedData(
        domain,
        { Permit },
        message
      );
      const { v, r, s } = ethers.utils.splitSignature(signature);

      /* state checks */
      const supplyBefore = await meToken.totalSupply();
      const daiBalOwner = await dai.balanceOf(account0.address);
      const daiBalVault = await dai.balanceOf(singleAssetVault.address);

      await foundry
        .connect(account0)
        .mintWithPermit(
          meToken.address,
          amount,
          account0.address,
          expiry,
          v,
          r,
          s
        );

      /* state checks  */
      const daiBalOwnerAfter = await dai.balanceOf(account0.address);
      const daiBalVaultAfter = await dai.balanceOf(singleAssetVault.address);
      expect(await meToken.totalSupply()).to.be.gt(supplyBefore);
      expect(daiBalOwnerAfter).equal(daiBalOwner.sub(amount));
      expect(daiBalVaultAfter).equal(daiBalVault.add(amount));
    });
  });
};

setup().then(() => {
  run();
});
