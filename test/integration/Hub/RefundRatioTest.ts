import { ethers, getNamedAccounts } from "hardhat";
import { CurveRegistry } from "../../artifacts/types/CurveRegistry";
import { Foundry } from "../../artifacts/types/Foundry";
import { Hub } from "../../artifacts/types/Hub";
import { WeightedAverage } from "../../artifacts/types/WeightedAverage";
import { VaultRegistry } from "../../artifacts/types/VaultRegistry";
import { deploy, getContractAt } from "../utils/helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Signer, BigNumber } from "ethers";
import { BancorZeroCurve } from "../../artifacts/types/BancorZeroCurve";
import { ERC20 } from "../../artifacts/types/ERC20";
import { MeTokenFactory } from "../../artifacts/types/MeTokenFactory";
import { MeTokenRegistry } from "../../artifacts/types/MeTokenRegistry";
import { MigrationRegistry } from "../../artifacts/types/MigrationRegistry";
import { SingleAssetVault } from "../../artifacts/types/SingleAssetVault";
import { impersonate, mineBlock, passOneHour } from "../utils/hardhatNode";
import { Fees } from "../../artifacts/types/Fees";
import { MeToken } from "../../artifacts/types/MeToken";
import { expect } from "chai";

describe("Hub - update RefundRatio", () => {
  let DAI: string;
  let dai: ERC20;
  let daiHolder: Signer;
  let DAIWhale: string;
  let weightedAverage: WeightedAverage;
  let meTokenRegistry: MeTokenRegistry;
  let meTokenFactory: MeTokenFactory;
  let bancorZeroCurve: BancorZeroCurve;
  let curveRegistry: CurveRegistry;
  let vaultRegistry: VaultRegistry;
  let migrationRegistry: MigrationRegistry;
  let singleAssetVault: SingleAssetVault;
  let fees: Fees;
  let foundry: Foundry;
  let meToken: MeToken;
  let hub: Hub;
  let account0: SignerWithAddress;
  let account1: SignerWithAddress;
  let account2: SignerWithAddress;
  const hubId = 1;
  const name = "Carl0 meToken";
  const symbol = "CARL";
  const PRECISION = BigNumber.from(10).pow(6);
  const MAX_WEIGHT = 1000000;
  const amount = ethers.utils.parseEther("100");
  const initRefundRatio = 500000;
  const targetRefundRatio = 750000;
  // for 1 DAI we get 1000 metokens
  const baseY = ethers.utils.parseEther("1").mul(1000).toString();
  // weight at 50% linear curve
  const reserveWeight = BigNumber.from(MAX_WEIGHT).div(2).toString();

  before(async () => {
    ({ DAI, DAIWhale } = await getNamedAccounts());
    [account0, account1, account2] = await ethers.getSigners();
    dai = await getContractAt<ERC20>("ERC20", DAI);
    daiHolder = await impersonate(DAIWhale);
    await dai.approve(DAIWhale, amount);
    dai.connect(daiHolder).transfer(account0.address, amount);
    dai
      .connect(daiHolder)
      .transfer(account1.address, ethers.utils.parseEther("1000"));
    dai
      .connect(daiHolder)
      .transfer(account2.address, ethers.utils.parseEther("1000"));
    weightedAverage = await deploy<WeightedAverage>("WeightedAverage");
    bancorZeroCurve = await deploy<BancorZeroCurve>("BancorZeroCurve");
    curveRegistry = await deploy<CurveRegistry>("CurveRegistry");
    vaultRegistry = await deploy<VaultRegistry>("VaultRegistry");
    migrationRegistry = await deploy<MigrationRegistry>("MigrationRegistry");

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
    singleAssetVault = await deploy<SingleAssetVault>(
      "SingleAssetVault",
      undefined, //no libs
      account1.address, // DAO
      foundry.address, // foundry
      hub.address, // hub
      meTokenRegistry.address, //IMeTokenRegistry
      migrationRegistry.address //IMigrationRegistry
    );

    await curveRegistry.approve(bancorZeroCurve.address);
    await vaultRegistry.approve(singleAssetVault.address);

    fees = await deploy<Fees>("Fees");

    await fees.initialize(0, 0, 0, 0, 0, 0);
    await hub.initialize(vaultRegistry.address, curveRegistry.address);

    const encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint32"],
      [baseY, reserveWeight]
    );
    const encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
      ["address"],
      [DAI]
    );

    // refund ratio of 50000 = 0.00000000000005 ETH
    // max ratio is 1 ETH = 1000000000000000000
    // refund ratio is therefor 0,000000000005 %
    await hub.register(
      DAI,
      singleAssetVault.address,
      bancorZeroCurve.address,
      initRefundRatio, //refund ratio
      encodedCurveDetails,
      encodedVaultArgs
    );
    await hub.setWarmup(60 * 24);
    await hub.setDuration(60 * 24);
    await hub.setCooldown(60 * 24);

    await foundry.initialize(
      hub.address,
      fees.address,
      meTokenRegistry.address
    );

    // register a metoken
    await dai.approve(foundry.address, amount);
    const tx = await meTokenRegistry
      .connect(account0)
      .subscribe(name, symbol, hubId, 0);
    const meTokenAddr = await meTokenRegistry.getOwnerMeToken(account0.address);

    // assert token infos
    meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);
    const FOUNDRY = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("FOUNDRY"));
    await meTokenRegistry.grantRole(FOUNDRY, foundry.address);

    await hub.initUpdate(
      hubId,
      ethers.constants.AddressZero,
      targetRefundRatio,
      ethers.utils.toUtf8Bytes("")
    );
  });

  it("During warmup, tokens received based on initialRefundRatio", async () => {
    // fastFwd an hr
    let hubDetails = await hub.getDetails(hubId);
    const balDaiBefore = await dai.balanceOf(account2.address);
  });

  it("During duration, tokens received based on weighted avg", async () => {});

  it("During cooldown, burn() uses targetRefundRatio", async () => {});
});
