import { ethers, getNamedAccounts } from "hardhat";
import { hubSetup } from "../../utils/hubSetup";
import {
  calculateTokenReturned,
  calculateCollateralReturned,
  deploy,
  getContractAt,
  toETHNumber,
  weightedAverageSimulation,
  calculateTokenReturnedFromZero,
} from "../../utils/helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, ContractTransaction, Signer } from "ethers";
import { CurveRegistry } from "../../../artifacts/types/CurveRegistry";
import { ERC20 } from "../../../artifacts/types/ERC20";
import { BancorABDK } from "../../../artifacts/types/BancorABDK";
import { Foundry } from "../../../artifacts/types/Foundry";
import { Hub } from "../../../artifacts/types/Hub";
import { MeTokenRegistry } from "../../../artifacts/types/MeTokenRegistry";
import { MigrationRegistry } from "../../../artifacts/types/MigrationRegistry";
import { expect } from "chai";
import { MeToken } from "../../../artifacts/types/MeToken";
import { UniswapSingleTransferMigration } from "../../../artifacts/types/UniswapSingleTransferMigration";
import { SingleAssetVault } from "../../../artifacts/types/SingleAssetVault";
import { passDays, passHours, passSeconds } from "../../utils/hardhatNode";

const setup = async () => {
  describe("MeToken Resubscribe - Same curve, new Curve Details", () => {
    let tx: ContractTransaction;
    let meTokenRegistry: MeTokenRegistry;
    let bancorABDK: BancorABDK;
    let migrationRegistry: MigrationRegistry;
    let migration: UniswapSingleTransferMigration;
    let singleAssetVault: SingleAssetVault;
    let foundry: Foundry;
    let hub: Hub;
    let token: ERC20;
    let tokenHolder: Signer;
    let dai: ERC20;
    let weth: ERC20;
    let daiWhale: Signer;
    let meToken: MeToken;
    let account0: SignerWithAddress;
    let account1: SignerWithAddress;
    let encodedCurveDetails1: string;
    let encodedCurveDetails2: string;

    const hubId1 = 1;
    const hubId2 = 2;
    const hubWarmup = 7 * 60 * 24 * 24; // 1 week
    const warmup = 2 * 60 * 24 * 24; // 2 days
    const duration = 4 * 60 * 24 * 24; // 4 days
    const coolDown = 5 * 60 * 24 * 24; // 5 days
    const MAX_WEIGHT = 1000000;
    const PRECISION = BigNumber.from(10).pow(18);
    const baseY1 = PRECISION.div(1000);
    const baseY2 = PRECISION.div(50);
    const reserveWeight1 = MAX_WEIGHT / 10;
    const reserveWeight2 = MAX_WEIGHT / 2;
    const refundRatio = 5000;
    const fees = 3000;
    const tokenDepositedInETH = 100;
    const tokenDeposited = ethers.utils.parseEther(
      tokenDepositedInETH.toString()
    );

    before(async () => {
      let DAI, WETH;
      ({ DAI, WETH } = await getNamedAccounts());

      const encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [DAI]
      );
      encodedCurveDetails1 = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint32"],
        [baseY1, reserveWeight1]
      );
      encodedCurveDetails2 = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint32"],
        [baseY2, reserveWeight2]
      );
      const block = await ethers.provider.getBlock("latest");
      const earliestSwapTime = block.timestamp + 600 * 60; // 10h in future
      const encodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint24"],
        [earliestSwapTime, fees]
      );

      // Register first and second hub
      bancorABDK = await deploy<BancorABDK>("BancorABDK");
      ({
        token,
        hub,
        tokenHolder,
        migrationRegistry,
        singleAssetVault,
        foundry,
        account0,
        account1,
        meTokenRegistry,
      } = await hubSetup(
        encodedCurveDetails1,
        encodedVaultArgs,
        refundRatio,
        bancorABDK
      ));
      dai = token;
      weth = await getContractAt<ERC20>("ERC20", WETH);
      daiWhale = tokenHolder;

      await hub.register(
        account0.address,
        WETH,
        singleAssetVault.address,
        bancorABDK.address,
        refundRatio,
        encodedCurveDetails2,
        encodedVaultArgs
      );

      // set update/resubscribe times
      await hub.setWarmup(hubWarmup);
      await meTokenRegistry.setWarmup(warmup);
      await meTokenRegistry.setDuration(duration);
      await meTokenRegistry.setCooldown(coolDown);

      // Deploy uniswap migration and approve it to the registry
      migration = await deploy<UniswapSingleTransferMigration>(
        "UniswapSingleTransferMigration",
        undefined,
        account0.address,
        foundry.address,
        hub.address,
        meTokenRegistry.address,
        migrationRegistry.address
      );
      await migrationRegistry.approve(
        singleAssetVault.address,
        singleAssetVault.address,
        migration.address
      );

      // Pre-load owner and buyer w/ DAI & WETH
      await dai
        .connect(daiWhale)
        .transfer(account1.address, ethers.utils.parseEther("1000"));

      await weth
        .connect(tokenHolder)
        .transfer(account1.address, ethers.utils.parseEther("1000"));

      // Create meToken and subscribe to Hub1
      const name = "Carl meToken";
      const symbol = "CARL";
      await meTokenRegistry
        .connect(account0)
        .subscribe(name, symbol, hubId1, 0);
      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account0.address
      );
      meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);

      // initialize resubscription to hub 2
      tx = await meTokenRegistry
        .connect(account0)
        .initResubscribe(
          meTokenAddr,
          hubId2,
          migration.address,
          encodedMigrationArgs
        );
      await dai
        .connect(account1)
        .approve(foundry.address, ethers.constants.MaxUint256);
      await weth
        .connect(account1)
        .approve(foundry.address, ethers.constants.MaxUint256);
    });

    describe("Warmup", () => {
      before(async () => {
        const metokenDetails = await meTokenRegistry.getDetails(
          meToken.address
        );
        const block = await ethers.provider.getBlock("latest");
        expect(metokenDetails.startTime).to.be.gt(block.timestamp);
      });
      it("mint(): meTokens received based on initial Curve details", async () => {
        const vaultDAIBefore = await dai.balanceOf(singleAssetVault.address);
        const meTokenTotalSupplyBefore = await meToken.totalSupply();
        expect(meTokenTotalSupplyBefore).to.be.equal(0);

        const calculatedReturn = calculateTokenReturnedFromZero(
          tokenDepositedInETH,
          toETHNumber(baseY1),
          reserveWeight1 / MAX_WEIGHT
        );

        await foundry
          .connect(account1)
          .mint(meToken.address, tokenDeposited, account0.address);

        const ownerMeTokenAfter = await meToken.balanceOf(account0.address);
        const vaultDAIAfter = await token.balanceOf(singleAssetVault.address);
        const meTokenTotalSupplyAfter = await meToken.totalSupply();

        expect(toETHNumber(ownerMeTokenAfter)).to.be.approximately(
          calculatedReturn,
          0.000000000000001
        );
        expect(meTokenTotalSupplyAfter).to.be.equal(ownerMeTokenAfter);
        expect(vaultDAIAfter.sub(vaultDAIBefore)).to.equal(tokenDeposited);
      });
      xit("burn() [buyer]: assets received based on initial Curve details", async () => {});
      xit("burn() [owner]: assets received based on initial Curve details", async () => {});
    });

    describe("Duration", () => {
      xit("mint(): meTokens received based on weighted average curve details", async () => {});
      xit("burn() [buyer]: assets received based on weighted average Curve details", async () => {});
      xit("burn() [owner]: assets received based on weighted average Curve details", async () => {});
    });

    describe("Cooldown", () => {
      xit("mint(): assets received based on target Curve details", async () => {});
      xit("burn() [buyer]: assets received based on target Curve details", async () => {});
      xit("burn() [owner]: assets received based on target Curve details", async () => {});
    });
  });
};

setup().then(() => {
  run();
});
