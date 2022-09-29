import { expect } from "chai";
import { ethers, getNamedAccounts } from "hardhat";
import { Address } from "hardhat-deploy/dist/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  BigNumber,
  ContractReceipt,
  ContractTransaction,
  Signer,
} from "ethers";
import { hubSetup } from "../../utils/hubSetup";
import {
  calculateCollateralReturned,
  calculateTokenReturned,
  calculateTokenReturnedFromZero,
  deploy,
  fromETHNumber,
  getContractAt,
  toETHNumber,
} from "../../utils/helpers";
import { impersonate, mineBlock } from "../../utils/hardhatNode";
import {
  MeTokenRegistryFacet,
  HubFacet,
  FoundryFacet,
  FeesFacet,
  MeToken,
  ERC20,
  MigrationRegistry,
  SingleAssetVault,
  UniswapSingleTransferMigration,
  ICurveFacet,
} from "../../../artifacts/types";
import { getQuote } from "../../utils/uniswap";

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
    let fee: FeesFacet;
    let dai: ERC20;
    let weth: ERC20;
    let daiWhale: Signer;
    let wethWhale: Signer;
    let account0: SignerWithAddress;
    let account1: SignerWithAddress;
    let account2: SignerWithAddress;
    let account3: SignerWithAddress;
    let curve: ICurveFacet;
    let targetHubId: number;
    let migration: UniswapSingleTransferMigration;
    let meToken: Address;
    let encodedMigrationArgs: string;
    let receipt: ContractReceipt;
    let UNIV3Factory: string;

    const hubId = 1; // DAI
    const hubId2 = 2; // WETH
    const hubId3 = 3; // USDT
    const hubId4 = 4; // DAI
    const MAX_WEIGHT = 1000000;
    const PRECISION = BigNumber.from(10).pow(18);
    const reserveWeight = MAX_WEIGHT / 2;
    const baseY = PRECISION.div(1000);
    const hubWarmup = 7 * 24 * 60 * 60; // 1 week
    const warmup = 2 * 24 * 60 * 60; // 2 days
    const duration = 4 * 24 * 60 * 60; // 4 days
    const fees = 3000;
    const tokenDepositedInETH = 100;
    const tokenDeposited = ethers.utils.parseEther(
      tokenDepositedInETH.toString()
    );
    let block: any;
    before(async () => {
      let DAIWhale, WETHWhale;
      ({ DAI, WETH, DAIWhale, USDT, WETHWhale, UNIV3Factory } =
        await getNamedAccounts());
      dai = await getContractAt<ERC20>("ERC20", DAI);
      weth = await getContractAt<ERC20>("ERC20", WETH);
      daiWhale = await impersonate(DAIWhale);
      wethWhale = await impersonate(WETHWhale);
      await checkUniswapPoolLiquidity(DAI, WETH, fees);

      const encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [DAI]
      );

      ({
        hub,
        foundry,
        meTokenRegistry,
        migrationRegistry,
        singleAssetVault,
        fee,
        account0,
        curve,
        account1,
        account2,
        account3,
      } = await hubSetup(baseY, reserveWeight, encodedVaultArgs, refundRatio));
      await hub.register(
        account0.address,
        WETH,
        singleAssetVault.address,
        refundRatio, //refund ratio
        baseY,
        reserveWeight,
        encodedVaultArgs
      );
      await hub.register(
        account0.address,
        USDT,
        singleAssetVault.address,
        refundRatio, //refund ratio
        baseY,
        reserveWeight,
        encodedVaultArgs
      );
      await hub.register(
        account0.address,
        DAI,
        singleAssetVault.address,
        refundRatio,
        baseY.div(2),
        reserveWeight / 4,
        encodedVaultArgs
      );

      // Deploy uniswap migration and approve it to the registry
      migration = await deploy<UniswapSingleTransferMigration>(
        "UniswapSingleTransferMigration",
        undefined,
        account0.address, // DAO
        foundry.address // diamond
      );
      await migration.deployed();
    });

    describe("subscribe()", () => {
      it("should revert when hub is updating", async () => {
        await hub.initUpdate(hubId, refundRatio / 2, 0);
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
        const balBefore = await dai.balanceOf(account1.address);
        // need an approve of metoken registry first
        await dai
          .connect(account1)
          .approve(singleAssetVault.address, assetsDeposited);
        tx = await meTokenRegistry
          .connect(account1)
          .subscribe(name, symbol, hubId, assetsDeposited);
        tx.wait();
        const balAfter = await dai.balanceOf(account1.address);
        expect(balBefore.sub(balAfter)).equal(assetsDeposited);
        const hubDetail = await hub.getHubInfo(hubId);
        const balVault = await dai.balanceOf(hubDetail.vault);
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
        await dai.connect(daiWhale).transfer(account2.address, assetsDeposited);

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
      it("should revert if too short", async () => {
        const tx = meTokenRegistry.setMeTokenWarmup(1);
        await expect(tx).to.be.revertedWith("too short");
      });
      it("should revert if too long", async () => {
        const tx = meTokenRegistry.setMeTokenDuration(30 * 24 * 60 * 60);
      });
      it("should revert when warmup + duration > hub's warmup", async () => {
        const tx = meTokenRegistry.setMeTokenWarmup(hubWarmup);
        await expect(tx).to.be.revertedWith("> hubWarmup");
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
        await expect(tx).to.be.revertedWith("> hubWarmup");
      });
      it("should be able to setMeTokenDuration", async () => {
        tx = await meTokenRegistry.setMeTokenDuration(duration);
        await tx.wait();
        expect(await meTokenRegistry.meTokenDuration()).to.be.equal(duration);
      });
    });

    describe("initResubscribe()", () => {
      it("Fails if msg.sender not meToken owner", async () => {
        meToken = meTokenAddr0;
        targetHubId = hubId2;
        block = await ethers.provider.getBlock("latest");

        encodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
          ["uint24"],
          [fees]
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
      it("Fails if current hub update has passed the hub warmup", async () => {
        await hub.initUpdate(hubId, refundRatio / 4, 0);

        const { startTime, endTime } = await hub.getHubInfo(hubId);
        await mineBlock(startTime.toNumber() + 1);

        const tx = meTokenRegistry.initResubscribe(
          meTokenAddr0,
          hubId2,
          ethers.constants.AddressZero,
          "0x"
        );

        await expect(tx).to.be.revertedWith("hub updating");
        await mineBlock(endTime.toNumber() + 1);
        await hub.finishUpdate(hubId);
      });
      it("Fails if target hub currently updating", async () => {
        await hub.initUpdate(hubId2, refundRatio / 2, 0);

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

        const meTokenRegistryDetails = await meTokenRegistry.getMeTokenInfo(
          meTokenAddr0
        );

        expect(meTokenRegistryDetails.startTime).to.equal(expectedStartTime);
        expect(meTokenRegistryDetails.endTime).to.equal(expectedEndTime);
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
      it("Fails when attempting to resubscribe again", async () => {
        await expect(
          meTokenRegistry.initResubscribe(
            meToken,
            targetHubId,
            migration.address,
            encodedMigrationArgs
          )
        ).to.be.revertedWith("meToken still resubscribing");
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
      it("Successfully cancels resubscribe", async () => {
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

        encodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
          ["uint24"],
          [fees]
        );

        tx = await meTokenRegistry.initResubscribe(
          meToken,
          targetHubId,
          migration.address,
          encodedMigrationArgs
        );
        await tx.wait();
      });
      it("should revert if migration started (usts.started = true)", async () => {
        // forward time to after duration
        await mineBlock(
          (
            await meTokenRegistry.getMeTokenInfo(meTokenAddr0)
          ).endTime.toNumber() + 2
        );
        block = await ethers.provider.getBlock("latest");

        encodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
          ["uint24"],
          [fees]
        );

        await meTokenRegistry.initResubscribe(
          meToken,
          targetHubId,
          migration.address,
          encodedMigrationArgs
        );

        await dai.connect(daiWhale).transfer(account0.address, tokenDeposited);
        await dai.approve(
          singleAssetVault.address,
          ethers.constants.MaxUint256
        );
        await foundry.mint(meTokenAddr0, tokenDeposited, account0.address);

        await mineBlock(
          (
            await meTokenRegistry.getMeTokenInfo(meTokenAddr0)
          ).startTime.toNumber() + 2
        );

        tx = await migration.poke(meTokenAddr0); // would call startMigration and swap

        // called from startMigration
        await expect(tx)
          .to.emit(dai, "Transfer")
          .withArgs(
            singleAssetVault.address,
            migration.address,
            tokenDeposited
          );
        await expect(tx)
          .to.emit(singleAssetVault, "StartMigration")
          .withArgs(meTokenAddr0);
        // migration -> uniswap
        await expect(tx).to.emit(dai, "Transfer");
        // uniswap -> migration
        await expect(tx).to.emit(weth, "Transfer");

        // should revert to cancelResubscribe now
        await expect(
          meTokenRegistry.cancelResubscribe(meTokenAddr0)
        ).to.be.revertedWith("cannot cancel");
      });
    });

    describe("finishResubscribe()", () => {
      it("Fails if meToken not resubscribing", async () => {
        await expect(
          meTokenRegistry.connect(account1).finishResubscribe(meTokenAddr1)
        ).to.be.revertedWith("No targetHubId");
      });
      it("Fails if updating but endTime not reached", async () => {
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
        encodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
          ["uint24"],
          [fees]
        );

        tx = await meTokenRegistry
          .connect(account1)
          .initResubscribe(
            meTokenAddr1,
            targetHubId,
            migration.address,
            encodedMigrationArgs
          );
        const receipt = await tx.wait();
        const block = await ethers.provider.getBlock(receipt.blockNumber);
      });

      it("revert when sender is not migration", async () => {
        await expect(
          meTokenRegistry.updateBalances(meTokenAddr1, 5)
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

        const migrationDetails = await migration.getDetails(meTokenAddr1);
        const totalBalance = meTokenRegistryDetails.balanceLocked.add(
          meTokenRegistryDetails.balancePooled
        );
        const price = await getQuote(
          UNIV3Factory,
          dai,
          weth,
          migrationDetails.fee,
          totalBalance
        );

        tx = await meTokenRegistry
          .connect(account1)
          .finishResubscribe(meTokenAddr1);
        const receipt = await tx.wait();
        // extract the balance argument of UpdateBalances events
        const newBalance = BigNumber.from(
          (receipt.events?.find((e) => e.event == "UpdateBalances")?.args ??
            [])[1]
        );
        await expect(tx)
          .to.emit(singleAssetVault, "StartMigration")
          .withArgs(meTokenAddr1);
        await expect(tx)
          .to.emit(meTokenRegistry, "FinishResubscribe")
          .withArgs(meTokenAddr1);
        await expect(tx)
          .to.emit(meTokenRegistry, "UpdateBalances")
          .withArgs(meTokenAddr1, newBalance);
        // assert that newBalance make sense compared to the current market price
        expect(toETHNumber(newBalance)).to.be.approximately(
          Number(price.token0Price),
          0.01
        );
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(meTokenAddr1);
        expect(meTokenInfo.owner).to.equal(account1.address);
        expect(meTokenInfo.hubId).to.equal(targetHubId);
        const precision = ethers.utils.parseEther("1");
        const calculatedNewBalancePooled = meTokenRegistryDetails.balancePooled
          .mul(precision)
          .mul(newBalance)
          .div(totalBalance.mul(precision));
        expect(meTokenInfo.balancePooled).to.equal(calculatedNewBalancePooled);
        const calculatedNewBalanceLocked = meTokenRegistryDetails.balanceLocked
          .mul(precision)
          .mul(newBalance)
          .div(totalBalance.mul(precision));
        expect(meTokenInfo.balanceLocked).to.equal(calculatedNewBalanceLocked);
        expect(meTokenInfo.startTime).to.equal(0);
        expect(meTokenInfo.endTime).to.equal(0);
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
          .connect(wethWhale)
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

      it("updateBalanceLocked()", async () => {
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
        const receipt = await tx.wait();

        // extract the balance argument of UpdateBalances events
        const updateBalancePooled = BigNumber.from(
          meTokenRegistry.interface.parseLog(
            receipt.logs.find(
              (l) =>
                l.address == meTokenRegistry.address &&
                l.topics.includes(
                  meTokenRegistry.interface.getEventTopic("UpdateBalancePooled")
                )
            ) ?? {
              topics: [""],
              data: "",
            }
          ).args[2]
        );

        // assert that newBalance make sense compared to the current market price
        expect(rawAssetsReturned).to.equals(toETHNumber(updateBalancePooled));

        //
        await expect(tx)
          .to.emit(meTokenRegistry, "UpdateBalancePooled")
          .withArgs(false, meTokenAddr1, updateBalancePooled);

        await expect(tx)
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
      it("updateBalanceLocked() when owner burns", async () => {
        await weth
          .connect(wethWhale)
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
        const receipt = await tx.wait();
        // extract the balance argument of UpdateBalances events
        const updateBalancePooled = BigNumber.from(
          meTokenRegistry.interface.parseLog(
            receipt.logs.find(
              (l) =>
                l.address == meTokenRegistry.address &&
                l.topics.includes(
                  meTokenRegistry.interface.getEventTopic("UpdateBalancePooled")
                )
            ) ?? {
              topics: [""],
              data: "",
            }
          ).args[2]
        );
        // assert that rawAssetsReturned is equal to updateBalancePooled
        expect(rawAssetsReturned).to.equals(toETHNumber(updateBalancePooled));

        await expect(tx)
          .to.emit(meTokenRegistry, "UpdateBalancePooled")
          .withArgs(false, meTokenAddr1, updateBalancePooled);
        const updateBalanceLocked = BigNumber.from(
          meTokenRegistry.interface.parseLog(
            receipt.logs.find(
              (l) =>
                l.address == meTokenRegistry.address &&
                l.topics.includes(
                  meTokenRegistry.interface.getEventTopic("UpdateBalanceLocked")
                )
            ) ?? {
              topics: [""],
              data: "",
            }
          ).args[2]
        );
        // assert that lockedAmount equal to  updateBalanceLocked
        expect(lockedAmount).to.equals(toETHNumber(updateBalanceLocked));
        await expect(tx)
          .to.emit(meTokenRegistry, "UpdateBalanceLocked")
          .withArgs(false, meTokenAddr1, updateBalanceLocked);
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

    describe("setMeTokenWarmup()", () => {
      it("should revert if not durationsController", async () => {
        const tx = meTokenRegistry
          .connect(account1)
          .setMeTokenWarmup(warmup - 1);
        await expect(tx).to.be.revertedWith("!durationsController");
      });
      it("should revert if same as before", async () => {
        const oldWarmup = await meTokenRegistry.meTokenWarmup();
        const tx = meTokenRegistry.setMeTokenWarmup(oldWarmup);
        await expect(tx).to.be.revertedWith("same warmup");
      });
      it("should revert if less than 1 day buffer to hub warmup", async () => {
        // 6 days 1 second
        const tx = meTokenRegistry.setMeTokenWarmup(6 * 24 * 60 * 60 + 1);
        await expect(tx).to.be.revertedWith("> hubWarmup");
      });
      it("should revert if too short", async () => {
        const tx = meTokenRegistry.setMeTokenWarmup(1);
        await expect(tx).to.be.revertedWith("too short");
      });
      it("should revert if too long", async () => {
        // 30 days 1 second
        const tx = meTokenRegistry.setMeTokenWarmup(30 * 24 * 60 * 60 + 1);
        await expect(tx).to.be.revertedWith("too long");
      });
      it("should be able to call setMeTokenWarmup", async () => {
        const tx = await meTokenRegistry.setMeTokenWarmup(warmup - 1);
        await tx.wait();
        expect(await meTokenRegistry.meTokenWarmup()).to.be.equal(warmup - 1);
      });
    });

    describe("setMeTokenDuration()", () => {
      it("should revert if not durationsController", async () => {
        const tx = meTokenRegistry
          .connect(account1)
          .setMeTokenDuration(duration);
        await expect(tx).to.be.revertedWith("!durationsController");
      });
      it("should revert if same as before", async () => {
        const oldDuration = await meTokenRegistry.meTokenDuration();
        const tx = meTokenRegistry.setMeTokenDuration(oldDuration);
        await expect(tx).to.be.revertedWith("same duration");
      });

      it("should revert if too short", async () => {
        const tx = meTokenRegistry.setMeTokenDuration(1);
        await expect(tx).to.be.revertedWith("too short");
      });
      it("should revert if too long", async () => {
        const tx = meTokenRegistry.setMeTokenDuration(30 * 24 * 60 * 60 + 1);
        await expect(tx).to.be.revertedWith("too long");
      });
      it("should revert if less than 1 day buffer to hub warmup", async () => {
        // 6 days 1 second
        const tx = meTokenRegistry.setMeTokenDuration(6 * 24 * 60 * 60 + 1);
        await expect(tx).to.be.revertedWith("> hubWarmup");
      });
      it("should be able to call setMeTokenDuration", async () => {
        const tx = await meTokenRegistry.setMeTokenDuration(duration - 1);
        await tx.wait();
        expect(await meTokenRegistry.meTokenDuration()).to.be.equal(
          duration - 1
        );
      });
    });

    describe("initResubscribe - during hub update", () => {
      const targetReserveWeight = MAX_WEIGHT / 4;
      let meTokenAddr: string;
      let meToken: MeToken;

      before(async () => {
        const max = ethers.constants.MaxUint256;
        await weth.connect(account3).approve(singleAssetVault.address, max);
        await weth.connect(account3).approve(migration.address, max);
        await weth
          .connect(wethWhale)
          .transfer(account3.address, ethers.utils.parseEther("300"));

        // Acc3 creates their metoken
        const name = "Carl3 meToken";
        const symbol = "CARL3";
        await meTokenRegistry
          .connect(account3)
          .subscribe(name, symbol, hubId2, tokenDeposited);
        meTokenAddr = await meTokenRegistry.getOwnerMeToken(account3.address);
        meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);

        // hub1 inits update
        await hub.initUpdate(hubId4, 0, targetReserveWeight);
      });

      it("can resubscribe during hub warmup", async () => {
        // fast-fwd to shortly before startTime - which is still during warmup
        const { startTime } = await hub.getHubInfo(hubId4);
        await mineBlock(startTime.toNumber() - 600);

        // acc3 resubscribes to new hub
        const fee = 3000;
        const encodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
          ["uint24"],
          [fee]
        );
        await meTokenRegistry
          .connect(account3)
          .initResubscribe(
            meTokenAddr,
            hubId3,
            migration.address,
            encodedMigrationArgs
          );
      });
      it("during hub duration, weighted average is based on hub pre-update values", async () => {
        // Fast-fwd to after startTime but still during resubscribe
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(meTokenAddr);
        await mineBlock(meTokenInfo.endTime.toNumber() - 600);
        const hubInfo = await hub.getHubInfo(hubId4);
        // should should be live
        const block = await ethers.provider.getBlock("latest");
        expect(block.timestamp).to.be.gt(hubInfo.startTime);

        const meTokenTotalSupply = await meToken.totalSupply();
        const tokenDeposited = ethers.utils.parseEther("50");
        const balancePooled = (
          await meTokenRegistry.getMeTokenInfo(meToken.address)
        ).balancePooled;
        const targetTokenReturn = calculateTokenReturned(
          toETHNumber(tokenDeposited),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(balancePooled),
          reserveWeight / MAX_WEIGHT
        );

        const wethBalanceBefore = await weth.balanceOf(account3.address);
        const meTokenBalanceBefore = await meToken.balanceOf(account3.address);
        await foundry
          .connect(account3)
          .mint(meToken.address, tokenDeposited, account3.address);
        const wethBalanceAfter = await weth.balanceOf(account3.address);
        const meTokenBalanceAfter = await meToken.balanceOf(account3.address);

        expect(toETHNumber(wethBalanceBefore.sub(wethBalanceAfter))).to.equal(
          50
        );
        expect(
          toETHNumber(meTokenBalanceAfter.sub(meTokenBalanceBefore))
        ).to.be.approximately(targetTokenReturn, 1e-12);
      });
    });
  });
};

setup().then(() => {
  run();
});
