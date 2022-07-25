import { ethers, getNamedAccounts } from "hardhat";
import { BigNumber, ContractTransaction, Signer } from "ethers";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { getContractAt } from "../utils/helpers";
import { hubSetup } from "../utils/hubSetup";
import { deploy } from "../utils/helpers";
import {
  Diamond,
  FoundryFacet,
  MeTokenRegistryFacet,
  FeesFacet,
  ERC20,
  MeToken,
  SingleAssetVaultMock,
  ERC777Mock,
  Attacker,
  HubFacet,
  VaultRegistry,
} from "../../artifacts/types";

const setup = async () => {
  describe("Reentrancy", () => {
    let token: ERC20;
    let DAI: string;
    let account0: SignerWithAddress;
    let account1: SignerWithAddress;
    let account2: SignerWithAddress;

    let erc777Mock: ERC777Mock;
    let vaultMock: SingleAssetVaultMock;
    let hub: HubFacet;
    let attacker: Attacker;
    let diamond: Diamond;
    let vaultRegistry: VaultRegistry;
    let foundry: FoundryFacet;
    let meTokenRegistry: MeTokenRegistryFacet;
    let whale: Signer;
    let meToken: MeToken;
    let tx: ContractTransaction;

    const precision = ethers.utils.parseUnits("1");
    const refundRatio = 50000;
    const MAX_WEIGHT = 1000000;
    const reserveWeight = MAX_WEIGHT / 2;
    const baseY = precision.div(1000);
    const hubId2 = 2;
    const tokenDepositedInETH = 10;
    const tokenDeposited = ethers.utils.parseEther(
      tokenDepositedInETH.toString()
    );
    before(async () => {
      ({ DAI } = await getNamedAccounts());

      [account0, account1, account2] = await ethers.getSigners();

      const encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [DAI]
      );
      ({
        diamond,
        foundry,
        hub,
        account0,
        account1,
        account2,
        meTokenRegistry,
        vaultRegistry,
      } = await hubSetup(baseY, reserveWeight, encodedVaultArgs, refundRatio));

      // deploy the erc777 and mock vault that can handle erc777
      erc777Mock = await deploy<ERC777Mock>("ERC777Mock");
      vaultMock = await deploy<SingleAssetVaultMock>(
        "SingleAssetVaultMock",
        undefined,
        account0.address,
        diamond.address
      );
      await vaultRegistry.approve(vaultMock.address);

      // Register new vault with erc777
      await hub.register(
        account0.address,
        erc777Mock.address,
        vaultMock.address,
        refundRatio,
        baseY,
        reserveWeight,
        encodedVaultArgs
      );

      // Create a meToken using the erc777 vault
      const tx = await meTokenRegistry.subscribe("METOKEN", "MT", hubId2, 0);
      await tx.wait();

      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account0.address
      );
      meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);

      // deploy the attacker
      attacker = await deploy<Attacker>(
        "Attacker",
        undefined,
        diamond.address,
        erc777Mock.address,
        vaultMock.address,
        meToken.address,
        tokenDepositedInETH
      );

      // give the attacker erc777 balance to deposit for mint
      await erc777Mock.setBalance(attacker.address, tokenDepositedInETH * 2);
    });

    it("Reentrancy facet protection should work", async () => {
      await expect(attacker.attackMint()).to.be.revertedWith(
        "ReentrancyGuard: reentrant call"
      );
    });
  });
};

setup().then(() => {
  run();
});
