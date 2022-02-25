import { ethers, getNamedAccounts } from "hardhat";
import { MeTokenRegistryFacet } from "../../../artifacts/types/MeTokenRegistryFacet";
import { MeToken } from "../../../artifacts/types/MeToken";
import { HubFacet } from "../../../artifacts/types/HubFacet";
import { ERC20 } from "../../../artifacts/types/ERC20";
import {
  calculateCollateralReturned,
  calculateTokenReturnedFromZero,
  deploy,
  fromETHNumber,
  getContractAt,
  toETHNumber,
} from "../../utils/helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { hubSetup } from "../../utils/hubSetup";
import {
  BigNumber,
  ContractReceipt,
  ContractTransaction,
  Signer,
} from "ethers";
import { expect } from "chai";
import { MigrationRegistry } from "../../../artifacts/types/MigrationRegistry";
import { SingleAssetVault } from "../../../artifacts/types/SingleAssetVault";
import { FoundryFacet } from "../../../artifacts/types/FoundryFacet";
import { FeesFacet } from "../../../artifacts/types/FeesFacet";
import { mineBlock } from "../../utils/hardhatNode";
import { Address } from "hardhat-deploy/dist/types";
import { UniswapSingleTransferMigration } from "../../../artifacts/types/UniswapSingleTransferMigration";
import { ICurve } from "../../../artifacts/types";

