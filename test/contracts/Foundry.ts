import { ethers, getNamedAccounts } from "hardhat";
import { CurveRegistry } from "../../artifacts/types/CurveRegistry";
import { FoundryFacet } from "../../artifacts/types/FoundryFacet";
import { HubFacet } from "../../artifacts/types/HubFacet";
import { SameAssetTransferMigration } from "../../artifacts/types/SameAssetTransferMigration";
import {
  calculateCollateralReturned,
  calculateCollateralToDepositFromZero,
  calculateTokenReturned,
  calculateTokenReturnedFromZero,
  deploy,
  fromETHNumber,
  getContractAt,
  toETHNumber,
} from "../utils/helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Signer, BigNumber } from "ethers";
import { BancorABDK } from "../../artifacts/types/BancorABDK";
import { ERC20 } from "../../artifacts/types/ERC20";
import { MeTokenRegistryFacet } from "../../artifacts/types/MeTokenRegistryFacet";
import { MigrationRegistry } from "../../artifacts/types/MigrationRegistry";
import { SingleAssetVault } from "../../artifacts/types/SingleAssetVault";
import { mineBlock } from "../utils/hardhatNode";
import { MeToken } from "../../artifacts/types/MeToken";
import { expect } from "chai";
import { UniswapSingleTransferMigration } from "../../artifacts/types/UniswapSingleTransferMigration";
import { hubSetup } from "../utils/hubSetup";
import { Diamond, ICurve } from "../../artifacts/types";

