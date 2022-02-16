import { ethers, getNamedAccounts } from "hardhat";
import { hubSetup } from "../../utils/hubSetup";
import {
  calculateTokenReturned,
  calculateCollateralReturned,
  deploy,
  getContractAt,
  toETHNumber,
  weightedAverageSimulation,
} from "../../utils/helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, Signer } from "ethers";
import { CurveRegistry } from "../../../artifacts/types/CurveRegistry";
import { ERC20 } from "../../../artifacts/types/ERC20";
import { BancorABDK } from "../../../artifacts/types/BancorABDK";
import { FoundryFacet } from "../../../artifacts/types/FoundryFacet";
import { HubFacet } from "../../../artifacts/types/HubFacet";
import { MeTokenRegistryFacet } from "../../../artifacts/types/MeTokenRegistryFacet";
import { expect } from "chai";
import { MeToken } from "../../../artifacts/types/MeToken";
import { SingleAssetVault } from "../../../artifacts/types/SingleAssetVault";
import {
  mineBlock,
  passDays,
  passHours,
  passSeconds,
  setAutomine,
} from "../../utils/hardhatNode";
import { ICurve } from "../../../artifacts/types/ICurve";

const setup = async () => {
  describe("HubFacet - update CurveDetails", () => {
    let meTokenRegistry: MeTokenRegistryFacet;
    let curve: ICurve;
    let updatedBancorABDK: BancorABDK;
    let curveRegistry: CurveRegistry;
    let singleAssetVault: SingleAssetVault;
    let foundry: FoundryFacet;
    let hub: HubFacet;
    let token: ERC20;
    let dai: ERC20;
    let meToken: MeToken;
    let account0: SignerWithAddress;
    let tokenHolder: Signer;
    let account1: SignerWithAddress;
    let account2: SignerWithAddress;
    let account3: SignerWithAddress;
    const one = ethers.utils.parseEther("1");
    let baseY: BigNumber;
    let baseYNum: number;
    let updatedBaseYNum: number;
    let updatedBaseY: BigNumber;
    let reserveWeight: number;
    let updatedReserveWeight: number;
    const MAX_WEIGHT = 1000000;
    let encodedCurveDetails: string;
    const firstHubId = 1;
    const refundRatio = 5000;
    before(async () => {
      updatedBaseYNum = 10000;
      updatedBaseY = one.mul(updatedBaseYNum);
      updatedReserveWeight = MAX_WEIGHT / 10;
      baseYNum = 1000;
      baseY = one.mul(baseYNum);
      reserveWeight = MAX_WEIGHT / 2;
      let DAI;
      ({ DAI } = await getNamedAccounts());

      encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint32"],
        [baseY, reserveWeight]
      );
      const encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [DAI]
      );

      ({
        token,
        hub,
        curve,
        foundry,
        curveRegistry,
        singleAssetVault,
        tokenHolder,
        account0,
        account1,
        account2,
        account3,
        meTokenRegistry,
      } = await hubSetup(
        encodedCurveDetails,
        encodedVaultArgs,
        refundRatio,
        "bancorABDK"
      ));
      dai = token;

      // Pre-load owner and buyer w/ DAI
      await token
        .connect(tokenHolder)
        .transfer(account2.address, ethers.utils.parseEther("1000"));
      // Create meToken and subscribe to Hub1
      const tokenDeposited = ethers.utils.parseEther("100");
      const name = "Carl0 meToken";
      const symbol = "CARL";

      await meTokenRegistry
        .connect(account0)
        .subscribe(name, symbol, firstHubId, 0);
      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account0.address
      );
      meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);

      let max = ethers.constants.MaxUint256;
      await token.connect(account0).approve(singleAssetVault.address, max);
      await token.connect(account1).approve(singleAssetVault.address, max);
      await token.connect(account2).approve(singleAssetVault.address, max);

      const vaultBalBefore = await token.balanceOf(singleAssetVault.address);
      await foundry
        .connect(account2)
        .mint(meTokenAddr, tokenDeposited, account2.address);
      const vaultBalAfter = await token.balanceOf(singleAssetVault.address);
      expect(vaultBalAfter.sub(vaultBalBefore)).to.equal(tokenDeposited);
      //setHubWarmup for 2 days
      let warmup = await hub.hubWarmup();
      expect(warmup).to.equal(0);
      await hub.setHubWarmup(172800);

      warmup = await hub.hubWarmup();
      expect(warmup).to.equal(172800);
      let cooldown = await hub.hubCooldown();
      expect(cooldown).to.equal(0);
      //setCooldown for 1 day
      await hub.setHubCooldown(86400);
      cooldown = await hub.hubCooldown();
      expect(cooldown).to.equal(86400);

      let duration = await hub.hubDuration();
      expect(duration).to.equal(0);
      //setDuration for 1 week
      await hub.setHubDuration(604800);
      duration = await hub.hubDuration();
      expect(duration).to.equal(604800);
    });

    describe("Warmup", () => {
      it("should revert initUpdate() if targetCurve is the current curve", async () => {
        const updatedEncodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
          ["uint256", "uint32"],
          [updatedBaseY, updatedReserveWeight]
        );
        await expect(
          hub.initUpdate(
            firstHubId,
            curve.address,
            0,
            updatedEncodedCurveDetails
          )
        ).to.be.revertedWith("targetCurve==curve");
      });
      it("Assets received based on initial initialCurveDetails", async () => {
        const updatedEncodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
          ["uint256", "uint32"],
          [updatedBaseY, updatedReserveWeight]
        );

        updatedBancorABDK = await deploy<BancorABDK>(
          "BancorABDK",
          undefined,
          hub.address
        );

        await curveRegistry.approve(updatedBancorABDK.address);
        await hub.initUpdate(
          firstHubId,
          updatedBancorABDK.address,
          0,
          updatedEncodedCurveDetails
        );

        const tokenDepositedInETH = 100;
        const tokenDeposited = ethers.utils.parseEther(
          tokenDepositedInETH.toString()
        );

        const balBefore = await meToken.balanceOf(account0.address);
        const balDaiBefore = await token.balanceOf(account0.address);
        const vaultBalBefore = await token.balanceOf(singleAssetVault.address);
        const meTokenTotalSupply = await meToken.totalSupply();
        const calculatedReturn = calculateTokenReturned(
          tokenDepositedInETH,
          toETHNumber(meTokenTotalSupply),
          toETHNumber(vaultBalBefore),
          reserveWeight / MAX_WEIGHT
        );
        await foundry
          .connect(account2)
          .mint(meToken.address, tokenDeposited, account0.address);
        const balAfter = await meToken.balanceOf(account0.address);
        const vaultBalAfter = await token.balanceOf(singleAssetVault.address);

        expect(toETHNumber(balAfter)).to.be.approximately(
          calculatedReturn,
          0.000000000000001
        );
        expect(vaultBalAfter.sub(vaultBalBefore)).to.equal(tokenDeposited);
        const balDaiAcc1Before = await token.balanceOf(account1.address);

        //send half burnt by owner
        await foundry
          .connect(account0)
          .burn(meToken.address, balAfter, account0.address);
        const balDaiAfter = await token.balanceOf(account0.address);
        const vaultBalAfterBurn = await token.balanceOf(
          singleAssetVault.address
        );

        // we have less DAI in the vault cos they have been sent to the burner
        expect(vaultBalAfter.sub(vaultBalAfterBurn)).to.equal(
          balDaiAfter.sub(balDaiBefore)
        );
        // buyer
        const balAcc1Before = await meToken.balanceOf(account1.address);
        await foundry
          .connect(account1)
          .mint(meToken.address, tokenDeposited, account1.address);
        const vaultBalAfterMint = await token.balanceOf(
          singleAssetVault.address
        );

        expect(vaultBalAfterMint.sub(vaultBalAfterBurn)).to.equal(
          tokenDeposited
        );

        const balAcc1After = await meToken.balanceOf(account1.address);
        expect(balAcc1After.sub(balAcc1Before)).to.equal(
          balAfter.sub(balBefore).sub(ethers.utils.parseUnits("1", "wei"))
        );
        //send half burnt by buyer
        await foundry
          .connect(account1)
          .burn(meToken.address, balAcc1After, account1.address);
        const balDaiAcc1After = await token.balanceOf(account1.address);

        const vaultBalAfterBuyerBurn = await token.balanceOf(
          singleAssetVault.address
        );
        // we have less DAI in the vault cos they have been sent to the burner
        expect(vaultBalAfterMint.sub(vaultBalAfterBuyerBurn)).to.equal(
          balDaiAcc1After.sub(balDaiAcc1Before.sub(tokenDeposited))
        );
        expect(
          Number(
            ethers.utils.formatEther(
              tokenDeposited.sub(balDaiAcc1Before.sub(balDaiAcc1After))
            )
          )
        ).to.equal((tokenDepositedInETH * refundRatio) / MAX_WEIGHT);
      });
    });

    describe("Duration", () => {
      before(async () => {
        await passHours(1);
      });
      it("Assets received for buyer based on weighted average  of curveDetails on burning full supply ", async () => {
        //move forward  3 Days
        await passDays(3);
        const tokenDepositedInETH = 100;
        const tokenDeposited = ethers.utils.parseEther(
          tokenDepositedInETH.toString()
        );
        const vaultBalBefore = await token.balanceOf(singleAssetVault.address);

        // send token to owner
        await foundry
          .connect(account2)
          .mint(meToken.address, tokenDeposited, account2.address);
        const balDaiAfterMint = await token.balanceOf(account2.address);
        const balAfter = await meToken.balanceOf(account2.address);

        const vaultBalAfterMint = await token.balanceOf(
          singleAssetVault.address
        );
        expect(vaultBalAfterMint.sub(vaultBalBefore)).to.equal(tokenDeposited);

        const balBefore = await meToken.balanceOf(account0.address);
        const balDaiBefore = await token.balanceOf(account0.address);
        const vaultBalBeforeBurn = await token.balanceOf(
          singleAssetVault.address
        );
        const meTokenTotalSupply = await meToken.totalSupply();
        const meTokenDetails = await meTokenRegistry.getMeTokenDetails(
          meToken.address
        );

        const rawAssetsReturned = calculateCollateralReturned(
          toETHNumber(balAfter),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenDetails.balancePooled),
          reserveWeight / MAX_WEIGHT
        );
        const targetAssetsReturned = calculateCollateralReturned(
          toETHNumber(balAfter),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenDetails.balancePooled),
          updatedReserveWeight / MAX_WEIGHT
        );
        await foundry
          .connect(account2)
          .burn(meToken.address, balAfter, account2.address);
        const balDaiAfterBurn = await token.balanceOf(account2.address);
        const meTokenDetailsAfterBurn = await meTokenRegistry.getMeTokenDetails(
          meToken.address
        );
        const {
          active,
          refundRatio,
          updating,
          startTime,
          endTime,
          endCooldown,
          reconfigure,
          targetRefundRatio,
        } = await hub.getHubDetails(1);
        expect(active).to.be.true;
        expect(updating).to.be.true;
        const block = await ethers.provider.getBlock("latest");
        const assetsReturned =
          (rawAssetsReturned * refundRatio.toNumber()) / MAX_WEIGHT;
        const calcWAvgRes = weightedAverageSimulation(
          rawAssetsReturned,
          targetAssetsReturned,
          startTime.toNumber(),
          endTime.toNumber(),
          block.timestamp
        );
        const calculatedReturn = ethers.utils
          .parseEther(`${assetsReturned}`)
          .mul(BigNumber.from(Math.floor(calcWAvgRes)))
          .div(BigNumber.from(10 ** 6));
        // we get the calcWAvgRes percentage of the tokens returned by the Metokens burn
        // expect(balDaiAfterBurn.sub(balDaiAfterMint)).to.equal(calculatedReturn);
        expect(
          toETHNumber(balDaiAfterBurn.sub(balDaiAfterMint))
        ).to.be.approximately(assetsReturned, 0.000000000000001);
      });
      it("Assets received for buyer based on weighted average  of curveDetails on not burning full supply ", async () => {
        const tokenDepositedInETH = 100;
        const tokenDeposited = ethers.utils.parseEther(
          tokenDepositedInETH.toString()
        );
        const vaultBalBefore = await token.balanceOf(singleAssetVault.address);

        // send token to owner
        await foundry
          .connect(account2)
          .mint(meToken.address, tokenDeposited, account2.address);
        const balDaiAfterMint = await token.balanceOf(account2.address);
        const balAfter = await meToken.balanceOf(account2.address);

        const vaultBalAfterMint = await token.balanceOf(
          singleAssetVault.address
        );
        expect(vaultBalAfterMint.sub(vaultBalBefore)).to.equal(tokenDeposited);

        const balBefore = await meToken.balanceOf(account0.address);
        const balDaiBefore = await token.balanceOf(account0.address);
        const vaultBalBeforeBurn = await token.balanceOf(
          singleAssetVault.address
        );
        const meTokenTotalSupply = await meToken.totalSupply();
        const meTokenDetails = await meTokenRegistry.getMeTokenDetails(
          meToken.address
        );
        const metokenToBurn = balAfter.div(2);
        const rawAssetsReturned = calculateCollateralReturned(
          toETHNumber(metokenToBurn),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenDetails.balancePooled),
          reserveWeight / MAX_WEIGHT
        );
        const targetAssetsReturned = calculateCollateralReturned(
          toETHNumber(metokenToBurn),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenDetails.balancePooled),
          updatedReserveWeight / MAX_WEIGHT
        );

        await foundry
          .connect(account2)
          .burn(meToken.address, metokenToBurn, account2.address);
        const balDaiAfterBurn = await token.balanceOf(account2.address);
        const meTokenDetailsAfterBurn = await meTokenRegistry.getMeTokenDetails(
          meToken.address
        );
        const {
          active,
          refundRatio,
          updating,
          startTime,
          endTime,
          endCooldown,
          reconfigure,
          targetRefundRatio,
        } = await hub.getHubDetails(1);
        expect(active).to.be.true;
        expect(updating).to.be.true;
        const block = await ethers.provider.getBlock("latest");

        const calcWAvgRes = weightedAverageSimulation(
          rawAssetsReturned,
          targetAssetsReturned,
          startTime.toNumber(),
          endTime.toNumber(),
          block.timestamp
        );
        const assetsReturned =
          (calcWAvgRes * refundRatio.toNumber()) / MAX_WEIGHT;
        const calculatedReturn = ethers.utils
          .parseEther(`${assetsReturned}`)
          .mul(BigNumber.from(Math.floor(calcWAvgRes)))
          .div(BigNumber.from(10 ** 6));
        // we get the calcWAvgRes percentage of the tokens returned by the Metokens burn
        // expect(balDaiAfterBurn.sub(balDaiAfterMint)).to.equal(calculatedReturn);
        expect(
          toETHNumber(balDaiAfterBurn.sub(balDaiAfterMint))
        ).to.be.approximately(assetsReturned, 0.000000000000001);
      });
      it("Assets received for owner based on weighted average  of curveDetails on not burning full supply ", async () => {
        const tokenDepositedInETH = 100;
        const tokenDeposited = ethers.utils.parseEther(
          tokenDepositedInETH.toString()
        );
        await token
          .connect(account1)
          .transfer(account0.address, ethers.utils.parseEther("100"));
        const vaultBalBefore = await token.balanceOf(singleAssetVault.address);

        // send token to owner
        await foundry.mint(meToken.address, tokenDeposited, account0.address);
        const balDaiAfterMint = await token.balanceOf(account0.address);
        const balAfter = await meToken.balanceOf(account0.address);

        const vaultBalAfterMint = await token.balanceOf(
          singleAssetVault.address
        );
        expect(vaultBalAfterMint.sub(vaultBalBefore)).to.equal(tokenDeposited);

        const balBefore = await meToken.balanceOf(account0.address);
        const balDaiBefore = await token.balanceOf(account0.address);
        const vaultBalBeforeBurn = await token.balanceOf(
          singleAssetVault.address
        );
        const meTokenTotalSupply = await meToken.totalSupply();
        const meTokenDetails = await meTokenRegistry.getMeTokenDetails(
          meToken.address
        );
        const metokenToBurn = balAfter.div(2);
        const rawAssetsReturned = calculateCollateralReturned(
          toETHNumber(metokenToBurn),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenDetails.balancePooled),
          reserveWeight / MAX_WEIGHT
        );
        const targetAssetsReturned = calculateCollateralReturned(
          toETHNumber(metokenToBurn),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenDetails.balancePooled),
          updatedReserveWeight / MAX_WEIGHT
        );
        const meTokenDetailsBeforeBurn =
          await meTokenRegistry.getMeTokenDetails(meToken.address);
        await foundry
          .connect(account0)
          .burn(meToken.address, metokenToBurn, account0.address);

        const balDaiAfterBurn = await token.balanceOf(account0.address);

        const {
          active,
          refundRatio,
          updating,
          startTime,
          endTime,
          endCooldown,
          reconfigure,
          targetRefundRatio,
        } = await hub.getHubDetails(1);
        expect(active).to.be.true;
        expect(updating).to.be.true;
        const block = await ethers.provider.getBlock("latest");
        // the weighted average on the curve should be applied for owner and buyers
        const calcWAvgRes = weightedAverageSimulation(
          rawAssetsReturned,
          targetAssetsReturned,
          startTime.toNumber(),
          endTime.toNumber(),
          block.timestamp
        );
        // but the owner gets a proportional share of the token burnt from the balanced locked
        const assetsReturned =
          calcWAvgRes +
          (toETHNumber(metokenToBurn) / toETHNumber(meTokenTotalSupply)) *
            toETHNumber(meTokenDetailsBeforeBurn.balanceLocked);

        const calculatedReturn = ethers.utils
          .parseEther(`${assetsReturned}`)
          .mul(BigNumber.from(Math.floor(calcWAvgRes)))
          .div(BigNumber.from(10 ** 6));

        // we get the calcWAvgRes percentage of the tokens returned by the Metokens burn
        // expect(balDaiAfterBurn.sub(balDaiAfterMint)).to.equal(calculatedReturn);
        expect(
          toETHNumber(balDaiAfterBurn.sub(balDaiAfterMint))
        ).to.be.approximately(assetsReturned, 0.0000000000001);
      });
      it("mint(): assets received based on weighted average of curveDetails", async () => {
        const tokenDepositedInETH = 100;
        const tokenDeposited = ethers.utils.parseEther(
          tokenDepositedInETH.toString()
        );
        const vaultBalBefore = await token.balanceOf(singleAssetVault.address);
        await setAutomine(false);
        const block = await ethers.provider.getBlock("latest");

        const balBefore = await meToken.balanceOf(account3.address);

        const meTokenTotalSupply = await meToken.totalSupply();
        const meTokenDetails = await meTokenRegistry.getMeTokenDetails(
          meToken.address
        );

        const calcTokenReturn = calculateTokenReturned(
          tokenDepositedInETH,
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenDetails.balancePooled),
          reserveWeight / MAX_WEIGHT
        );

        const calcTargetTokenReturn = calculateTokenReturned(
          tokenDepositedInETH,
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenDetails.balancePooled),
          updatedReserveWeight / MAX_WEIGHT
        );
        const { active, updating, startTime, endTime } =
          await hub.getHubDetails(1);
        expect(active).to.be.true;
        expect(updating).to.be.true;

        //  take into account the time when
        // the mint transaction will be included
        const calcWAvgRes = weightedAverageSimulation(
          calcTokenReturn,
          calcTargetTokenReturn,
          startTime.toNumber(),
          endTime.toNumber(),
          block.timestamp + 1
        );
        // to be precise we set the next block timestamp to be the same of when we ask for tokenMinted
        //  await setNextBlockTimestamp(block.timestamp);
        // buyer mint metokens
        await foundry
          .connect(account2)
          .mint(meToken.address, tokenDeposited, account3.address);
        await mineBlock(block.timestamp + 1);
        await setAutomine(true);
        const balDaiAfterMint = await token.balanceOf(account2.address);
        const balAfter = await meToken.balanceOf(account3.address);
        const vaultBalAfterMint = await token.balanceOf(
          singleAssetVault.address
        );
        expect(vaultBalAfterMint.sub(vaultBalBefore)).to.equal(tokenDeposited);
        expect(toETHNumber(balAfter.sub(balBefore))).to.be.approximately(
          calcWAvgRes,
          0.00000000000001
        );
      });
    });

    describe("Cooldown", () => {
      it("should revert initUpdate() if before cool down", async () => {
        const { active, updating, endTime, reconfigure } =
          await hub.getHubDetails(1);
        expect(active).to.be.true;
        expect(updating).to.be.true;
        expect(reconfigure).to.be.false;
        const block = await ethers.provider.getBlock("latest");

        //Block.timestamp should be between endTime and endCooldown
        // move forward to cooldown
        await passSeconds(endTime.sub(block.timestamp).toNumber() + 1);
        await expect(
          hub.initUpdate(1, curve.address, 1000, ethers.utils.toUtf8Bytes(""))
        ).to.be.revertedWith("Still cooling down");
      });

      it("burn() and mint() by owner should use the targetCurveDetails", async () => {
        const tokenDepositedInETH = 100;
        const tokenDeposited = ethers.utils.parseEther(
          tokenDepositedInETH.toString()
        );
        await token
          .connect(account1)
          .transfer(account0.address, ethers.utils.parseEther("100"));
        const vaultBalBefore = await token.balanceOf(singleAssetVault.address);
        const balBefore = await meToken.balanceOf(account0.address);

        let meTokenTotalSupply = await meToken.totalSupply();
        let meTokenDetails = await meTokenRegistry.getMeTokenDetails(
          meToken.address
        );
        // the updated curve should be applied
        const calcTargetTokenReturn = calculateTokenReturned(
          tokenDepositedInETH,
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenDetails.balancePooled),
          updatedReserveWeight / MAX_WEIGHT
        );
        // send token to owner
        await foundry.mint(meToken.address, tokenDeposited, account0.address);
        const balDaiAfterMint = await token.balanceOf(account0.address);
        const balAfter = await meToken.balanceOf(account0.address);
        expect(toETHNumber(balAfter.sub(balBefore))).to.be.approximately(
          calcTargetTokenReturn,
          0.0000000000001
        );

        const vaultBalAfterMint = await token.balanceOf(
          singleAssetVault.address
        );
        expect(vaultBalAfterMint.sub(vaultBalBefore)).to.equal(tokenDeposited);

        meTokenTotalSupply = await meToken.totalSupply();
        meTokenDetails = await meTokenRegistry.getMeTokenDetails(
          meToken.address
        );
        const metokenToBurn = balAfter.div(2);
        const {
          active,
          refundRatio,
          updating,
          startTime,
          endTime,
          endCooldown,
          reconfigure,
          targetRefundRatio,
          curve,
          targetCurve,
        } = await hub.getHubDetails(1);
        const targetAssetsReturned = calculateCollateralReturned(
          toETHNumber(metokenToBurn),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenDetails.balancePooled),
          updatedReserveWeight / MAX_WEIGHT
        );
        calculateCollateralReturned(
          toETHNumber(metokenToBurn),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenDetails.balancePooled),
          reserveWeight / MAX_WEIGHT
        );

        const meTokenDetailsBeforeBurn =
          await meTokenRegistry.getMeTokenDetails(meToken.address);

        await foundry
          .connect(account0)
          .burn(meToken.address, metokenToBurn, account0.address);

        const balDaiAfterBurn = await token.balanceOf(account0.address);
        const currentCurve = await getContractAt<BancorABDK>(
          "BancorABDK",
          curve
        );
        const hubTargetCurve = await getContractAt<BancorABDK>(
          "BancorABDK",
          targetCurve
        );
        const block = await ethers.provider.getBlock("latest");
        expect(updatedBancorABDK.address).to.equal(currentCurve.address);
        expect(hubTargetCurve.address).to.equal(ethers.constants.AddressZero);
        expect(endCooldown).to.be.gt(block.timestamp);
        expect(active).to.be.true;
        expect(updating).to.be.false;
        expect(reconfigure).to.be.false;

        // the weighted average on the curve should be applied for owner and buyers
        // but the owner gets a proportional share of the token burnt from the balanced locked
        const assetsReturned =
          targetAssetsReturned +
          (toETHNumber(metokenToBurn) / toETHNumber(meTokenTotalSupply)) *
            toETHNumber(meTokenDetailsBeforeBurn.balanceLocked);

        // we get the calcWAvgRes percentage of the tokens returned by the Metokens burn
        // expect(balDaiAfterBurn.sub(balDaiAfterMint)).to.equal(calculatedReturn);
        expect(
          toETHNumber(balDaiAfterBurn.sub(balDaiAfterMint))
        ).to.be.approximately(assetsReturned, 0.00000000001);
      });
      it("burn() and mint() by buyer should use the targetCurveDetails", async () => {
        const tokenDepositedInETH = 100;
        const tokenDeposited = ethers.utils.parseEther(
          tokenDepositedInETH.toString()
        );

        const vaultBalBefore = await token.balanceOf(singleAssetVault.address);
        const balBefore = await meToken.balanceOf(account2.address);

        let meTokenTotalSupply = await meToken.totalSupply();
        let meTokenDetails = await meTokenRegistry.getMeTokenDetails(
          meToken.address
        );
        // the updated curve should be applied
        const calcTargetTokenReturn = calculateTokenReturned(
          tokenDepositedInETH,
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenDetails.balancePooled),
          updatedReserveWeight / MAX_WEIGHT
        );
        // send token to owner
        await foundry
          .connect(account2)
          .mint(meToken.address, tokenDeposited, account2.address);
        const balDaiAfterMint = await token.balanceOf(account2.address);
        const balAfter = await meToken.balanceOf(account2.address);

        expect(toETHNumber(balAfter.sub(balBefore))).to.be.approximately(
          calcTargetTokenReturn,
          0.0000000000001
        );

        const vaultBalAfterMint = await token.balanceOf(
          singleAssetVault.address
        );
        expect(vaultBalAfterMint.sub(vaultBalBefore)).to.equal(tokenDeposited);

        meTokenTotalSupply = await meToken.totalSupply();
        meTokenDetails = await meTokenRegistry.getMeTokenDetails(
          meToken.address
        );
        const metokenToBurn = balAfter.div(2);
        const {
          active,
          refundRatio,
          updating,
          startTime,
          endTime,
          endCooldown,
          reconfigure,
          targetRefundRatio,
          curve,
          targetCurve,
        } = await hub.getHubDetails(1);
        const targetAssetsReturned = calculateCollateralReturned(
          toETHNumber(metokenToBurn),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenDetails.balancePooled),
          updatedReserveWeight / MAX_WEIGHT
        );
        const normalAssetsReturned = calculateCollateralReturned(
          toETHNumber(metokenToBurn),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenDetails.balancePooled),
          reserveWeight / MAX_WEIGHT
        );

        const meTokenDetailsBeforeBurn =
          await meTokenRegistry.getMeTokenDetails(meToken.address);

        await foundry
          .connect(account2)
          .burn(meToken.address, metokenToBurn, account2.address);

        const balDaiAfterBurn = await token.balanceOf(account2.address);
        const currentCurve = await getContractAt<BancorABDK>(
          "BancorABDK",
          curve
        );
        const hubTargetCurve = await getContractAt<BancorABDK>(
          "BancorABDK",
          targetCurve
        );
        const block = await ethers.provider.getBlock("latest");
        expect(updatedBancorABDK.address).to.equal(currentCurve.address);
        expect(hubTargetCurve.address).to.equal(ethers.constants.AddressZero);
        expect(endCooldown).to.be.gt(block.timestamp);
        expect(active).to.be.true;
        expect(updating).to.be.false;
        expect(reconfigure).to.be.false;

        // as it is a buyer we apply the refund ratio
        const assetsReturned =
          (targetAssetsReturned * refundRatio.toNumber()) / MAX_WEIGHT;

        // we get the calcWAvgRes percentage of the tokens returned by the Metokens burn
        // expect(balDaiAfterBurn.sub(balDaiAfterMint)).to.equal(calculatedReturn);
        expect(
          toETHNumber(balDaiAfterBurn.sub(balDaiAfterMint))
        ).to.be.approximately(assetsReturned, 0.00000000001);
      });
    });

    describe("When reconfiguring", () => {
      before(async () => {
        const { endTime, endCooldown, refundRatio, startTime } =
          await hub.getHubDetails(1);
        const block = await ethers.provider.getBlock("latest");
        expect(block.timestamp).to.be.gt(endTime);
        //expect(block.timestamp).to.be.lt(endCooldown);

        await passSeconds(endCooldown.sub(block.timestamp).toNumber() + 1);
        reserveWeight = updatedReserveWeight;
        updatedReserveWeight = 750000;

        encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
          ["uint32"],
          [updatedReserveWeight]
        );

        await hub.initUpdate(
          1,
          ethers.constants.AddressZero,
          0,
          encodedCurveDetails
        );
        const block2 = await ethers.provider.getBlock("latest");
        const details = await hub.getHubDetails(1);
        expect(details.curve).to.equal(updatedBancorABDK.address);
        expect(details.targetCurve).to.equal(ethers.constants.AddressZero);
        expect(details.endTime).to.be.gt(0);
        expect(details.endTime).to.be.gt(block.timestamp);
        expect(details.refundRatio).to.to.equal(refundRatio);
        expect(details.targetRefundRatio).to.to.equal(0);
        expect(details.active).to.be.true;
        expect(details.updating).to.be.true;
        expect(details.reconfigure).to.be.true;
        // we are warming up
        expect(block2.timestamp).to.be.lt(details.startTime);
      });
      describe("Warmup", () => {
        it("Assets received based on initial curveDetails", async () => {
          const details = await hub.getHubDetails(1);

          const currentCurve = await getContractAt<BancorABDK>(
            "BancorABDK",
            details.curve
          );
          expect(currentCurve.address).to.equal(updatedBancorABDK.address);

          const tokenDepositedInETH = 100;
          const tokenDeposited = ethers.utils.parseEther(
            tokenDepositedInETH.toString()
          );

          const balBefore = await meToken.balanceOf(account0.address);
          const balDaiBefore = await token.balanceOf(account0.address);
          const vaultBalBefore = await token.balanceOf(
            singleAssetVault.address
          );
          const meTokenTotalSupply = await meToken.totalSupply();
          const meTokenDetails = await meTokenRegistry.getMeTokenDetails(
            meToken.address
          );
          const calculatedReturn = calculateTokenReturned(
            tokenDepositedInETH,
            toETHNumber(meTokenTotalSupply),
            toETHNumber(meTokenDetails.balancePooled),
            reserveWeight / MAX_WEIGHT
          );

          const targetReturn = calculateTokenReturned(
            tokenDepositedInETH,
            toETHNumber(meTokenTotalSupply),
            toETHNumber(meTokenDetails.balancePooled),
            updatedReserveWeight / MAX_WEIGHT
          );
          await foundry
            .connect(account2)
            .mint(meToken.address, tokenDeposited, account0.address);
          const balAfter = await meToken.balanceOf(account0.address);
          const vaultBalAfter = await token.balanceOf(singleAssetVault.address);

          expect(toETHNumber(balAfter.sub(balBefore))).to.be.approximately(
            calculatedReturn,
            0.000000000000001
          );
          expect(vaultBalAfter.sub(vaultBalBefore)).to.equal(tokenDeposited);
          const balDaiAcc1Before = await token.balanceOf(account1.address);

          //send half burnt by owner
          await foundry
            .connect(account0)
            .burn(meToken.address, balAfter.sub(balBefore), account0.address);
          const balDaiAfter = await token.balanceOf(account0.address);
          const vaultBalAfterBurn = await token.balanceOf(
            singleAssetVault.address
          );

          // we have less DAI in the vault cos they have been sent to the burner
          expect(vaultBalAfter.sub(vaultBalAfterBurn)).to.equal(
            balDaiAfter.sub(balDaiBefore)
          );
          // buyer
          const balAcc1Before = await meToken.balanceOf(account1.address);
          await foundry
            .connect(account1)
            .mint(meToken.address, tokenDeposited, account1.address);
          const vaultBalAfterMint = await token.balanceOf(
            singleAssetVault.address
          );

          expect(vaultBalAfterMint.sub(vaultBalAfterBurn)).to.equal(
            tokenDeposited
          );

          const balAcc1After = await meToken.balanceOf(account1.address);
          expect(balAcc1After.sub(balAcc1Before)).to.equal(
            balAfter.sub(balBefore)
          );
          //send half burnt by buyer
          await foundry
            .connect(account1)
            .burn(meToken.address, balAcc1After, account1.address);
          const balDaiAcc1After = await token.balanceOf(account1.address);

          const vaultBalAfterBuyerBurn = await token.balanceOf(
            singleAssetVault.address
          );
          // we have less DAI in the vault cos they have been sent to the burner
          expect(vaultBalAfterMint.sub(vaultBalAfterBuyerBurn)).to.equal(
            balDaiAcc1After.sub(balDaiAcc1Before.sub(tokenDeposited))
          );
          expect(
            Number(
              ethers.utils.formatEther(
                tokenDeposited.sub(balDaiAcc1Before.sub(balDaiAcc1After))
              )
            )
          ).to.equal((tokenDepositedInETH * refundRatio) / MAX_WEIGHT);
        });
      });
      describe("Duration", () => {
        before(async () => {
          await passHours(1);
        });
        it("Assets received for buyer based on weighted average burning full supply ", async () => {
          //move forward  3 Days
          await passDays(3);
          const tokenDepositedInETH = 100;
          const tokenDeposited = ethers.utils.parseEther(
            tokenDepositedInETH.toString()
          );
          const vaultBalBefore = await token.balanceOf(
            singleAssetVault.address
          );

          // send token to owner
          await foundry
            .connect(account2)
            .mint(meToken.address, tokenDeposited, account2.address);
          const balDaiAfterMint = await token.balanceOf(account2.address);
          const balAfter = await meToken.balanceOf(account2.address);

          const vaultBalAfterMint = await token.balanceOf(
            singleAssetVault.address
          );
          expect(vaultBalAfterMint.sub(vaultBalBefore)).to.equal(
            tokenDeposited
          );

          const balBefore = await meToken.balanceOf(account0.address);
          const balDaiBefore = await token.balanceOf(account0.address);
          const vaultBalBeforeBurn = await token.balanceOf(
            singleAssetVault.address
          );
          const meTokenTotalSupply = await meToken.totalSupply();
          const meTokenDetails = await meTokenRegistry.getMeTokenDetails(
            meToken.address
          );

          const rawAssetsReturned = calculateCollateralReturned(
            toETHNumber(balAfter),
            toETHNumber(meTokenTotalSupply),
            toETHNumber(meTokenDetails.balancePooled),
            reserveWeight / MAX_WEIGHT
          );
          const targetAssetsReturned = calculateCollateralReturned(
            toETHNumber(balAfter),
            toETHNumber(meTokenTotalSupply),
            toETHNumber(meTokenDetails.balancePooled),
            updatedReserveWeight / MAX_WEIGHT
          );
          await foundry
            .connect(account2)
            .burn(meToken.address, balAfter, account2.address);
          const balDaiAfterBurn = await token.balanceOf(account2.address);
          const meTokenDetailsAfterBurn =
            await meTokenRegistry.getMeTokenDetails(meToken.address);
          const {
            active,
            refundRatio,
            updating,
            startTime,
            endTime,
            endCooldown,
            reconfigure,
            targetRefundRatio,
          } = await hub.getHubDetails(1);
          expect(active).to.be.true;
          expect(updating).to.be.true;
          const block = await ethers.provider.getBlock("latest");
          const assetsReturned =
            (rawAssetsReturned * refundRatio.toNumber()) / MAX_WEIGHT;
          const calcWAvgRes = weightedAverageSimulation(
            rawAssetsReturned,
            targetAssetsReturned,
            startTime.toNumber(),
            endTime.toNumber(),
            block.timestamp
          );
          const calcWithRefundRatio =
            (calcWAvgRes * refundRatio.toNumber()) / MAX_WEIGHT;
          // we get the calcWAvgRes percentage of the tokens returned by the Metokens burn
          // expect(balDaiAfterBurn.sub(balDaiAfterMint)).to.equal(calculatedReturn);
          expect(
            toETHNumber(balDaiAfterBurn.sub(balDaiAfterMint))
          ).to.be.approximately(calcWithRefundRatio, 0.0000000000001);
        });
        it("Assets received for buyer based on weighted average not burning full supply ", async () => {
          const tokenDepositedInETH = 100;
          const tokenDeposited = ethers.utils.parseEther(
            tokenDepositedInETH.toString()
          );
          const vaultBalBefore = await token.balanceOf(
            singleAssetVault.address
          );

          // send token to owner
          await foundry
            .connect(account2)
            .mint(meToken.address, tokenDeposited, account2.address);
          const balDaiAfterMint = await token.balanceOf(account2.address);
          const balAfter = await meToken.balanceOf(account2.address);

          const vaultBalAfterMint = await token.balanceOf(
            singleAssetVault.address
          );
          expect(vaultBalAfterMint.sub(vaultBalBefore)).to.equal(
            tokenDeposited
          );

          const balBefore = await meToken.balanceOf(account0.address);
          const balDaiBefore = await token.balanceOf(account0.address);
          const vaultBalBeforeBurn = await token.balanceOf(
            singleAssetVault.address
          );
          const meTokenTotalSupply = await meToken.totalSupply();
          const meTokenDetails = await meTokenRegistry.getMeTokenDetails(
            meToken.address
          );
          const metokenToBurn = balAfter.div(2);
          const rawAssetsReturned = calculateCollateralReturned(
            toETHNumber(metokenToBurn),
            toETHNumber(meTokenTotalSupply),
            toETHNumber(meTokenDetails.balancePooled),
            reserveWeight / MAX_WEIGHT
          );
          const targetAssetsReturned = calculateCollateralReturned(
            toETHNumber(metokenToBurn),
            toETHNumber(meTokenTotalSupply),
            toETHNumber(meTokenDetails.balancePooled),
            updatedReserveWeight / MAX_WEIGHT
          );

          await foundry
            .connect(account2)
            .burn(meToken.address, metokenToBurn, account2.address);
          const balDaiAfterBurn = await token.balanceOf(account2.address);
          const meTokenDetailsAfterBurn =
            await meTokenRegistry.getMeTokenDetails(meToken.address);
          const {
            active,
            refundRatio,
            updating,
            startTime,
            endTime,
            endCooldown,
            reconfigure,
            targetRefundRatio,
          } = await hub.getHubDetails(1);
          expect(active).to.be.true;
          expect(updating).to.be.true;
          const block = await ethers.provider.getBlock("latest");

          const calcWAvgRes = weightedAverageSimulation(
            rawAssetsReturned,
            targetAssetsReturned,
            startTime.toNumber(),
            endTime.toNumber(),
            block.timestamp
          );
          const assetsReturned =
            (calcWAvgRes * refundRatio.toNumber()) / MAX_WEIGHT;
          const calculatedReturn = ethers.utils
            .parseEther(`${assetsReturned}`)
            .mul(BigNumber.from(Math.floor(calcWAvgRes)))
            .div(BigNumber.from(10 ** 6));
          // we get the calcWAvgRes percentage of the tokens returned by the Metokens burn
          // expect(balDaiAfterBurn.sub(balDaiAfterMint)).to.equal(calculatedReturn);
          expect(
            toETHNumber(balDaiAfterBurn.sub(balDaiAfterMint))
          ).to.be.approximately(assetsReturned, 0.000000000000001);
        });
        it("Assets received for owner based on weighted average not burning full supply ", async () => {
          const tokenDepositedInETH = 100;
          const tokenDeposited = ethers.utils.parseEther(
            tokenDepositedInETH.toString()
          );
          await token
            .connect(account1)
            .transfer(account0.address, ethers.utils.parseEther("100"));
          const vaultBalBefore = await token.balanceOf(
            singleAssetVault.address
          );

          // send token to owner
          await foundry.mint(meToken.address, tokenDeposited, account0.address);
          const balDaiAfterMint = await token.balanceOf(account0.address);
          const balAfter = await meToken.balanceOf(account0.address);

          const vaultBalAfterMint = await token.balanceOf(
            singleAssetVault.address
          );
          expect(vaultBalAfterMint.sub(vaultBalBefore)).to.equal(
            tokenDeposited
          );

          const balBefore = await meToken.balanceOf(account0.address);
          const balDaiBefore = await token.balanceOf(account0.address);
          const vaultBalBeforeBurn = await token.balanceOf(
            singleAssetVault.address
          );
          const meTokenTotalSupply = await meToken.totalSupply();
          const meTokenDetails = await meTokenRegistry.getMeTokenDetails(
            meToken.address
          );
          const metokenToBurn = balAfter.div(2);
          const rawAssetsReturned = calculateCollateralReturned(
            toETHNumber(metokenToBurn),
            toETHNumber(meTokenTotalSupply),
            toETHNumber(meTokenDetails.balancePooled),
            reserveWeight / MAX_WEIGHT
          );
          const targetAssetsReturned = calculateCollateralReturned(
            toETHNumber(metokenToBurn),
            toETHNumber(meTokenTotalSupply),
            toETHNumber(meTokenDetails.balancePooled),
            updatedReserveWeight / MAX_WEIGHT
          );
          const meTokenDetailsBeforeBurn =
            await meTokenRegistry.getMeTokenDetails(meToken.address);

          await foundry
            .connect(account0)
            .burn(meToken.address, metokenToBurn, account0.address);

          const balDaiAfterBurn = await token.balanceOf(account0.address);

          const {
            active,
            refundRatio,
            updating,
            startTime,
            endTime,
            endCooldown,
            reconfigure,
            targetRefundRatio,
          } = await hub.getHubDetails(1);
          expect(active).to.be.true;
          expect(updating).to.be.true;
          const block = await ethers.provider.getBlock("latest");
          // the weighted average on the curve should be applied for owner and buyers
          const calcWAvgRes = weightedAverageSimulation(
            rawAssetsReturned,
            targetAssetsReturned,
            startTime.toNumber(),
            endTime.toNumber(),
            block.timestamp
          );
          // but the owner gets a proportional share of the token burnt from the balanced locked
          const assetsReturned =
            calcWAvgRes +
            (toETHNumber(metokenToBurn) / toETHNumber(meTokenTotalSupply)) *
              toETHNumber(meTokenDetailsBeforeBurn.balanceLocked);

          const calculatedReturn = ethers.utils
            .parseEther(`${assetsReturned}`)
            .mul(BigNumber.from(Math.floor(calcWAvgRes)))
            .div(BigNumber.from(10 ** 6));
          // we get the calcWAvgRes percentage of the tokens returned by the Metokens burn
          // expect(balDaiAfterBurn.sub(balDaiAfterMint)).to.equal(calculatedReturn);
          expect(
            toETHNumber(balDaiAfterBurn.sub(balDaiAfterMint))
          ).to.be.approximately(assetsReturned, 0.0000000000001);
        });
        it("mint(): assets received based on weighted average", async () => {
          const tokenDepositedInETH = 100000;
          const tokenDeposited = ethers.utils.parseEther(
            tokenDepositedInETH.toString()
          );
          await token
            .connect(tokenHolder)
            .transfer(account2.address, tokenDeposited);
          const vaultBalBefore = await token.balanceOf(
            singleAssetVault.address
          );
          await setAutomine(false);
          const block = await ethers.provider.getBlock("latest");
          const mrd = await meTokenRegistry.getMeTokenDetails(meToken.address);
          const hd = await hub.getHubDetails(mrd.hubId);
          let balBefore = await meToken.balanceOf(account3.address);
          const meTokenTotalSupply = await meToken.totalSupply();
          const meTokenDetails = await meTokenRegistry.getMeTokenDetails(
            meToken.address
          );
          const calcTokenReturn = calculateTokenReturned(
            tokenDepositedInETH,
            toETHNumber(meTokenTotalSupply),
            toETHNumber(meTokenDetails.balancePooled),
            reserveWeight / MAX_WEIGHT
          );

          const calcTargetTokenReturn = calculateTokenReturned(
            tokenDepositedInETH,
            toETHNumber(meTokenTotalSupply),
            toETHNumber(meTokenDetails.balancePooled),
            updatedReserveWeight / MAX_WEIGHT
          );
          const { active, updating, startTime, endTime } =
            await hub.getHubDetails(1);
          expect(active).to.be.true;
          expect(updating).to.be.true;

          // take into account the time when
          // the mint transaction will be included
          const calcWAvgRes = weightedAverageSimulation(
            calcTokenReturn,
            calcTargetTokenReturn,
            startTime.toNumber(),
            endTime.toNumber(),
            block.timestamp + 1
          );

          // buyer mint metokens
          await foundry
            .connect(account2)
            .mint(meToken.address, tokenDeposited, account3.address);
          // to be precise we set the next block timestamp to be the same of when we ask for tokenMinted
          await mineBlock(block.timestamp + 1);
          await setAutomine(true);
          const balAfter = await meToken.balanceOf(account3.address);
          const vaultBalAfterMint = await token.balanceOf(
            singleAssetVault.address
          );
          expect(vaultBalAfterMint.sub(vaultBalBefore)).to.equal(
            tokenDeposited
          );
          expect(toETHNumber(balAfter.sub(balBefore))).to.be.approximately(
            calcWAvgRes,
            0.0000000000001
          );
        });
      });
      describe("Cooldown", () => {
        it("initUpdate() cannot be called", async () => {
          const { active, updating, endTime, reconfigure } =
            await hub.getHubDetails(1);
          expect(active).to.be.true;
          expect(updating).to.be.true;
          expect(reconfigure).to.be.true;
          const block = await ethers.provider.getBlock("latest");

          //Block.timestamp should be between endTime and endCooldown
          // move forward to cooldown
          await passSeconds(endTime.sub(block.timestamp).toNumber() + 1);
          await expect(
            hub.initUpdate(1, curve.address, 1000, ethers.utils.toUtf8Bytes(""))
          ).to.be.revertedWith("Still cooling down");
        });
        it("burn() and mint() by owner should use the targetCurve", async () => {
          const tokenDepositedInETH = 100;
          const tokenDeposited = ethers.utils.parseEther(
            tokenDepositedInETH.toString()
          );
          await token
            .connect(account1)
            .transfer(account0.address, ethers.utils.parseEther("100"));
          const vaultBalBefore = await token.balanceOf(
            singleAssetVault.address
          );
          const balBefore = await meToken.balanceOf(account0.address);

          let meTokenTotalSupply = await meToken.totalSupply();
          let meTokenDetails = await meTokenRegistry.getMeTokenDetails(
            meToken.address
          );
          // the updated curve should be applied
          const calcTargetTokenReturn = calculateTokenReturned(
            tokenDepositedInETH,
            toETHNumber(meTokenTotalSupply),
            toETHNumber(meTokenDetails.balancePooled),
            updatedReserveWeight / MAX_WEIGHT
          );
          // send token to owner
          await foundry.mint(meToken.address, tokenDeposited, account0.address);
          const balDaiAfterMint = await token.balanceOf(account0.address);
          const balAfter = await meToken.balanceOf(account0.address);
          expect(toETHNumber(balAfter.sub(balBefore))).to.be.approximately(
            calcTargetTokenReturn,
            0.0000000000001
          );
          const vaultBalAfterMint = await token.balanceOf(
            singleAssetVault.address
          );
          expect(vaultBalAfterMint.sub(vaultBalBefore)).to.equal(
            tokenDeposited
          );

          meTokenTotalSupply = await meToken.totalSupply();
          meTokenDetails = await meTokenRegistry.getMeTokenDetails(
            meToken.address
          );
          const metokenToBurn = balAfter.div(2);
          const {
            active,
            updating,
            endCooldown,
            reconfigure,
            curve,
            targetCurve,
          } = await hub.getHubDetails(1);
          const targetAssetsReturned = calculateCollateralReturned(
            toETHNumber(metokenToBurn),
            toETHNumber(meTokenTotalSupply),
            toETHNumber(meTokenDetails.balancePooled),
            updatedReserveWeight / MAX_WEIGHT
          );

          const meTokenDetailsBeforeBurn =
            await meTokenRegistry.getMeTokenDetails(meToken.address);

          await foundry
            .connect(account0)
            .burn(meToken.address, metokenToBurn, account0.address);

          const balDaiAfterBurn = await token.balanceOf(account0.address);
          const currentCurve = await getContractAt<BancorABDK>(
            "BancorABDK",
            curve
          );
          const hubTargetCurve = await getContractAt<BancorABDK>(
            "BancorABDK",
            targetCurve
          );
          const block = await ethers.provider.getBlock("latest");
          expect(updatedBancorABDK.address).to.equal(currentCurve.address);
          expect(hubTargetCurve.address).to.equal(ethers.constants.AddressZero);
          expect(endCooldown).to.be.gt(block.timestamp);
          expect(active).to.be.true;
          expect(updating).to.be.false;
          expect(reconfigure).to.be.false;

          // the weighted average on the curve should be applied for owner and buyers

          // but the owner gets a proportional share of the token burnt from the balanced locked
          const assetsReturned =
            targetAssetsReturned +
            (toETHNumber(metokenToBurn) / toETHNumber(meTokenTotalSupply)) *
              toETHNumber(meTokenDetailsBeforeBurn.balanceLocked);

          // we get the calcWAvgRes percentage of the tokens returned by the Metokens burn
          // expect(balDaiAfterBurn.sub(balDaiAfterMint)).to.equal(calculatedReturn);
          expect(
            toETHNumber(balDaiAfterBurn.sub(balDaiAfterMint))
          ).to.be.approximately(assetsReturned, 0.00000000001);
        });
        it("burn() and mint() by buyer should use the targetCurve", async () => {
          const tokenDepositedInETH = 10;
          const tokenDeposited = ethers.utils.parseEther(
            tokenDepositedInETH.toString()
          );
          await token
            .connect(tokenHolder)
            .transfer(account2.address, tokenDeposited);
          const vaultBalBefore = await token.balanceOf(
            singleAssetVault.address
          );
          const balBefore = await meToken.balanceOf(account2.address);

          let meTokenTotalSupply = await meToken.totalSupply();
          let meTokenDetails = await meTokenRegistry.getMeTokenDetails(
            meToken.address
          );
          // the updated curve should be applied
          const calcTargetTokenReturn = calculateTokenReturned(
            tokenDepositedInETH,
            toETHNumber(meTokenTotalSupply),
            toETHNumber(meTokenDetails.balancePooled),
            updatedReserveWeight / MAX_WEIGHT
          );
          // send token to owner
          await foundry
            .connect(account2)
            .mint(meToken.address, tokenDeposited, account2.address);
          const balDaiAfterMint = await token.balanceOf(account2.address);
          const balAfter = await meToken.balanceOf(account2.address);

          expect(toETHNumber(balAfter.sub(balBefore))).to.be.approximately(
            calcTargetTokenReturn,
            0.0000000000001
          );

          const vaultBalAfterMint = await token.balanceOf(
            singleAssetVault.address
          );
          expect(vaultBalAfterMint.sub(vaultBalBefore)).to.equal(
            tokenDeposited
          );

          meTokenTotalSupply = await meToken.totalSupply();
          meTokenDetails = await meTokenRegistry.getMeTokenDetails(
            meToken.address
          );
          const metokenToBurn = balAfter.div(2);
          const {
            active,
            refundRatio,
            updating,
            endCooldown,
            reconfigure,
            curve,
            targetCurve,
          } = await hub.getHubDetails(1);
          const targetAssetsReturned = calculateCollateralReturned(
            toETHNumber(metokenToBurn),
            toETHNumber(meTokenTotalSupply),
            toETHNumber(meTokenDetails.balancePooled),
            updatedReserveWeight / MAX_WEIGHT
          );
          await foundry
            .connect(account2)
            .burn(meToken.address, metokenToBurn, account2.address);

          const balDaiAfterBurn = await token.balanceOf(account2.address);
          const currentCurve = await getContractAt<BancorABDK>(
            "BancorABDK",
            curve
          );
          const hubTargetCurve = await getContractAt<BancorABDK>(
            "BancorABDK",
            targetCurve
          );
          const block = await ethers.provider.getBlock("latest");
          expect(updatedBancorABDK.address).to.equal(currentCurve.address);
          expect(hubTargetCurve.address).to.equal(ethers.constants.AddressZero);
          expect(endCooldown).to.be.gt(block.timestamp);
          expect(active).to.be.true;
          expect(updating).to.be.false;
          expect(reconfigure).to.be.false;

          // as it is a buyer we apply the refund ratio
          const assetsReturned =
            (targetAssetsReturned * refundRatio.toNumber()) / MAX_WEIGHT;

          // we get the calcWAvgRes percentage of the tokens returned by the Metokens burn
          // expect(balDaiAfterBurn.sub(balDaiAfterMint)).to.equal(calculatedReturn);
          expect(
            toETHNumber(balDaiAfterBurn.sub(balDaiAfterMint))
          ).to.be.approximately(assetsReturned, 0.00000000001);
        });
      });
    });
  });
};
setup().then(() => {
  run();
});