export const checkUniswapPoolLiquidity = async (
  DAI: string,
  WETH: string,
  fees: number
) => {
  const uniswapRouterAddress = "0xE592427A0AEce92De3Edee1F18E0157C05861564";

  // make sure that pair exists on router
  const UniswapRouterInterfaceABI = [
    "function factory() view returns (address factory)",
  ];
  const UniswapV3FactoryInterfaceABI = [
    "function getPool(address, address, uint24) view returns(address)",
  ];
  const UniswapV3PoolABI = ["function liquidity() view returns (uint256)"];
  const uniswapRouter = await ethers.getContractAt(
    UniswapRouterInterfaceABI,
    uniswapRouterAddress
  );

  const uniswapV3FactoryAddress = await uniswapRouter.factory();

  const uniswapV3Factory = await ethers.getContractAt(
    UniswapV3FactoryInterfaceABI,
    uniswapV3FactoryAddress
  );

  const pool = await uniswapV3Factory.getPool(DAI, WETH, fees);
  const uniswapV3Pool = await ethers.getContractAt(UniswapV3PoolABI, pool);
  expect(await uniswapV3Pool.liquidity()).to.be.gt(0);
};
const setup = async () => {
  describe("MeTokenRegistryFacet.sol", () => {
    let meTokenAddr0: string;
    let meTokenAddr1: string;
    let tx: ContractTransaction;
    let meTokenRegistry: MeTokenRegistryFacet;
    let refundRatio = 50000;

    let USDT: string;
    let DAI: string;
    let WETH: string;

    let migrationRegistry: MigrationRegistry;
    let singleAssetVault: SingleAssetVault;
    let foundry: FoundryFacet;
    let hub: HubFacet;
    let token: ERC20;
    let fee: FeesFacet;
    let weth: ERC20;
    let account0: SignerWithAddress;
    let account1: SignerWithAddress;
    let account2: SignerWithAddress;
    let account3: SignerWithAddress;
    let tokenHolder: Signer;
    let curve: ICurve;
    let targetHubId: number;
    let migration: UniswapSingleTransferMigration;
    let meToken: Address;
    let encodedMigrationArgs: string;
    let receipt: ContractReceipt;

    const hubId = 1; // DAI
    const hubId2 = 2; // WETH
    const hubId3 = 3; // USDT
    const MAX_WEIGHT = 1000000;
    const PRECISION = BigNumber.from(10).pow(18);
    const reserveWeight = MAX_WEIGHT / 2;
    const baseY = PRECISION.div(1000);
    const hubWarmup = 7 * 60 * 24 * 24; // 1 week
    const warmup = 2 * 60 * 24 * 24; // 2 days
    const duration = 4 * 60 * 24 * 24; // 4 days
    const coolDown = 5 * 60 * 24 * 24; // 5 days
    const fees = 3000;
    const tokenDepositedInETH = 100;
    const tokenDeposited = ethers.utils.parseEther(
      tokenDepositedInETH.toString()
    );
    let block: any;
    before(async () => {
      ({ DAI, WETH, USDT } = await getNamedAccounts());
      await checkUniswapPoolLiquidity(DAI, WETH, fees);

      const encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint32"],
        [baseY, reserveWeight]
      );
      const encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [DAI]
      );

      ({
        tokenAddr: DAI,
        hub,
        curve,
        foundry,
        meTokenRegistry,
        migrationRegistry,
        singleAssetVault,
        token,
        fee,
        account0,
        account1,
        account2,
        account3,
        tokenHolder,
      } = await hubSetup(
        encodedCurveDetails,
        encodedVaultArgs,
        refundRatio,
        "BancorCurve"
      ));
      await hub.register(
        account0.address,
        WETH,
        singleAssetVault.address,
        curve.address,
        refundRatio, //refund ratio
        encodedCurveDetails,
        encodedVaultArgs
      );
      await hub.register(
        account0.address,
        USDT,
        singleAssetVault.address,
        curve.address,
        refundRatio, //refund ratio
        encodedCurveDetails,
        encodedVaultArgs
      );
      await hub.setHubWarmup(hubWarmup);
      await meTokenRegistry.setMeTokenWarmup(warmup - 1);
      await meTokenRegistry.setMeTokenCooldown(coolDown + 1);
      await meTokenRegistry.setMeTokenDuration(duration - 1);

      // Deploy uniswap migration and approve it to the registry
      migration = await deploy<UniswapSingleTransferMigration>(
        "UniswapSingleTransferMigration",
        undefined,
        account0.address, // DAO
        foundry.address // diamond
      );
      await migration.deployed();
      weth = await getContractAt<ERC20>("ERC20", WETH);
    });

    describe("subscribe()", () => {
      it("should revert when hub is updating", async () => {
        await hub.initUpdate(hubId, curve.address, refundRatio / 2, "0x");
        const name = "Carl0 meToken";
        const symbol = "CARL";
        const assetsDeposited = 0;

        const tx = meTokenRegistry.subscribe(
          name,
          symbol,
          hubId,
          assetsDeposited
        );
        await expect(tx).to.be.revertedWith("Hub updating");
        await hub.cancelUpdate(hubId);
      });
      it("User can create a meToken with no collateral", async () => {
        const name = "Carl0 meToken";
        const symbol = "CARL";
        const assetsDeposited = 0;

        tx = await meTokenRegistry.subscribe(
          name,
          symbol,
          hubId,
          assetsDeposited
        );
        await tx.wait();

        meTokenAddr0 = await meTokenRegistry.getOwnerMeToken(account0.address);
        const meTokensMinted = await curve.viewMeTokensMinted(
          assetsDeposited,
          hubId,
          0,
          0
        );
        const calculatedRes = calculateTokenReturnedFromZero(
          assetsDeposited,
          toETHNumber(baseY),
          reserveWeight / MAX_WEIGHT
        );

        await expect(tx)
          .to.emit(meTokenRegistry, "Subscribe")
          .withArgs(
            meTokenAddr0,
            account0.address,
            meTokensMinted,
            DAI,
            assetsDeposited,
            name,
            symbol,
            hubId
          );

        // assert token infos
        const meToken = await getContractAt<MeToken>("MeToken", meTokenAddr0);
        expect(await meToken.name()).to.equal(name);
        expect(await meToken.symbol()).to.equal(symbol);
        expect(await meToken.decimals()).to.equal(18);
        expect(await meToken.totalSupply())
          .to.equal(0)
          .to.be.equal(calculatedRes)
          .to.be.equal(meTokensMinted);
        const meTokenRegistryDetails = await meTokenRegistry.getMeTokenInfo(
          meTokenAddr0
        );
        expect(meTokenRegistryDetails.owner).to.equal(account0.address);
        expect(meTokenRegistryDetails.hubId).to.equal(hubId);
        expect(meTokenRegistryDetails.balancePooled).to.equal(assetsDeposited);
        expect(meTokenRegistryDetails.balanceLocked).to.equal(0);
        expect(meTokenRegistryDetails.startTime).to.equal(0);
        expect(meTokenRegistryDetails.endTime).to.equal(0);
        expect(meTokenRegistryDetails.endCooldown).to.equal(0);
        expect(meTokenRegistryDetails.targetHubId).to.equal(0);
        expect(meTokenRegistryDetails.migration).to.equal(
          ethers.constants.AddressZero
        );
      });

      it("User can't create two meToken", async () => {
        const name = "Carl0 meToken";
        const symbol = "CARL";
        await expect(
          meTokenRegistry.connect(account0).subscribe(name, symbol, hubId, 0)
        ).to.be.revertedWith("msg.sender already owns a meToken");
      });

      it("User can create a meToken with 100 DAI as collateral", async () => {
        const name = "Carl1 meToken";
        const symbol = "CARL";
        const assetsInEth = "20";
        const assetsDeposited = ethers.utils.parseEther(assetsInEth);
        const balBefore = await token.balanceOf(account1.address);
        // need an approve of metoken registry first
        await token
          .connect(account1)
          .approve(meTokenRegistry.address, assetsDeposited);
        tx = await meTokenRegistry
          .connect(account1)
          .subscribe(name, symbol, hubId, assetsDeposited);
        tx.wait();
        const balAfter = await token.balanceOf(account1.address);
        expect(balBefore.sub(balAfter)).equal(assetsDeposited);
        const hubDetail = await hub.getHubInfo(hubId);
        const balVault = await token.balanceOf(hubDetail.vault);
        expect(balVault).equal(assetsDeposited);
        // assert token infos
        meTokenAddr1 = await meTokenRegistry.getOwnerMeToken(account1.address);
        const meToken = await getContractAt<MeToken>("MeToken", meTokenAddr1);
        // should be greater than 0
        const calculatedRes = calculateTokenReturnedFromZero(
          20,
          toETHNumber(baseY),
          reserveWeight / MAX_WEIGHT
        );

        let estimateCalculateTokenReturnedFromZero =
          await curve.viewMeTokensMinted(assetsDeposited, hubId, 0, 0);

        expect(
          toETHNumber(estimateCalculateTokenReturnedFromZero)
        ).to.be.approximately(calculatedRes, 0.000000000000000000000000001);

        await expect(tx)
          .to.emit(meTokenRegistry, "Subscribe")
          .withArgs(
            meTokenAddr1,
            account1.address,
            estimateCalculateTokenReturnedFromZero,
            DAI,
            assetsDeposited,
            name,
            symbol,
            hubId
          );

        expect(await meToken.name()).to.equal(name);
        expect(await meToken.symbol()).to.equal(symbol);
        expect(await meToken.decimals()).to.equal(18);
        expect(await meToken.totalSupply()).to.be.equal(
          estimateCalculateTokenReturnedFromZero
        );
        const meTokenRegistryDetails = await meTokenRegistry.getMeTokenInfo(
          meTokenAddr1
        );
        expect(meTokenRegistryDetails.owner).to.equal(account1.address);
        expect(meTokenRegistryDetails.hubId).to.equal(hubId);
        expect(meTokenRegistryDetails.balancePooled).to.equal(assetsDeposited);
        expect(meTokenRegistryDetails.balanceLocked).to.equal(0);
        expect(meTokenRegistryDetails.startTime).to.equal(0);
        expect(meTokenRegistryDetails.endTime).to.equal(0);
        expect(meTokenRegistryDetails.endCooldown).to.equal(0);
        expect(meTokenRegistryDetails.targetHubId).to.equal(0);
        expect(meTokenRegistryDetails.migration).to.equal(
          ethers.constants.AddressZero
        );
      });

      it("should revert to subscribe to invalid hub", async () => {
        const name = "Carl0 meToken";
        const symbol = "CARL";
        const assetsDeposited = 0;
        const invalidHub = 0;

        const tx = meTokenRegistry
          .connect(account2)
          .subscribe(name, symbol, invalidHub, assetsDeposited);
        expect(tx).to.be.revertedWith("Hub inactive");
      });

      it("should revert when _assetsDeposited transferFrom fails", async () => {
        // there can be multiple external cause here. Only checking for one
        const name = "Carl0 meToken";
        const symbol = "CARL";
        const assetsDeposited = ethers.utils.parseEther("20");
        await token
          .connect(tokenHolder)
          .transfer(account2.address, assetsDeposited);

        const tx = meTokenRegistry
          .connect(account2)
          .subscribe(name, symbol, hubId, assetsDeposited);
        await expect(tx).to.be.revertedWith("Dai/insufficient-allowance");
      });
    });

    describe("setMeTokenWarmup()", () => {
      it("should revert to setMeTokenWarmup if not owner", async () => {
        const tx = meTokenRegistry.connect(account1).setMeTokenWarmup(warmup);
        await expect(tx).to.be.revertedWith("!durationsController");
      });
      it("should revert to setMeTokenWarmup if same as before", async () => {
        const oldWarmup = await meTokenRegistry.meTokenWarmup();
        const tx = meTokenRegistry.setMeTokenWarmup(oldWarmup);
        await expect(tx).to.be.revertedWith("same warmup");
      });
      it("should revert when warmup + duration > hub's warmup", async () => {
        const tx = meTokenRegistry.setMeTokenWarmup(hubWarmup);
        await expect(tx).to.be.revertedWith("too long");
      });
      it("should be able to setMeTokenWarmup", async () => {
        tx = await meTokenRegistry.setMeTokenWarmup(warmup);
        await tx.wait();
        expect(await meTokenRegistry.meTokenWarmup()).to.be.equal(warmup);
      });
    });

    describe("setMeTokenDuration()", () => {
      it("should revert to setMeTokenDuration if not owner", async () => {
        const tx = meTokenRegistry
          .connect(account1)
          .setMeTokenDuration(duration);
        await expect(tx).to.be.revertedWith("!durationsController");
      });
      it("should revert to setMeTokenDuration if same as before", async () => {
        const oldWarmup = await meTokenRegistry.meTokenDuration();
        const tx = meTokenRegistry.setMeTokenDuration(oldWarmup);
        await expect(tx).to.be.revertedWith("same duration");
      });
      it("should revert when warmup + duration > hub's warmup", async () => {
        const tx = meTokenRegistry.setMeTokenDuration(hubWarmup);
        await expect(tx).to.be.revertedWith("too long");
      });
      it("should be able to setMeTokenDuration", async () => {
        tx = await meTokenRegistry.setMeTokenDuration(duration);
        await tx.wait();
        expect(await meTokenRegistry.meTokenDuration()).to.be.equal(duration);
      });
    });

    describe("setMeTokenCooldown()", () => {
      it("should revert to setMeTokenCooldown if not owner", async () => {
        const tx = meTokenRegistry
          .connect(account1)
          .setMeTokenCooldown(coolDown);
        await expect(tx).to.be.revertedWith("!durationsController");
      });
      it("should revert to setMeTokenCooldown if same as before", async () => {
        const oldWarmup = await meTokenRegistry.meTokenCooldown();
        const tx = meTokenRegistry.setMeTokenCooldown(oldWarmup);
        await expect(tx).to.be.revertedWith("same cooldown");
      });
      it("should be able to setMeTokenCooldown", async () => {
        tx = await meTokenRegistry.setMeTokenCooldown(coolDown);
        await tx.wait();
        expect(await meTokenRegistry.meTokenCooldown()).to.be.equal(coolDown);
      });
    });

    describe("initResubscribe()", () => {
      it("Fails if msg.sender not meToken owner", async () => {
        meToken = meTokenAddr0;
        targetHubId = hubId2;
        block = await ethers.provider.getBlock("latest");
        const earliestSwapTime = block.timestamp + 600 * 60; // 10h in future
        encodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
          ["uint256", "uint24"],
          [earliestSwapTime, fees]
        );

        const tx = meTokenRegistry
          .connect(account1)
          .initResubscribe(
            meToken,
            targetHubId,
            migration.address,
            encodedMigrationArgs
          );
        await expect(tx).to.be.revertedWith("!owner");
      });
      it("Fails if resubscribing to same hub", async () => {
        const meToken = meTokenAddr0;
        const targetHubId = hubId; // exiting hubId
        const migration = ethers.constants.AddressZero;

        const tx = meTokenRegistry.initResubscribe(
          meToken,
          targetHubId,
          migration,
          encodedMigrationArgs
        );
        await expect(tx).to.be.revertedWith("same hub");
      });
      it("Fails if resubscribing to inactive hub", async () => {
        const meToken = meTokenAddr0;
        const targetHubId = 0; // inactive hub
        const migration = ethers.constants.AddressZero;

        const tx = meTokenRegistry.initResubscribe(
          meToken,
          targetHubId,
          migration,
          encodedMigrationArgs
        );
        await expect(tx).to.be.revertedWith("targetHub inactive");
      });
      it("Fails if current hub currently updating", async () => {
        await hub.initUpdate(hubId, curve.address, refundRatio / 2, "0x");

        const tx = meTokenRegistry.initResubscribe(
          meTokenAddr0,
          hubId2,
          ethers.constants.AddressZero,
          "0x"
        );
        await expect(tx).to.be.revertedWith("hub updating");
        await hub.cancelUpdate(hubId);
      });
      it("Fails if target hub currently updating", async () => {
        await hub.initUpdate(hubId2, curve.address, refundRatio / 2, "0x");

        const tx = meTokenRegistry.initResubscribe(
          meTokenAddr0,
          hubId2,
          ethers.constants.AddressZero,
          "0x"
        );
        await expect(tx).to.be.revertedWith("targetHub updating");
        await hub.cancelUpdate(hubId2);
      });
      it("Fails if attempting to use an unapproved migration", async () => {
        await expect(
          meTokenRegistry.initResubscribe(
            meToken,
            targetHubId,
            migration.address,
            encodedMigrationArgs
          )
        ).to.be.revertedWith("!approved");

        await migrationRegistry.approve(
          singleAssetVault.address,
          singleAssetVault.address,
          migration.address
        );
      });
      it("Fails from invalid encodedMigrationArgs", async () => {
        const badEncodedMigrationArgs = "0x";
        await expect(
          meTokenRegistry.initResubscribe(
            meToken,
            targetHubId,
            migration.address,
            badEncodedMigrationArgs
          )
        ).to.be.revertedWith("Invalid encodedMigrationArgs");
      });
      it("Fails when current and target hub have same asset", async () => {
        const tx = meTokenRegistry.callStatic.initResubscribe(
          meToken,
          hubId3,
          migration.address,
          encodedMigrationArgs
        );
        await expect(tx).to.not.be.revertedWith("asset same");
      });
      it("Fails when migration address is 0", async () => {
        await expect(
          meTokenRegistry.initResubscribe(
            meToken,
            targetHubId,
            ethers.constants.AddressZero,
            encodedMigrationArgs
          )
        ).to.be.revertedWith("migration address(0)");
      });
      it("Successfully calls IMigration.initMigration() and set correct resubscription info", async () => {
        // exiting hub is active
        const meTokenRegistryDetails = await meTokenRegistry.getMeTokenInfo(
          meTokenAddr0
        );
        expect(
          (await hub.getHubInfo(meTokenRegistryDetails.hubId)).active
        ).to.equal(true);
        tx = await meTokenRegistry.initResubscribe(
          meToken,
          targetHubId,
          migration.address,
          encodedMigrationArgs
        );
        receipt = await tx.wait();
      });
      it("Successfully sets meToken resubscription info", async () => {
        const block = await ethers.provider.getBlock(receipt.blockNumber);
        const expectedStartTime = block.timestamp + warmup;
        const expectedEndTime = block.timestamp + warmup + duration;
        const expectedEndCooldownTime =
          block.timestamp + warmup + duration + coolDown;

        const meTokenRegistryDetails = await meTokenRegistry.getMeTokenInfo(
          meTokenAddr0
        );

        expect(meTokenRegistryDetails.startTime).to.equal(expectedStartTime);
        expect(meTokenRegistryDetails.endTime).to.equal(expectedEndTime);
        expect(meTokenRegistryDetails.endCooldown).to.equal(
          expectedEndCooldownTime
        );
        expect(meTokenRegistryDetails.targetHubId).to.equal(targetHubId);
        expect(meTokenRegistryDetails.migration).to.equal(migration.address);
      });
      it("Emits InitResubscribe()", async () => {
        await expect(tx)
          .to.emit(meTokenRegistry, "InitResubscribe")
          .withArgs(
            meToken,
            targetHubId,
            migration.address,
            encodedMigrationArgs
          );
      });
      it("Fail if already resubscribing before endCoolDown", async () => {
        const tx = meTokenRegistry.initResubscribe(
          meToken,
          targetHubId,
          migration.address,
          encodedMigrationArgs
        );
        await expect(tx).to.be.revertedWith("Cooldown not complete");
      });
    });

    describe("cancelResubscribe()", () => {
      it("Fails if a called by non-owner", async () => {
        await expect(
          meTokenRegistry.connect(account1).cancelResubscribe(meTokenAddr0)
        ).to.be.revertedWith("!owner");
      });
      it("Fails if meToken not resubscribing", async () => {
        await expect(
          meTokenRegistry.connect(account1).cancelResubscribe(meTokenAddr1)
        ).to.be.revertedWith("!resubscribing");
      });
      it("Successfully resets meToken info", async () => {
        block = await ethers.provider.getBlock("latest");
        expect(
          (await meTokenRegistry.getMeTokenInfo(meTokenAddr0)).startTime
        ).to.be.gt(block.timestamp);
        tx = await meTokenRegistry.cancelResubscribe(meTokenAddr0);
        await tx.wait();
      });
      it("Successfully resets meToken info", async () => {
        const meTokenRegistryDetails = await meTokenRegistry.getMeTokenInfo(
          meTokenAddr0
        );
        expect(meTokenRegistryDetails.startTime).to.be.equal(0);
        expect(meTokenRegistryDetails.endTime).to.be.equal(0);
        expect(meTokenRegistryDetails.targetHubId).to.be.equal(0);
        expect(meTokenRegistryDetails.migration).to.be.equal(
          ethers.constants.AddressZero
        );
      });
      it("Emits CancelResubscribe()", async () => {
        await expect(tx)
          .to.emit(meTokenRegistry, "CancelResubscribe")
          .withArgs(meTokenAddr0);
      });
      it("should be able to resubscribe | migrate from inactive hub", async () => {
        const meTokenRegistryDetails = await meTokenRegistry.getMeTokenInfo(
          meTokenAddr0
        );
        await hub.deactivate(meTokenRegistryDetails.hubId);
        expect(
          (await hub.getHubInfo(meTokenRegistryDetails.hubId)).active
        ).to.equal(false);
        const oldMeTokenRegistryDetails = await meTokenRegistry.getMeTokenInfo(
          meTokenAddr0
        );
        // forward time after start time
        await mineBlock(oldMeTokenRegistryDetails.endCooldown.toNumber() + 2);
        block = await ethers.provider.getBlock("latest");
        expect(oldMeTokenRegistryDetails.endCooldown).to.be.lt(block.timestamp);

        const earliestSwapTime = block.timestamp + 600 * 60; // 10h in future
        encodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
          ["uint256", "uint24"],
          [earliestSwapTime, fees]
        );

        tx = await meTokenRegistry.initResubscribe(
          meToken,
          targetHubId,
          migration.address,
          encodedMigrationArgs
        );
        await tx.wait();
      });
      it("Fails if resubscription already started", async () => {
        const meTokenRegistryDetails = await meTokenRegistry.getMeTokenInfo(
          meTokenAddr0
        );
        // forward time after start time
        await mineBlock(meTokenRegistryDetails.startTime.toNumber() + 2);
        block = await ethers.provider.getBlock("latest");
        expect(meTokenRegistryDetails.startTime).to.be.lt(block.timestamp);

        await expect(
          meTokenRegistry.cancelResubscribe(meTokenAddr0)
        ).to.be.revertedWith("Resubscription has started");
      });
    });

    describe("finishResubscribe()", () => {
      it("Fails if meToken not resubscribing", async () => {
        await expect(
          meTokenRegistry.connect(account1).finishResubscribe(meTokenAddr1)
        ).to.be.revertedWith("No targetHubId");
      });
      it("Fails if updating but cooldown not reached", async () => {
        const meTokenRegistryDetails = await meTokenRegistry.getMeTokenInfo(
          meTokenAddr0
        );
        // forward time before endTime
        await mineBlock(meTokenRegistryDetails.endTime.toNumber() - 2);
        block = await ethers.provider.getBlock("latest");
        expect(meTokenRegistryDetails.endTime).to.be.gt(block.timestamp);
        await expect(
          meTokenRegistry.finishResubscribe(meTokenAddr0)
        ).to.be.revertedWith("block.timestamp < endTime");
      });
      it("Successfully calls IMigration.finishMigration()", async () => {
        const meTokenRegistryDetails = await meTokenRegistry.getMeTokenInfo(
          meTokenAddr0
        );
        // forward time before endTime
        await mineBlock(meTokenRegistryDetails.endTime.toNumber() + 2);
        block = await ethers.provider.getBlock("latest");
        expect(meTokenRegistryDetails.endTime).to.be.lt(block.timestamp);

        tx = await meTokenRegistry.finishResubscribe(meTokenAddr0);
        await tx.wait();
      });
      it("Successfully updates meToken info", async () => {
        const meTokenRegistryDetails = await meTokenRegistry.getMeTokenInfo(
          meTokenAddr0
        );
        expect(meTokenRegistryDetails.startTime).to.be.equal(0);
        expect(meTokenRegistryDetails.endTime).to.be.equal(0);
        expect(meTokenRegistryDetails.hubId).to.be.equal(2);
        expect(meTokenRegistryDetails.targetHubId).to.be.equal(0);
        expect(meTokenRegistryDetails.migration).to.be.equal(
          ethers.constants.AddressZero
        );
      });
      it("Emits FinishResubscribe()", async () => {
        await expect(tx)
          .to.emit(meTokenRegistry, "FinishResubscribe")
          .withArgs(meTokenAddr0);
      });
    });

    describe("updateBalances()", () => {
      before(async () => {
        const earliestSwapTime = block.timestamp + 600 * 60; // 10h in future
        encodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
          ["uint256", "uint24"],
          [earliestSwapTime, fees]
        );

        tx = await meTokenRegistry
          .connect(account1)
          .initResubscribe(
            meTokenAddr1,
            targetHubId,
            migration.address,
            encodedMigrationArgs
          );
        await tx.wait();
      });

      it("revert when sender is not migration", async () => {
        await expect(
          meTokenRegistry.updateBalances(meTokenAddr0, 5)
        ).to.be.revertedWith("!migration");
      });

      it("Successfully call updateBalances() from migration", async () => {
        const meTokenRegistryDetails = await meTokenRegistry.getMeTokenInfo(
          meTokenAddr1
        );
        // forward time before endTime
        await mineBlock(meTokenRegistryDetails.endTime.toNumber() + 2);
        block = await ethers.provider.getBlock("latest");
        expect(meTokenRegistryDetails.endTime).to.be.lt(block.timestamp);

        tx = await meTokenRegistry
          .connect(account1)
          .finishResubscribe(meTokenAddr1);
        await tx.wait();

        await expect(tx)
          .to.emit(singleAssetVault, "StartMigration")
          .withArgs(meTokenAddr1)
          .to.emit(meTokenRegistry, "UpdateBalances")
          // TODO check args
          // .withArgs()
          .to.emit(meTokenRegistry, "FinishResubscribe")
          .withArgs(meTokenAddr1);

        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(meTokenAddr1);
        expect(meTokenInfo.owner).to.equal(account1.address);
        expect(meTokenInfo.hubId).to.equal(targetHubId);
        // TODO check args
        // expect(meTokenInfo.balancePooled).to.equal();
        // expect(meTokenInfo.balanceLocked).to.equal();
        expect(meTokenInfo.startTime).to.equal(0);
        expect(meTokenInfo.endTime).to.equal(0);
        // TODO check next line
        // expect(meTokenInfo.endCooldown).to.equal(0);
        expect(meTokenInfo.targetHubId).to.equal(0);
        expect(meTokenInfo.migration).to.equal(ethers.constants.AddressZero);
      });
    });

    describe("transferMeTokenOwnership()", () => {
      it("Fails if not a meToken owner", async () => {
        await expect(
          meTokenRegistry
            .connect(account3)
            .transferMeTokenOwnership(account2.address)
        ).to.revertedWith("meToken does not exist");
      });
      it("Fails if recipient already owns a meToken", async () => {
        await expect(
          meTokenRegistry.transferMeTokenOwnership(account1.address)
        ).to.revertedWith("_newOwner already owns a meToken");
      });
      it("Fails if _newOwner is address(0)", async () => {
        await expect(
          meTokenRegistry.transferMeTokenOwnership(ethers.constants.AddressZero)
        ).to.be.revertedWith("Cannot transfer to 0 address");
      });
      it("Successfully queues a recipient to claim ownership", async () => {
        expect(
          await meTokenRegistry.getPendingOwner(account1.address)
        ).to.equal(ethers.constants.AddressZero);
        tx = await meTokenRegistry
          .connect(account1)
          .transferMeTokenOwnership(account2.address);
        expect(
          await meTokenRegistry.getPendingOwner(account1.address)
        ).to.equal(account2.address);
      });
      it("Emits TransferOwnership()", async () => {
        expect(tx)
          .to.emit(meTokenRegistry, "TransferMeTokenOwnership")
          .withArgs(account1.address, account2.address, meTokenAddr1);
      });
      it("Fails to when pending ownership", async () => {
        await expect(
          meTokenRegistry
            .connect(account1)
            .transferMeTokenOwnership(account2.address)
        ).to.be.revertedWith("transfer ownership already pending");
      });
    });

    describe("cancelTransferMeTokenOwnership()", () => {
      it("Fails if owner has never called transferMeTokenOwnership()", async () => {
        await expect(
          meTokenRegistry.connect(account0).cancelTransferMeTokenOwnership()
        ).to.be.revertedWith("transferMeTokenOwnership() not initiated");
      });
      it("Fails if owner does not own a meToken", async () => {
        await expect(
          meTokenRegistry.connect(account2).cancelTransferMeTokenOwnership()
        ).to.be.revertedWith("meToken does not exist");
      });
      it("Successfully cancels transfer and removes from _pendingOwners", async () => {
        tx = await meTokenRegistry
          .connect(account1)
          .cancelTransferMeTokenOwnership();
        expect(
          await meTokenRegistry.getPendingOwner(account1.address)
        ).to.equal(ethers.constants.AddressZero);
      });
      it("Emits CancelTransferMeTokenOwnership()", async () => {
        expect(tx)
          .to.emit(meTokenRegistry, "CancelTransferMeTokenOwnership")
          .withArgs(account1.address, meTokenAddr1);
      });
    });

    describe("claimMeTokenOwnership()", () => {
      it("Fails if claimer already owns a meToken", async () => {
        // scenario 1: already owns a meToken, not a pending owner
        await expect(
          meTokenRegistry
            .connect(account0)
            .claimMeTokenOwnership(ethers.constants.AddressZero)
        ).to.be.revertedWith("Already owns a meToken");
        // Scenario 2: doesn't own a meToken and becomes pending owner for 2 meTokens,
        // claims ownership to the first, then tries claiming ownership to the second
        await meTokenRegistry
          .connect(account0)
          .transferMeTokenOwnership(account2.address);
        await meTokenRegistry
          .connect(account1)
          .transferMeTokenOwnership(account2.address);
        tx = await meTokenRegistry
          .connect(account2)
          .claimMeTokenOwnership(account0.address);
        await expect(
          meTokenRegistry
            .connect(account2)
            .claimMeTokenOwnership(account1.address)
        ).to.be.revertedWith("Already owns a meToken");
      });
      it("Fails if not claimer not pending owner from oldOwner", async () => {
        await expect(
          meTokenRegistry
            .connect(account3)
            .claimMeTokenOwnership(account1.address)
        ).to.be.revertedWith("!_pendingOwner");
      });
      it("Successfully completes claim and updates meToken struct, deletes old mappings", async () => {
        expect(
          await meTokenRegistry.getOwnerMeToken(account2.address)
        ).to.equal(meTokenAddr0);
        const info = await meTokenRegistry.getMeTokenInfo(meTokenAddr0);
        expect(info.owner).to.equal(account2.address);
        expect(
          await meTokenRegistry.getPendingOwner(account0.address)
        ).to.equal(ethers.constants.AddressZero);
        expect(
          await meTokenRegistry.getOwnerMeToken(account0.address)
        ).to.equal(ethers.constants.AddressZero);
      });
      it("Emits ClaimMeTokenOwnership()", async () => {
        expect(tx)
          .to.emit(meTokenRegistry, "ClaimMeTokenOwnership")
          .withArgs(account0.address, account2.address, meTokenAddr0);
      });
    });

    describe("isOwner()", () => {
      it("Returns false for address(0)", async () => {
        expect(await meTokenRegistry.isOwner(ethers.constants.AddressZero)).to
          .be.false;
      });
      it("Returns false for if address not an owner", async () => {
        expect(await meTokenRegistry.isOwner(account3.address)).to.be.false;
      });
      it("Returns true for a meToken issuer", async () => {
        expect(await meTokenRegistry.isOwner(account1.address)).to.be.true;
      });
    });
    describe("updateBalance", () => {
      it("updateBalancePooled()", async () => {
        await weth
          .connect(tokenHolder)
          .transfer(account0.address, tokenDeposited);
        await weth.approve(
          singleAssetVault.address,
          ethers.constants.MaxUint256
        );
        const meToken = await getContractAt<MeToken>("MeToken", meTokenAddr1);
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        const tx = await foundry.mint(
          meTokenAddr1,
          tokenDeposited,
          account0.address
        );
        await tx.wait();

        const amountDepositedAfterFee = tokenDeposited.sub(
          tokenDeposited.mul(await fee.mintFee()).div(PRECISION)
        );

        await expect(tx)
          .to.emit(meTokenRegistry, "UpdateBalancePooled")
          .withArgs(true, meTokenAddr1, amountDepositedAfterFee);
        const newMeTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        expect(
          newMeTokenInfo.balancePooled.sub(meTokenInfo.balancePooled)
        ).to.be.equal(amountDepositedAfterFee);
      });

      it("updateBalanceLocked() [TODO]", async () => {
        const meToken = await getContractAt<MeToken>("MeToken", meTokenAddr1);
        const meTokenTotalSupply = await meToken.totalSupply();
        const buyerMeToken = await meToken.balanceOf(account0.address);
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        const rawAssetsReturned = Number(
          calculateCollateralReturned(
            toETHNumber(buyerMeToken),
            toETHNumber(meTokenTotalSupply),
            toETHNumber(meTokenInfo.balancePooled),
            reserveWeight / MAX_WEIGHT
          ).toFixed(12)
        );
        const assetsReturned = (rawAssetsReturned * refundRatio) / MAX_WEIGHT;
        const lockedAmount = fromETHNumber(rawAssetsReturned - assetsReturned);

        const tx = await foundry.burn(
          meTokenAddr1,
          buyerMeToken,
          account0.address
        );
        await tx.wait();

        await expect(tx)
          .to.emit(meTokenRegistry, "UpdateBalancePooled")
          // TODO fails in next line, loosing precision by 1 wei.
          // .withArgs(false, meTokenAddr1, fromETHNumber(rawAssetsReturned))
          .to.emit(meTokenRegistry, "UpdateBalanceLocked")
          .withArgs(true, meTokenAddr1, lockedAmount);
        const newMeTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        expect(
          toETHNumber(
            meTokenInfo.balancePooled.sub(newMeTokenInfo.balancePooled)
          )
        ).to.be.approximately(rawAssetsReturned, 1e-15);
        expect(
          newMeTokenInfo.balanceLocked.sub(meTokenInfo.balanceLocked)
        ).to.be.equal(lockedAmount);
      });
      it("updateBalanceLocked() when owner burns [TODO]", async () => {
        await weth
          .connect(tokenHolder)
          .transfer(account1.address, tokenDeposited);
        await weth
          .connect(account1)
          .approve(singleAssetVault.address, ethers.constants.MaxUint256);
        await foundry
          .connect(account1)
          .mint(meTokenAddr1, tokenDeposited, account1.address);

        const meToken = await getContractAt<MeToken>("MeToken", meTokenAddr1);
        const meTokenTotalSupply = await meToken.totalSupply();
        const ownerMeToken = await meToken.balanceOf(account1.address);
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        const rawAssetsReturned = calculateCollateralReturned(
          toETHNumber(ownerMeToken),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenInfo.balancePooled),
          reserveWeight / MAX_WEIGHT
        );
        const assetsReturned =
          rawAssetsReturned +
          (toETHNumber(ownerMeToken) / toETHNumber(meTokenTotalSupply)) *
            toETHNumber(meTokenInfo.balanceLocked);
        const lockedAmount = assetsReturned - rawAssetsReturned;

        const tx = await foundry
          .connect(account1)
          .burn(meTokenAddr1, ownerMeToken, account1.address);
        await tx.wait();

        await expect(tx)
          .to.emit(meTokenRegistry, "UpdateBalancePooled")
          // TODO fails in next line, loosing precision
          // .withArgs(false, meTokenAddr1, fromETHNumber(rawAssetsReturned))
          .to.emit(meTokenRegistry, "UpdateBalanceLocked");
        // TODO fails in next line, loosing precision
        // .withArgs(false, meTokenAddr1, fromETHNumber(lockedAmount));
        const newMeTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        expect(
          toETHNumber(
            meTokenInfo.balancePooled.sub(newMeTokenInfo.balancePooled)
          )
        ).to.be.approximately(rawAssetsReturned, 1e-15);
        expect(
          toETHNumber(
            meTokenInfo.balanceLocked.sub(newMeTokenInfo.balanceLocked)
          )
        ).to.be.approximately(lockedAmount, 1e-13);
      });
    });
  });
};

setup().then(() => {
  run();
});