const setup = async () => {
  describe("FoundryFacet.sol", () => {
    let DAI: string;
    let dai: ERC20;
    let diamond: Diamond;
    let WETH: string;
    let weth: ERC20;
    let account0: SignerWithAddress;
    let account1: SignerWithAddress;
    let account2: SignerWithAddress;
    let curve: ICurve;
    let meTokenRegistry: MeTokenRegistryFacet;
    let foundry: FoundryFacet;
    let token: ERC20;
    let meToken: MeToken;
    let tokenHolder: Signer;
    let hub: HubFacet;
    let singleAssetVault: SingleAssetVault;
    let migrationRegistry: MigrationRegistry;
    let curveRegistry: CurveRegistry;
    let encodedCurveDetails: string;
    let encodedVaultArgs: string;

    const hubId = 1;
    const name = "Carl meToken";
    const symbol = "CARL";
    const refundRatio = 240000;
    const initRefundRatio = 50000;
    const PRECISION = ethers.utils.parseEther("1");
    const amount = ethers.utils.parseEther("10");
    const amount1 = ethers.utils.parseEther("100");
    const tokenDepositedInETH = 10;
    const tokenDeposited = ethers.utils.parseEther(
      tokenDepositedInETH.toString()
    );
    const fee = 3000;

    const MAX_WEIGHT = 1000000;
    const reserveWeight = MAX_WEIGHT / 2;
    const baseY = PRECISION.div(1000);

    // for 1 DAI we get 1000 metokens
    // const baseY = ethers.utils.parseEther("1").mul(1000).toString();
    // weight at 50% linear curve
    // const reserveWeight = BigNumber.from(MAX_WEIGHT).div(2).toString();
    before(async () => {
      ({ DAI, WETH } = await getNamedAccounts());
      encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [DAI]
      );
      encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint32"],
        [baseY, reserveWeight]
      );
      ({
        token,
        tokenHolder,
        hub,
        curve,
        diamond,
        foundry,
        singleAssetVault,
        curveRegistry,
        migrationRegistry,
        meTokenRegistry,
        account0,
        account1,
        account2,
      } = await hubSetup(
        encodedCurveDetails,
        encodedVaultArgs,
        initRefundRatio,
        "bancorABDK"
      ));

      // Prefund owner/buyer w/ DAI
      dai = token;
      weth = await getContractAt<ERC20>("ERC20", WETH);
      await dai
        .connect(tokenHolder)
        .transfer(account0.address, amount1.mul(10));
      await weth
        .connect(tokenHolder)
        .transfer(account0.address, amount1.mul(10));
      await dai
        .connect(tokenHolder)
        .transfer(account1.address, amount1.mul(10));
      await dai
        .connect(tokenHolder)
        .transfer(account2.address, amount1.mul(10));
      const max = ethers.constants.MaxUint256;
      await dai.connect(account0).approve(singleAssetVault.address, max);
      await weth.connect(account0).approve(singleAssetVault.address, max);
      await dai.connect(account1).approve(singleAssetVault.address, max);
      await dai.connect(account2).approve(singleAssetVault.address, max);
      await dai.connect(account1).approve(meTokenRegistry.address, max);
      // account0 is registering a metoken
      await meTokenRegistry.connect(account0).subscribe(name, symbol, hubId, 0);
      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account0.address
      );

      meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);
    });

    it("mint() from buyer should work", async () => {
      // metoken should be registered
      expect(await meToken.name()).to.equal(name);
      expect(await meToken.symbol()).to.equal(symbol);
      expect(await meToken.decimals()).to.equal(18);
      expect(await meToken.totalSupply()).to.equal(0);

      const balBefore = await dai.balanceOf(account0.address);
      const tokenBalBefore = await meToken.balanceOf(account2.address);
      const meTokenDetails = await meTokenRegistry.getMeTokenDetails(
        meToken.address
      );
      // gas savings
      const totalSupply = await meToken.totalSupply();

      // mint
      const meTokensMinted = await curve.viewMeTokensMinted(
        amount,
        hubId,
        totalSupply,
        meTokenDetails.balancePooled
      );
      await foundry.mint(meToken.address, amount, account2.address);

      const tokenBalAfter = await meToken.balanceOf(account2.address);
      const balAfter = await dai.balanceOf(account0.address);
      expect(balBefore.sub(balAfter)).equal(amount);
      expect(tokenBalAfter.sub(tokenBalBefore)).equal(meTokensMinted);

      const hubDetail = await hub.getHubDetails(hubId);
      const balVault = await dai.balanceOf(hubDetail.vault);
      expect(balVault).equal(amount);

      // assert token infos
      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account0.address
      );
      expect(meTokenAddr).to.equal(meToken.address);
      // should be greater than 0
      expect(await meToken.totalSupply()).to.equal(
        totalSupply.add(meTokensMinted)
      );
    });
    it("burn() from buyer should work", async () => {
      const balBefore = await meToken.balanceOf(account2.address);
      const balDaiBefore = await dai.balanceOf(account2.address);
      await foundry
        .connect(account2)
        .burn(meToken.address, balBefore, account2.address);
      const balAfter = await meToken.balanceOf(account2.address);
      const balDaiAfter = await dai.balanceOf(account2.address);
      expect(balAfter).equal(0);
      expect(await meToken.totalSupply()).to.equal(0);

      const calculatedCollateralReturned = amount
        .mul(initRefundRatio)
        .div(MAX_WEIGHT);

      expect(balDaiAfter.sub(balDaiBefore)).equal(calculatedCollateralReturned);
    });

    describe("mint transfer burn", () => {
      before(async () => {
        // mint some to owner and burn. To make balance pool and locked 0
        await foundry.mint(meToken.address, 1, account0.address);
        await foundry.burn(
          meToken.address,
          await meToken.balanceOf(account0.address),
          account0.address
        );
        const meTokenDetails = await meTokenRegistry.getMeTokenDetails(
          meToken.address
        );
        expect(await meToken.totalSupply()).to.equal(0);
        expect(meTokenDetails.balanceLocked).to.equal(0);
        expect(meTokenDetails.balancePooled).to.equal(0);
      });

      describe("buyer mint and transfer a portion to an owner that burns it and then the buyer burns the remaining", () => {
        let collateralDeposited = fromETHNumber(0);
        let collateralReturned = fromETHNumber(0);
        it("buyer mint and transfer a portion to an owner", async () => {
          const calculatedReturn = calculateTokenReturnedFromZero(
            toETHNumber(PRECISION),
            toETHNumber(baseY),
            reserveWeight / MAX_WEIGHT
          );

          // burn mints some
          await foundry
            .connect(account1)
            .mint(meToken.address, PRECISION, account1.address);
          collateralDeposited = PRECISION;

          // buyer transfer half to owner
          await meToken
            .connect(account1)
            .transfer(
              account0.address,
              (await meToken.balanceOf(account1.address)).div(2)
            );

          expect(await meToken.balanceOf(account0.address)).to.equal(
            await meToken.balanceOf(account1.address)
          );
          expect(
            toETHNumber(await meToken.balanceOf(account0.address))
          ).to.be.approximately(calculatedReturn / 2, 1e-15);
        });

        it("owner burns", async () => {
          const DAIBefore = await token.balanceOf(account0.address);
          const rawAssetsReturned = calculateCollateralReturned(
            toETHNumber(await meToken.balanceOf(account0.address)),
            toETHNumber(await meToken.totalSupply()),
            toETHNumber(
              (await meTokenRegistry.getMeTokenDetails(meToken.address))
                .balancePooled
            ),
            reserveWeight / MAX_WEIGHT
          );

          await foundry.burn(
            meToken.address,
            await meToken.balanceOf(account0.address),
            account0.address
          );

          const DAIAfter = await token.balanceOf(account0.address);
          collateralReturned = collateralReturned.add(DAIAfter.sub(DAIBefore));
          expect(toETHNumber(DAIAfter.sub(DAIBefore))).to.equal(
            rawAssetsReturned
          );
        });

        it("buyer burns", async () => {
          const DAIBefore = await token.balanceOf(account1.address);
          const rawAssetsReturned = calculateCollateralReturned(
            toETHNumber(await meToken.balanceOf(account1.address)),
            toETHNumber(await meToken.totalSupply()),
            toETHNumber(
              (await meTokenRegistry.getMeTokenDetails(meToken.address))
                .balancePooled
            ),
            reserveWeight / MAX_WEIGHT
          );
          const assetsReturned =
            (rawAssetsReturned * initRefundRatio) / MAX_WEIGHT;

          await foundry
            .connect(account1)
            .burn(
              meToken.address,
              await meToken.balanceOf(account1.address),
              account1.address
            );

          const DAIAfter = await token.balanceOf(account1.address);
          collateralReturned = collateralReturned.add(DAIAfter.sub(DAIBefore));
          expect(toETHNumber(DAIAfter.sub(DAIBefore))).to.be.approximately(
            assetsReturned,
            1e-15
          );
        });
        it("owner can claim the remaining balanceLocked", async () => {
          // mint some to owner
          await foundry.mint(meToken.address, 1, account0.address);

          const ownerBalanceBefore = await token.balanceOf(account0.address);
          await foundry.burn(
            meToken.address,
            await meToken.balanceOf(account0.address),
            account0.address
          );
          const ownerBalanceAfter = await token.balanceOf(account0.address);

          collateralReturned = collateralReturned.add(
            ownerBalanceAfter.sub(ownerBalanceBefore).sub(1)
          );
        });
        it("collateral deposited === collateral returned", async () => {
          expect(toETHNumber(collateralDeposited)).to.be.approximately(
            toETHNumber(collateralReturned),
            1e-18
          );
        });
      });

      describe("owner mint and transfer a portion to an buyer that burns it and then the owner burns the remaining", () => {
        let collateralDeposited = fromETHNumber(0);
        let collateralReturned = fromETHNumber(0);
        it("owner mint and transfer a portion to an buyer", async () => {
          const calculatedReturn = calculateTokenReturnedFromZero(
            toETHNumber(PRECISION),
            toETHNumber(baseY),
            reserveWeight / MAX_WEIGHT
          );

          // owner mints some
          await foundry.mint(meToken.address, PRECISION, account0.address);
          collateralDeposited = PRECISION;

          // owner transfer half to buyer
          await meToken.transfer(
            account1.address,
            (await meToken.balanceOf(account0.address)).div(2)
          );

          expect(await meToken.balanceOf(account0.address)).to.equal(
            await meToken.balanceOf(account1.address)
          );
          expect(
            toETHNumber(await meToken.balanceOf(account1.address))
          ).to.be.approximately(calculatedReturn / 2, 1e-15);
        });

        it("buyer burns", async () => {
          const DAIBefore = await token.balanceOf(account1.address);
          const rawAssetsReturned = calculateCollateralReturned(
            toETHNumber(await meToken.balanceOf(account1.address)),
            toETHNumber(await meToken.totalSupply()),
            toETHNumber(
              (await meTokenRegistry.getMeTokenDetails(meToken.address))
                .balancePooled
            ),
            reserveWeight / MAX_WEIGHT
          );
          const assetsReturned =
            (rawAssetsReturned * initRefundRatio) / MAX_WEIGHT;

          await foundry
            .connect(account1)
            .burn(
              meToken.address,
              await meToken.balanceOf(account1.address),
              account1.address
            );

          const DAIAfter = await token.balanceOf(account1.address);
          collateralReturned = collateralReturned.add(DAIAfter.sub(DAIBefore));
          expect(toETHNumber(DAIAfter.sub(DAIBefore))).to.be.approximately(
            assetsReturned,
            1e-15
          );
        });

        it("owner burns", async () => {
          const ownerMeToken = await meToken.balanceOf(account0.address);
          const meTokenTotalSupply = await meToken.totalSupply();
          const meTokenDetails = await meTokenRegistry.getMeTokenDetails(
            meToken.address
          );
          const DAIBefore = await token.balanceOf(account0.address);
          const rawAssetsReturned = calculateCollateralReturned(
            toETHNumber(ownerMeToken),
            toETHNumber(meTokenTotalSupply),
            toETHNumber(meTokenDetails.balancePooled),
            reserveWeight / MAX_WEIGHT
          );
          const assetsReturned =
            rawAssetsReturned +
            (toETHNumber(ownerMeToken) / toETHNumber(meTokenTotalSupply)) *
              toETHNumber(meTokenDetails.balanceLocked);

          await foundry.burn(meToken.address, ownerMeToken, account0.address);

          const DAIAfter = await token.balanceOf(account0.address);
          collateralReturned = collateralReturned.add(DAIAfter.sub(DAIBefore));
          expect(toETHNumber(DAIAfter.sub(DAIBefore))).to.equal(assetsReturned);
        });

        it("collateral deposited === collateral returned", async () => {
          expect(toETHNumber(collateralDeposited)).to.be.approximately(
            toETHNumber(collateralReturned),
            1e-18
          );
        });
      });
    });

    describe("multiple burn and mint", () => {
      before(async () => {
        // mint some to owner and burn. To make balance pool and locked 0
        await foundry.mint(meToken.address, 1, account0.address);
        await foundry.burn(
          meToken.address,
          await meToken.balanceOf(account0.address),
          account0.address
        );
        const meTokenDetails = await meTokenRegistry.getMeTokenDetails(
          meToken.address
        );
        expect(await meToken.totalSupply()).to.equal(0);
        expect(meTokenDetails.balanceLocked).to.equal(0);
        expect(meTokenDetails.balancePooled).to.equal(0);
      });
      it("multiple mints by owner", async () => {
        const numberOfMints = 50;
        const ownerBalanceBefore = await token.balanceOf(account0.address);
        const vaultBalanceBefore = await token.balanceOf(
          singleAssetVault.address
        );
        let targetTokenReturn = 0;
        for (let i = 0; i < numberOfMints; i++) {
          if (i === 0) {
            targetTokenReturn = calculateTokenReturnedFromZero(
              toETHNumber(PRECISION),
              toETHNumber(baseY),
              reserveWeight / MAX_WEIGHT
            );
          } else {
            const meTokenTotalSupply = await meToken.totalSupply();
            const balancePooled = (
              await meTokenRegistry.getMeTokenDetails(meToken.address)
            ).balancePooled;

            targetTokenReturn += calculateTokenReturned(
              toETHNumber(PRECISION),
              toETHNumber(meTokenTotalSupply),
              toETHNumber(balancePooled),
              reserveWeight / MAX_WEIGHT
            );
          }
          await foundry.mint(meToken.address, PRECISION, account0.address);
        }
        const ownerBalanceAfter = await token.balanceOf(account0.address);
        const vaultBalanceAfter = await token.balanceOf(
          singleAssetVault.address
        );

        expect(ownerBalanceBefore.sub(ownerBalanceAfter)).to.equal(
          PRECISION.mul(numberOfMints)
        );
        expect(targetTokenReturn).to.be.approximately(
          toETHNumber(await meToken.totalSupply()),
          1e-12
        );
        expect(toETHNumber(vaultBalanceAfter.sub(vaultBalanceBefore))).to.equal(
          50
        );
      });
      it("multiple burns by owner", async () => {
        const numberOfBurns = 50;
        const ownerBalanceBefore = await token.balanceOf(account0.address);
        let singleBurnAmount = (await meToken.balanceOf(account0.address)).div(
          50
        );
        let targetCollateralReturn = 0;
        for (let i = 0; i < numberOfBurns; i++) {
          if (i === numberOfBurns - 1) {
            singleBurnAmount = await meToken.balanceOf(account0.address);
          }
          const meTokenTotalSupply = await meToken.totalSupply();
          const balancePooled = (
            await meTokenRegistry.getMeTokenDetails(meToken.address)
          ).balancePooled;
          targetCollateralReturn += calculateCollateralReturned(
            toETHNumber(singleBurnAmount),
            toETHNumber(meTokenTotalSupply),
            toETHNumber(balancePooled),
            reserveWeight / MAX_WEIGHT
          );
          await foundry.burn(
            meToken.address,
            singleBurnAmount,
            account0.address
          );
        }
        const ownerBalanceAfter = await token.balanceOf(account0.address);
        expect(ownerBalanceAfter.sub(ownerBalanceBefore)).to.equal(
          PRECISION.mul(numberOfBurns)
        );
        expect(
          toETHNumber(ownerBalanceAfter.sub(ownerBalanceBefore))
        ).to.be.approximately(targetCollateralReturn, 1e-14);
      });

      it("multiple mints by buyer", async () => {
        const numberOfMints = 50;
        const buyerBalanceBefore = await token.balanceOf(account1.address);
        const vaultBalanceBefore = await token.balanceOf(
          singleAssetVault.address
        );
        let targetTokenReturn = 0;
        for (let i = 0; i < numberOfMints; i++) {
          if (i === 0) {
            targetTokenReturn = calculateTokenReturnedFromZero(
              toETHNumber(PRECISION),
              toETHNumber(baseY),
              reserveWeight / MAX_WEIGHT
            );
          } else {
            const meTokenTotalSupply = await meToken.totalSupply();
            const balancePooled = (
              await meTokenRegistry.getMeTokenDetails(meToken.address)
            ).balancePooled;

            targetTokenReturn += calculateTokenReturned(
              toETHNumber(PRECISION),
              toETHNumber(meTokenTotalSupply),
              toETHNumber(balancePooled),
              reserveWeight / MAX_WEIGHT
            );
          }
          await foundry
            .connect(account1)
            .mint(meToken.address, PRECISION, account1.address);
        }
        const buyerBalanceAfter = await token.balanceOf(account1.address);
        const vaultBalanceAfter = await token.balanceOf(
          singleAssetVault.address
        );

        expect(buyerBalanceBefore.sub(buyerBalanceAfter)).to.equal(
          PRECISION.mul(numberOfMints)
        );
        expect(targetTokenReturn).to.be.approximately(
          toETHNumber(await meToken.totalSupply()),
          1e-12
        );
        expect(toETHNumber(vaultBalanceAfter.sub(vaultBalanceBefore))).to.equal(
          50
        );
      });
      let assetsReturned = 0;
      it("multiple burns by buyer", async () => {
        const numberOfBurns = 50;
        const buyerBalanceBefore = await token.balanceOf(account1.address);
        let singleBurnAmount = (await meToken.balanceOf(account1.address)).div(
          50
        );
        const vaultBalanceBefore = await token.balanceOf(
          singleAssetVault.address
        );
        let targetCollateralReturn = 0;
        for (let i = 0; i < numberOfBurns; i++) {
          if (i === numberOfBurns - 1) {
            singleBurnAmount = await meToken.balanceOf(account1.address);
          }
          const meTokenTotalSupply = await meToken.totalSupply();
          const balancePooled = (
            await meTokenRegistry.getMeTokenDetails(meToken.address)
          ).balancePooled;
          targetCollateralReturn += calculateCollateralReturned(
            toETHNumber(singleBurnAmount),
            toETHNumber(meTokenTotalSupply),
            toETHNumber(balancePooled),
            reserveWeight / MAX_WEIGHT
          );
          await foundry
            .connect(account1)
            .burn(meToken.address, singleBurnAmount, account1.address);
        }
        assetsReturned =
          (targetCollateralReturn * initRefundRatio) / MAX_WEIGHT;

        const buyerBalanceAfter = await token.balanceOf(account1.address);
        const vaultBalanceAfter = await token.balanceOf(
          singleAssetVault.address
        );

        expect(
          toETHNumber(vaultBalanceBefore.sub(vaultBalanceAfter))
        ).to.be.approximately(assetsReturned, 1e-15);
        expect(
          toETHNumber(buyerBalanceAfter.sub(buyerBalanceBefore))
        ).to.be.approximately(assetsReturned, 1e-15);
      });

      it("owner can claim the remaining balanceLocked", async () => {
        // mint some to owner
        await foundry.mint(meToken.address, 1, account0.address);

        const ownerBalanceBefore = await token.balanceOf(account0.address);
        await foundry.burn(
          meToken.address,
          await meToken.balanceOf(account0.address),
          account0.address
        );
        const ownerBalanceAfter = await token.balanceOf(account0.address);

        expect(
          toETHNumber(ownerBalanceAfter.sub(ownerBalanceBefore))
        ).to.be.approximately(50 - assetsReturned, 1e-15);
        expect(await meToken.totalSupply()).to.equal(0);
        expect(await token.balanceOf(singleAssetVault.address)).to.equal(0);
      });
    });

    describe("mint()", () => {
      it("balanceLocked = 0, balancePooled = 0, mint on meToken creation", async () => {
        let expectedMeTokensMinted = await curve.viewMeTokensMinted(
          amount1,
          hubId,
          0,
          0
        );

        // Get balances before mint
        let minterDaiBalanceBefore = await dai.balanceOf(account1.address);
        let vaultDaiBalanceBefore = await dai.balanceOf(
          singleAssetVault.address
        );
        // let expectedAssetsDeposited = await curve.viewAssetsDeposited(
        //   expectedMeTokensMinted,
        //   hubId,
        //   0,
        //   0
        // );
        const calculated = calculateCollateralToDepositFromZero(
          toETHNumber(expectedMeTokensMinted),
          toETHNumber(baseY),
          reserveWeight / MAX_WEIGHT
        );
        let res = toETHNumber(expectedMeTokensMinted);
        res = toETHNumber(baseY);
        expect(toETHNumber(amount1)).to.approximately(
          calculated,
          0.000000000000000000000001
        );

        // expect(toETHNumber(amount1)).to.approximately(
        //   toETHNumber(expectedAssetsDeposited),
        //   0.000000000000000000000001
        // );

        // Mint first meTokens to owner account1
        let tx = await meTokenRegistry
          .connect(account1)
          .subscribe(name, symbol, hubId, amount1);
        let meTokenAddr = await meTokenRegistry.getOwnerMeToken(
          account1.address
        );

        meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);

        // Compare expected meTokens minted to actual held
        let meTokensMinted = await meToken.balanceOf(account1.address);
        expect(meTokensMinted).to.equal(expectedMeTokensMinted);
        let totalSupply = await meToken.totalSupply();
        expect(totalSupply).to.equal(meTokensMinted);

        // Compare owner dai balance before/after
        let minterDaiBalanceAfter = await dai.balanceOf(account1.address);

        expect(
          // TODO: how to verify difference of numbers to type of amount1?
          minterDaiBalanceBefore.sub(minterDaiBalanceAfter)
        ).to.equal(amount1);

        // Expect balance of vault to have increased by assets deposited
        let vaultDaiBalanceAfter = await dai.balanceOf(
          singleAssetVault.address
        );
        expect(vaultDaiBalanceAfter.sub(vaultDaiBalanceBefore)).to.equal(
          amount1
        );
      });

      it("balanceLocked = 0, balancePooled = 0, mint after meToken creation", async () => {
        let expectedMeTokensMinted = await curve.viewMeTokensMinted(
          amount1,
          hubId,
          0,
          0
        );
        // let expectedAssetsDeposited = await curve.viewAssetsDeposited(
        //   expectedMeTokensMinted,
        //   hubId,
        //   0,
        //   0
        // );
        // Get balances before mint
        let minterDaiBalanceBefore = await dai.balanceOf(account2.address);
        let vaultDaiBalanceBefore = await dai.balanceOf(
          singleAssetVault.address
        );

        // Create meToken w/o issuing supply and account2 as the owner
        const tx = await meTokenRegistry
          .connect(account2)
          .subscribe(name, symbol, hubId, 0);
        const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
          account2.address
        );

        meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);

        // Mint meToken
        await foundry
          .connect(account2)
          .mint(meToken.address, amount1, account2.address);
        // Compare expected meTokens minted to actual held
        const meTokensMinted = await meToken.balanceOf(account2.address);
        expect(meTokensMinted).to.equal(expectedMeTokensMinted);
        const totalSupply = await meToken.totalSupply();
        expect(totalSupply).to.equal(meTokensMinted);
        // Compare buyer dai balance before/after
        let minterDaiBalanceAfter = await dai.balanceOf(account2.address);
        expect(minterDaiBalanceBefore.sub(minterDaiBalanceAfter)).to.equal(
          amount1
        );

        // Expect balance of vault to have increased by assets deposited
        let vaultDaiBalanceAfter = await dai.balanceOf(
          singleAssetVault.address
        );
        expect(vaultDaiBalanceAfter.sub(vaultDaiBalanceBefore)).to.equal(
          amount1
        );
        // expect(toETHNumber(amount1)).to.be.approximately(
        //   toETHNumber(expectedAssetsDeposited),
        //   0.000000000000000001
        // );
      });

      it("balanceLocked = 0, balancePooled > 0", async () => {
        // burn all. balanceLocked = 0, balancePooled = 0
        await foundry
          .connect(account2)
          .burn(
            meToken.address,
            await meToken.balanceOf(account2.address),
            account2.address
          );

        // when mints
        await foundry
          .connect(account1)
          .mint(meToken.address, tokenDeposited, account1.address);
        const meTokenRegistryDetails = await meTokenRegistry.getMeTokenDetails(
          meToken.address
        );
        expect(meTokenRegistryDetails.balanceLocked).to.equal(0);
        expect(meTokenRegistryDetails.balancePooled).to.be.gt(0);
      });

      it("balanceLocked > 0, balancePooled = 0", async () => {
        // when buyer burns
        await foundry
          .connect(account1)
          .burn(
            meToken.address,
            await meToken.balanceOf(account1.address),
            account1.address
          );
        const meTokenRegistryDetails = await meTokenRegistry.getMeTokenDetails(
          meToken.address
        );
        expect(meTokenRegistryDetails.balancePooled).to.equal(0);
        expect(meTokenRegistryDetails.balanceLocked).to.be.gt(0);
      });

      it("balanceLocked > 0, balancePooled > 0", async () => {
        // when mints
        await foundry
          .connect(account1)
          .mint(meToken.address, tokenDeposited, account1.address);
        const meTokenRegistryDetails = await meTokenRegistry.getMeTokenDetails(
          meToken.address
        );
        expect(meTokenRegistryDetails.balanceLocked).to.be.gt(0);
        expect(meTokenRegistryDetails.balancePooled).to.be.gt(0);
      });
    });

    describe("burn()", () => {
      it("balanceLocked > 0, ending supply = 0, buyer", async () => {
        await foundry
          .connect(account1)
          .burn(
            meToken.address,
            await meToken.balanceOf(account1.address),
            account1.address
          );
        const meTokenRegistryDetails = await meTokenRegistry.getMeTokenDetails(
          meToken.address
        );
        expect(await meToken.totalSupply()).to.be.equal(0);
        expect(meTokenRegistryDetails.balanceLocked).to.be.gt(0);
        expect(meTokenRegistryDetails.balancePooled).to.be.equal(0);
      });
      it("balanceLocked = 0, ending supply = 0, owner", async () => {
        // mint some to owner
        await foundry
          .connect(account2)
          .mint(meToken.address, tokenDeposited, account2.address);

        await foundry
          .connect(account2)
          .burn(
            meToken.address,
            await meToken.balanceOf(account2.address),
            account2.address
          );
        const meTokenRegistryDetails = await meTokenRegistry.getMeTokenDetails(
          meToken.address
        );
        expect(await meToken.totalSupply()).to.be.equal(0);
        expect(meTokenRegistryDetails.balanceLocked).to.be.equal(0);
        expect(meTokenRegistryDetails.balancePooled).to.be.equal(0);
      });
      it("balanceLocked > 0, ending supply > 0, buyer", async () => {
        // mint some to buyer
        await foundry
          .connect(account1)
          .mint(meToken.address, tokenDeposited, account1.address);

        // mint some to owner
        await foundry
          .connect(account2)
          .mint(meToken.address, tokenDeposited, account2.address);

        // burn buyer shares
        await foundry
          .connect(account1)
          .burn(
            meToken.address,
            await meToken.balanceOf(account1.address),
            account1.address
          );
        const meTokenRegistryDetails = await meTokenRegistry.getMeTokenDetails(
          meToken.address
        );
        expect(await meToken.totalSupply()).to.be.gt(0);
        expect(meTokenRegistryDetails.balanceLocked).to.be.gt(0);
        expect(meTokenRegistryDetails.balancePooled).to.be.gt(0);
      });
      it("balanceLocked = 0, ending supply > 0, owner", async () => {
        // burn all owner shares
        await foundry
          .connect(account2)
          .burn(
            meToken.address,
            await meToken.balanceOf(account2.address),
            account2.address
          );

        // mint some to owner
        await foundry
          .connect(account2)
          .mint(meToken.address, tokenDeposited, account2.address);

        // burn some owner shares
        await foundry
          .connect(account2)
          .burn(
            meToken.address,
            (await meToken.balanceOf(account2.address)).div(2),
            account2.address
          );

        const meTokenRegistryDetails = await meTokenRegistry.getMeTokenDetails(
          meToken.address
        );
        expect(await meToken.totalSupply()).to.be.gt(0);
        expect(meTokenRegistryDetails.balanceLocked).to.equal(0);
        expect(meTokenRegistryDetails.balancePooled).to.be.gt(0);
      });
      it("balanceLocked > 0, ending supply = 0, owner", async () => {
        // burn from buyer
        await foundry
          .connect(account2)
          .burn(
            meToken.address,
            await meToken.balanceOf(account2.address),
            account2.address
          );

        // mint some to buyer
        await foundry
          .connect(account1)
          .mint(meToken.address, tokenDeposited, account1.address);

        // burn from buyer
        await foundry
          .connect(account1)
          .burn(
            meToken.address,
            await meToken.balanceOf(account1.address),
            account1.address
          );

        const meTokenRegistryDetails = await meTokenRegistry.getMeTokenDetails(
          meToken.address
        );
        expect(await meToken.totalSupply()).to.be.equal(0);
        expect(meTokenRegistryDetails.balanceLocked).to.be.gt(0);
        expect(meTokenRegistryDetails.balancePooled).to.be.equal(0);
      });
      it("balanceLocked > 0, ending supply > 0, owner", async () => {
        // mint some to buyer
        await foundry
          .connect(account1)
          .mint(meToken.address, tokenDeposited, account1.address);
      });
      after(async () => {
        await foundry
          .connect(account1)
          .burn(
            meToken.address,
            await meToken.balanceOf(account1.address),
            account1.address
          );
      });
    });

    describe("during migration", () => {
      before(async () => {
        // migrate hub
        // refund ratio stays the same
        const targetRefundRatio = 200000;

        const newCurve = await deploy<BancorABDK>(
          "BancorABDK",
          undefined,
          hub.address
        );

        await curveRegistry.approve(newCurve.address);
        // for 1 DAI we get 1 metokens
        const baseY = PRECISION.toString();
        // weight at 10% quadratic curve
        const reserveWeight = BigNumber.from(MAX_WEIGHT).div(4).toString();

        const encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
          ["uint256", "uint32"],
          [baseY, reserveWeight]
        );
        const migrationFactory = await deploy<UniswapSingleTransferMigration>(
          "UniswapSingleTransferMigration",
          undefined, //no libs
          account1.address, // DAO
          foundry.address, // foundry
          hub.address, // hub
          meTokenRegistry.address, //IMeTokenRegistry
          migrationRegistry.address //IMigrationRegistry
        );
        const block = await ethers.provider.getBlock("latest");
        // earliestSwapTime 10 hour
        const earliestSwapTime = block.timestamp + 600 * 60;
        const encodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
          ["uint256"],
          [earliestSwapTime]
        );
        // 10 hour
        await hub.setHubDuration(600 * 60);
        await hub.setHubWarmup(60 * 60);
        await hub.setHubCooldown(60 * 60);
        // vault stays the same
        await hub.initUpdate(
          hubId,
          newCurve.address,
          targetRefundRatio,
          encodedCurveDetails
        );
      });
      it("mint() Should work the same right after the migration ", async () => {
        // metoken should be registered
        let hubDetail = await hub.getHubDetails(hubId);
        expect(hubDetail.reconfigure).to.be.false;
        expect(hubDetail.updating).to.be.true;

        const amount = ethers.utils.parseEther("100");
        const balTokenBefore = await meToken.balanceOf(account2.address);
        await dai.connect(tokenHolder).transfer(account2.address, amount);
        const balBefore = await dai.balanceOf(account2.address);
        const balVaultBefore = await dai.balanceOf(hubDetail.vault);
        const totSupplyBefore = await meToken.totalSupply();
        const tokenBalBefore = await meToken.balanceOf(account2.address);

        await foundry
          .connect(account2)
          .mint(meToken.address, amount, account2.address);
        const balAfter = await dai.balanceOf(account2.address);
        const balTokenAfter = await meToken.balanceOf(account2.address);
        expect(balTokenAfter).to.be.gt(balTokenBefore);
        expect(balBefore.sub(balAfter)).equal(amount);

        hubDetail = await hub.getHubDetails(hubId);
        const balVaultAfter = await dai.balanceOf(hubDetail.vault);
        expect(balVaultAfter.sub(balVaultBefore)).equal(amount);

        // assert token infos
        const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
          account2.address
        );
        expect(meTokenAddr).to.equal(meToken.address);
        // should be greater than 0
        const totSupplyAfter = await meToken.totalSupply();
        const tokenBalAfter = await meToken.balanceOf(account2.address);
        expect(tokenBalAfter).to.be.gt(tokenBalBefore);
        expect(totSupplyAfter.sub(totSupplyBefore)).to.equal(
          tokenBalAfter.sub(tokenBalBefore)
        );
      });
      it("burn() Should work", async () => {
        const balBefore = await meToken.balanceOf(account2.address);
        const balDaiBefore = await dai.balanceOf(account2.address);

        const hubDetail = await hub.getHubDetails(hubId);
        const balVaultBefore = await dai.balanceOf(hubDetail.vault);
        await foundry
          .connect(account2)
          .burn(meToken.address, balBefore, account2.address);
        const balAfter = await meToken.balanceOf(account2.address);
        const balDaiAfter = await dai.balanceOf(account2.address);
        expect(balAfter).equal(0);
        expect(await meToken.totalSupply()).to.equal(0);
        expect(balDaiAfter).to.be.gt(balDaiBefore);

        const balVaultAfter = await dai.balanceOf(hubDetail.vault);
        expect(balVaultBefore.sub(balVaultAfter)).equal(
          balDaiAfter.sub(balDaiBefore)
        );
      });
      it("mint() Should work after some time during the migration ", async () => {
        // metoken should be registered
        let block = await ethers.provider.getBlock("latest");
        await mineBlock(block.timestamp + 60 * 60);

        const hubDetail = await hub.getHubDetails(hubId);
        block = await ethers.provider.getBlock("latest");
        expect(hubDetail.startTime).to.be.lt(block.timestamp);
        const balVaultBefore = await dai.balanceOf(hubDetail.vault);
        const balBefore = await dai.balanceOf(account2.address);

        await foundry
          .connect(account2)
          .mint(meToken.address, amount, account2.address);
        const balAfter = await dai.balanceOf(account2.address);
        expect(balBefore.sub(balAfter)).equal(amount);

        const balVaultAfter = await dai.balanceOf(hubDetail.vault);
        expect(balVaultAfter).equal(balVaultBefore.add(amount));
        // assert token infos
        const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
          account2.address
        );
        expect(meTokenAddr).to.equal(meToken.address);
        // should be greater than 0
        expect(await meToken.totalSupply()).to.equal(
          await meToken.balanceOf(account2.address)
        );
      });
      after(async () => {
        const oldDetails = await hub.getHubDetails(hubId);
        await mineBlock(oldDetails.endTime.toNumber() + 2);
        const block = await ethers.provider.getBlock("latest");
        expect(oldDetails.endTime).to.be.lt(block.timestamp);

        await hub.finishUpdate(hubId);
        const newDetails = await hub.getHubDetails(hubId);
        expect(newDetails.updating).to.be.equal(false);
      });
    });
    describe("donate with same asset migration", () => {
      let migration: SameAssetTransferMigration;
      before(async () => {
        await hub.register(
          account0.address,
          DAI,
          singleAssetVault.address,
          curve.address,
          refundRatio,
          encodedCurveDetails,
          encodedVaultArgs
        );
        migration = await deploy<SameAssetTransferMigration>(
          "SameAssetTransferMigration",
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

        const encodedMigrationArgs = "0x";

        await meTokenRegistry
          .connect(account2)
          .initResubscribe(
            meToken.address,
            2,
            migration.address,
            encodedMigrationArgs
          );
        expect(
          (await meTokenRegistry.getMeTokenDetails(meToken.address)).migration
        ).to.equal(migration.address);
      });
      it("should revert when meToken is resubscribing", async () => {
        await expect(foundry.donate(meToken.address, 10)).to.be.revertedWith(
          "meToken resubscribing"
        );
      });
      it("should be able to donate", async () => {
        const meTokenRegistryDetails = await meTokenRegistry.getMeTokenDetails(
          meToken.address
        );
        await mineBlock(meTokenRegistryDetails.endTime.toNumber() + 2);
        const block = await ethers.provider.getBlock("latest");
        expect(meTokenRegistryDetails.endTime).to.be.lt(block.timestamp);
        await meTokenRegistry.finishResubscribe(meToken.address);

        const oldVaultBalance = await dai.balanceOf(singleAssetVault.address);
        const oldAccountBalance = await dai.balanceOf(account0.address);
        const oldMeTokenDetails = await meTokenRegistry.getMeTokenDetails(
          meToken.address
        );
        const oldAccruedFee = await singleAssetVault.accruedFees(dai.address);

        const assetsDeposited = 10;
        const tx = await foundry.donate(meToken.address, assetsDeposited);

        await expect(tx)
          .to.emit(foundry, "Donate")
          .withArgs(
            meToken.address,
            dai.address,
            account0.address,
            assetsDeposited
          )
          .to.emit(singleAssetVault, "HandleDeposit")
          .withArgs(account0.address, dai.address, assetsDeposited, 0)
          .to.emit(meTokenRegistry, "UpdateBalanceLocked")
          .withArgs(true, meToken.address, assetsDeposited);

        const newMeTokenDetails = await meTokenRegistry.getMeTokenDetails(
          meToken.address
        );
        const newVaultBalance = await dai.balanceOf(singleAssetVault.address);
        const newAccountBalance = await dai.balanceOf(account0.address);
        const newAccruedFee = await singleAssetVault.accruedFees(dai.address);

        expect(oldMeTokenDetails.balanceLocked.add(assetsDeposited)).to.equal(
          newMeTokenDetails.balanceLocked
        );
        expect(oldMeTokenDetails.balancePooled).to.equal(
          newMeTokenDetails.balancePooled
        );
        expect(oldVaultBalance.add(assetsDeposited)).to.equal(newVaultBalance);
        expect(oldAccountBalance.sub(assetsDeposited)).to.equal(
          newAccountBalance
        );
        expect(oldAccruedFee).to.equal(newAccruedFee);
      });
    });

    describe("donate with same UniswapSingleTransfer migration", () => {
      let migration: UniswapSingleTransferMigration;
      before(async () => {
        await hub.register(
          account0.address,
          WETH,
          singleAssetVault.address,
          curve.address,
          refundRatio,
          encodedCurveDetails,
          encodedVaultArgs
        );
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

        let block = await ethers.provider.getBlock("latest");
        const earliestSwapTime = block.timestamp + 600 * 60; // 10h in future
        const encodedMigrationArgs = ethers.utils.defaultAbiCoder.encode(
          ["uint256", "uint24"],
          [earliestSwapTime, fee]
        );

        await meTokenRegistry
          .connect(account2)
          .initResubscribe(
            meToken.address,
            3,
            migration.address,
            encodedMigrationArgs
          );
        expect(
          (await meTokenRegistry.getMeTokenDetails(meToken.address)).migration
        ).to.equal(migration.address);
        const migrationDetails = await migration.getDetails(meToken.address);
        await mineBlock(migrationDetails.soonest.toNumber() + 2);

        block = await ethers.provider.getBlock("latest");
        expect(migrationDetails.soonest).to.be.lt(block.timestamp);
      });
      it("should revert when meToken is resubscribing", async () => {
        await expect(foundry.donate(meToken.address, 10)).to.be.revertedWith(
          "meToken resubscribing"
        );
      });
      it("should be able to donate", async () => {
        await meTokenRegistry.finishResubscribe(meToken.address);

        const oldDAIVaultBalance = await dai.balanceOf(
          singleAssetVault.address
        );
        const oldWETHVaultBalance = await weth.balanceOf(
          singleAssetVault.address
        );
        const oldAccountBalance = await weth.balanceOf(account0.address);
        const oldMeTokenDetails = await meTokenRegistry.getMeTokenDetails(
          meToken.address
        );
        const oldAccruedFee = await singleAssetVault.accruedFees(weth.address);

        const assetsDeposited = 10;
        const tx = await foundry.donate(meToken.address, assetsDeposited);

        await expect(tx)
          .to.emit(foundry, "Donate")
          .withArgs(
            meToken.address,
            weth.address,
            account0.address,
            assetsDeposited
          )
          .to.emit(singleAssetVault, "HandleDeposit")
          .withArgs(account0.address, weth.address, assetsDeposited, 0)
          .to.emit(meTokenRegistry, "UpdateBalanceLocked")
          .withArgs(true, meToken.address, assetsDeposited);

        const newMeTokenDetails = await meTokenRegistry.getMeTokenDetails(
          meToken.address
        );
        const newDAIVaultBalance = await dai.balanceOf(
          singleAssetVault.address
        );
        const newWETHVaultBalance = await weth.balanceOf(
          singleAssetVault.address
        );
        const newAccountBalance = await weth.balanceOf(account0.address);
        const newAccruedFee = await singleAssetVault.accruedFees(weth.address);

        expect(oldMeTokenDetails.balanceLocked.add(assetsDeposited)).to.equal(
          newMeTokenDetails.balanceLocked
        );
        expect(oldMeTokenDetails.balancePooled).to.equal(
          newMeTokenDetails.balancePooled
        );
        expect(oldDAIVaultBalance).to.equal(newDAIVaultBalance);
        expect(oldWETHVaultBalance.add(assetsDeposited)).to.equal(
          newWETHVaultBalance
        );
        expect(oldAccountBalance.sub(assetsDeposited)).to.equal(
          newAccountBalance
        );
        expect(oldAccruedFee).to.equal(newAccruedFee);
      });
    });
  });
};

setup().then(() => {
  run();
});
