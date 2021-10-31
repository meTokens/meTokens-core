import { ethers, getNamedAccounts } from "hardhat";
import { WeightedAverage } from "../../../artifacts/types/WeightedAverage";
import { MeTokenRegistry } from "../../../artifacts/types/MeTokenRegistry";
import { MeTokenFactory } from "../../../artifacts/types/MeTokenFactory";
import { BancorZeroCurve } from "../../../artifacts/types/BancorZeroCurve";
import { CurveRegistry } from "../../../artifacts/types/CurveRegistry";
import { VaultRegistry } from "../../../artifacts/types/VaultRegistry";
import { MigrationRegistry } from "../../../artifacts/types/MigrationRegistry";
import { MeToken } from "../../../artifacts/types/MeToken";
import { SingleAssetVault } from "../../../artifacts/types/SingleAssetVault";
import { Foundry } from "../../../artifacts/types/Foundry";
import { Hub } from "../../../artifacts/types/Hub";
import { ERC20 } from "../../../artifacts/types/ERC20";
import { deploy, getContractAt } from "../../utils/helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { impersonate } from "../../utils/hardhatNode";
import { BigNumber, Signer } from "ethers";
import { expect } from "chai";

describe("MeTokenRegistry.sol", () => {
  let DAI: string;
  let weightedAverage: WeightedAverage;
  let meTokenRegistry: MeTokenRegistry;
  let meTokenFactory: MeTokenFactory;
  let bancorZeroCurve: BancorZeroCurve;
  let curveRegistry: CurveRegistry;
  let vaultRegistry: VaultRegistry;
  let migrationRegistry: MigrationRegistry;
  let singleAssetVault: SingleAssetVault;
  let foundry: Foundry;
  let hub: Hub;
  let dai: ERC20;
  let account0: SignerWithAddress;
  let account1: SignerWithAddress;
  let account2: SignerWithAddress;
  let daiHolder: Signer;
  let DAIWhale: string;
  let hubId: number;

  const PRECISION = BigNumber.from(10).pow(18);
  const MAX_WEIGHT = 1000000;
  before(async () => {
    ({ DAI, DAIWhale } = await getNamedAccounts());
    [account0, account1, account2] = await ethers.getSigners();
    dai = await getContractAt<ERC20>("ERC20", DAI);
    daiHolder = await impersonate(DAIWhale);
    dai
      .connect(daiHolder)
      .transfer(account1.address, ethers.utils.parseEther("1000"));
    weightedAverage = await deploy<WeightedAverage>("WeightedAverage");
    bancorZeroCurve = await deploy<BancorZeroCurve>("BancorZeroCurve");
    curveRegistry = await deploy<CurveRegistry>("CurveRegistry");
    vaultRegistry = await deploy<VaultRegistry>("VaultRegistry");
    migrationRegistry = await deploy<MigrationRegistry>("MigrationRegistry");
    singleAssetVault = await deploy<SingleAssetVault>("SingleAssetVault");
    foundry = await deploy<Foundry>("Foundry", {
      WeightedAverage: weightedAverage.address,
    });

    hub = await deploy<Hub>("Hub");
    meTokenFactory = await deploy<MeTokenFactory>("MeTokenFactory");
    meTokenRegistry = await deploy<MeTokenRegistry>(
      "MeTokenRegistry",
      undefined,
      hub.address,
      meTokenFactory.address,
      migrationRegistry.address
    );
    await curveRegistry.approve(bancorZeroCurve.address);
    await vaultRegistry.approve(singleAssetVault.address);

    await hub.initialize(foundry.address, vaultRegistry.address);
    const baseY = PRECISION.div(1000).toString();
    const reserveWeight = BigNumber.from(MAX_WEIGHT).div(2).toString();

    const encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint32"],
      [baseY, reserveWeight]
    );
    const encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
      ["address"],
      [DAI]
    );

    await hub.register(
      dai.address,
      singleAssetVault.address,
      bancorZeroCurve.address,
      50000, //refund ratio
      encodedCurveDetails,
      encodedVaultArgs
    );
    hubId = 0;
  });

  describe("register()", () => {
    it("User can create a meToken with no collateral", async () => {
      const name = "Carl0 meToken";
      const symbol = "CARL";

      const tx = await meTokenRegistry
        .connect(account0)
        .register(name, "CARL", hubId, 0);
      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account0.address
      );
      expect(tx)
        .to.emit(meTokenRegistry, "Register")
        .withArgs(meTokenAddr, account0.address, name, symbol, hubId);

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
        meTokenRegistry.connect(account0).register(name, "CARL", hubId, 0)
      ).to.be.revertedWith("msg.sender already owns a meToke");
    });

    it("User can create a meToken with 100 DAI as collateral", async () => {
      const amount = 100;
      const balBefore = await dai.balanceOf(account1.address);
      // need an approve of metoken registry first
      await dai.connect(account1).approve(meTokenRegistry.address, amount);
      await meTokenRegistry
        .connect(account1)
        .register("Carl1 meToken", "CARL", hubId, amount);
      const balAfter = await dai.balanceOf(account1.address);
      expect(balBefore.sub(balAfter)).equal(amount);
      const hubDetail = await hub.getDetails(hubId);
      const balVault = await dai.balanceOf(hubDetail.vault);
      expect(balVault).equal(amount);
      // assert token infos
      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account1.address
      );
      const meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);
      // should be greater than 0
      expect(await meToken.totalSupply()).to.equal(100000);
    });
  });

  describe("transferOwnership()", () => {
    it("Fails if not owner", async () => {
      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account1.address
      );
      await expect(
        meTokenRegistry.transferOwnership(meTokenAddr, account2.address)
      ).to.revertedWith("!owner");
      const meTokenAddr2 = await meTokenRegistry.getOwnerMeToken(
        account0.address
      );
      await expect(
        meTokenRegistry.transferOwnership(meTokenAddr2, account1.address)
      ).to.revertedWith("_newOwner already owns a meToken");
    });
    it("Emits TransferOwnership()", async () => {
      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account1.address
      );

      const tx = meTokenRegistry
        .connect(account1)
        .transferOwnership(meTokenAddr, account2.address);

      await expect(tx)
        .to.emit(meTokenRegistry, "TransferOwnership")
        .withArgs(account1.address, account2.address, meTokenAddr);
    });
  });

  describe("isOwner()", () => {
    it("Returns false for address(0)", async () => {
      expect(await meTokenRegistry.isOwner(ethers.constants.AddressZero)).to.be
        .false;
    });
    it("Returns true for a meToken issuer", async () => {
      expect(await meTokenRegistry.isOwner(account2.address)).to.be.true;
    });
  });
  describe("balancePool", () => {
    it("Fails if not foundry", async () => {
      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account1.address
      );
      await expect(
        meTokenRegistry.incrementBalancePooled(
          true,
          meTokenAddr,
          account2.address
        )
      ).to.revertedWith("!foundry");
    });
    it("incrementBalancePooled()", async () => {
      /*  const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account2.address
      );
      const tx = meTokenRegistry
        .connect(account2)
        .incrementBalancePooled(true, meTokenAddr, account2.address); */
    });

    it("incrementBalanceLocked()", async () => {});
  });
});
