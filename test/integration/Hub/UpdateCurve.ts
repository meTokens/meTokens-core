import { expect } from "chai";
import { BigNumber, Signer } from "ethers";
import { ethers, getNamedAccounts } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { hubSetup } from "../../utils/hubSetup";
import {
  calculateTokenReturned,
  calculateCollateralReturned,
  getContractAt,
  toETHNumber,
  weightedAverageSimulation,
  calculateStepwiseCollateralReturned,
  calculateStepwiseTokenReturned,
} from "../../utils/helpers";
import {
  mineBlock,
  passDays,
  passHours,
  passSeconds,
  setAutomine,
} from "../../utils/hardhatNode";
import {
  FoundryFacet,
  HubFacet,
  MeTokenRegistryFacet,
  MeToken,
  ERC20,
  SingleAssetVault,
  ICurveFacet,
} from "../../../artifacts/types";

const setup = async () => {
  describe("HubFacet - update Curve", () => {
    let meTokenRegistry: MeTokenRegistryFacet;
    let singleAssetVault: SingleAssetVault;
    let foundry: FoundryFacet;
    let hub: HubFacet;
    let token: ERC20;
    let meToken: MeToken;
    let account0: SignerWithAddress;
    let tokenHolder: Signer;
    let account1: SignerWithAddress;
    let account2: SignerWithAddress;
    let account3: SignerWithAddress;
    const one = ethers.utils.parseEther("1");
    let baseY: BigNumber;
    let curve: ICurveFacet;
    let baseYNum: number;
    let reserveWeight: number;
    let targetReserveWeight: number;
    let updatedTargetReserveWeight: number;

    let encodedNewCurveInfo: string;
    const firstHubId = 1;
    const refundRatio = 5000;
    const MAX_WEIGHT = 1000000;
    before(async () => {
      baseYNum = 1000;
      baseY = one.mul(baseYNum);
      reserveWeight = MAX_WEIGHT / 2;
      targetReserveWeight = 450000;
      let DAI;
      ({ DAI } = await getNamedAccounts());

      const encodedCurveInfo = ethers.utils.defaultAbiCoder.encode(
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
        foundry,
        singleAssetVault,
        tokenHolder,
        account0,
        account1,
        account2,
        account3,
        meTokenRegistry,
        curve,
      } = await hubSetup(encodedCurveInfo, encodedVaultArgs, refundRatio));

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
      it("Assets received based on initial initialCurveInfo", async () => {
        encodedNewCurveInfo = ethers.utils.defaultAbiCoder.encode(
          ["uint32"],
          [targetReserveWeight]
        );

        await hub.initUpdate(firstHubId, 0, encodedNewCurveInfo);

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
      it("Assets received for buyer based on weighted average  of curveInfo on burning full supply ", async () => {
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

        const meTokenTotalSupply = await meToken.totalSupply();
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );

        const rawAssetsReturned = calculateCollateralReturned(
          toETHNumber(balAfter),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenInfo.balancePooled),
          reserveWeight / MAX_WEIGHT
        );
        await foundry
          .connect(account2)
          .burn(meToken.address, balAfter, account2.address);
        const balDaiAfterBurn = await token.balanceOf(account2.address);
        const { active, refundRatio, updating } = await hub.getHubInfo(1);
        expect(active).to.be.true;
        expect(updating).to.be.true;
        const assetsReturned =
          (rawAssetsReturned * refundRatio.toNumber()) / MAX_WEIGHT;
        // we get the calcWAvgRes percentage of the tokens returned by the Metokens burn
        // expect(balDaiAfterBurn.sub(balDaiAfterMint)).to.equal(calculatedReturn);
        expect(
          toETHNumber(balDaiAfterBurn.sub(balDaiAfterMint))
        ).to.be.approximately(assetsReturned, 0.000000000000001);
      });
      it("Assets received for buyer based on weighted average  of curveInfo on not burning full supply ", async () => {
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

        const meTokenTotalSupply = await meToken.totalSupply();
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        const metokenToBurn = balAfter.div(2);
        const rawAssetsReturned = calculateCollateralReturned(
          toETHNumber(metokenToBurn),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenInfo.balancePooled),
          reserveWeight / MAX_WEIGHT
        );
        const targetAssetsReturned = calculateCollateralReturned(
          toETHNumber(metokenToBurn),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenInfo.balancePooled),
          targetReserveWeight / MAX_WEIGHT
        );

        await foundry
          .connect(account2)
          .burn(meToken.address, metokenToBurn, account2.address);
        const balDaiAfterBurn = await token.balanceOf(account2.address);
        const { active, refundRatio, updating, startTime, endTime } =
          await hub.getHubInfo(1);
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
        // we get the calcWAvgRes percentage of the tokens returned by the Metokens burn
        // expect(balDaiAfterBurn.sub(balDaiAfterMint)).to.equal(calculatedReturn);
        expect(
          toETHNumber(balDaiAfterBurn.sub(balDaiAfterMint))
        ).to.be.approximately(assetsReturned, 0.000000000000001);
      });
      it("Assets received for owner based on weighted average  of curveInfo on not burning full supply ", async () => {
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

        const meTokenTotalSupply = await meToken.totalSupply();
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        const metokenToBurn = balAfter.div(2);
        const rawAssetsReturned = calculateCollateralReturned(
          toETHNumber(metokenToBurn),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenInfo.balancePooled),
          reserveWeight / MAX_WEIGHT
        );

        const targetAssetsReturned = calculateCollateralReturned(
          toETHNumber(metokenToBurn),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenInfo.balancePooled),
          targetReserveWeight / MAX_WEIGHT
        );
        const meTokenInfoBeforeBurn = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );
        await foundry
          .connect(account0)
          .burn(meToken.address, metokenToBurn, account0.address);

        const balDaiAfterBurn = await token.balanceOf(account0.address);

        const { active, updating, startTime, endTime } = await hub.getHubInfo(
          1
        );
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
            toETHNumber(meTokenInfoBeforeBurn.balanceLocked);

        // we get the calcWAvgRes percentage of the tokens returned by the Metokens burn
        // expect(balDaiAfterBurn.sub(balDaiAfterMint)).to.equal(calculatedReturn);
        expect(
          toETHNumber(balDaiAfterBurn.sub(balDaiAfterMint))
        ).to.be.approximately(assetsReturned, 0.0000000000001);
      });
      it("mint(): assets received based on weighted average of curveInfo", async () => {
        const tokenDepositedInETH = 100;
        const tokenDeposited = ethers.utils.parseEther(
          tokenDepositedInETH.toString()
        );
        const vaultBalBefore = await token.balanceOf(singleAssetVault.address);
        await setAutomine(false);
        const block = await ethers.provider.getBlock("latest");

        const balBefore = await meToken.balanceOf(account3.address);

        const meTokenTotalSupply = await meToken.totalSupply();
        const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );

        const calcTokenReturn = calculateTokenReturned(
          tokenDepositedInETH,
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenInfo.balancePooled),
          reserveWeight / MAX_WEIGHT
        );

        const calcTargetTokenReturn = calculateTokenReturned(
          tokenDepositedInETH,
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenInfo.balancePooled),
          targetReserveWeight / MAX_WEIGHT
        );

        const { active, updating, startTime, endTime } = await hub.getHubInfo(
          1
        );
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
        const { active, updating, endTime, reconfigure } = await hub.getHubInfo(
          1
        );
        expect(active).to.be.true;
        expect(updating).to.be.true;
        expect(reconfigure).to.be.true;
        const block = await ethers.provider.getBlock("latest");

        //Block.timestamp should be between endTime and endCooldown
        // move forward to cooldown
        await passSeconds(endTime.sub(block.timestamp).toNumber() + 1);
        await expect(hub.initUpdate(1, 1000, 0)).to.be.revertedWith(
          "Still cooling down"
        );
      });
      it("burn() and mint() by owner should use the targetCurveInfo", async () => {
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
        let meTokenInfo = await meTokenRegistry.getMeTokenInfo(meToken.address);
        // the updated curve should be applied
        const calcTargetTokenReturn = calculateTokenReturned(
          tokenDepositedInETH,
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenInfo.balancePooled),
          targetReserveWeight / MAX_WEIGHT
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
        meTokenInfo = await meTokenRegistry.getMeTokenInfo(meToken.address);
        const metokenToBurn = balAfter.div(2);
        const { active, updating, endCooldown, reconfigure } =
          await hub.getHubInfo(1);

        const targetAssetsReturned = calculateCollateralReturned(
          toETHNumber(metokenToBurn),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenInfo.balancePooled),
          targetReserveWeight / MAX_WEIGHT
        );
        const meTokenInfoBeforeBurn = await meTokenRegistry.getMeTokenInfo(
          meToken.address
        );

        await foundry
          .connect(account0)
          .burn(meToken.address, metokenToBurn, account0.address);

        const balDaiAfterBurn = await token.balanceOf(account0.address);

        const block = await ethers.provider.getBlock("latest");
        expect(endCooldown).to.be.gt(block.timestamp);
        expect(active).to.be.true;
        expect(updating).to.be.false;
        expect(reconfigure).to.be.false;

        // the weighted average on the curve should be applied for owner and buyers
        // but the owner gets a proportional share of the token burnt from the balanced locked
        const assetsReturned =
          targetAssetsReturned +
          (toETHNumber(metokenToBurn) / toETHNumber(meTokenTotalSupply)) *
            toETHNumber(meTokenInfoBeforeBurn.balanceLocked);
        // we get the calcWAvgRes percentage of the tokens returned by the Metokens burn
        // expect(balDaiAfterBurn.sub(balDaiAfterMint)).to.equal(calculatedReturn);
        expect(
          toETHNumber(balDaiAfterBurn.sub(balDaiAfterMint))
        ).to.be.approximately(assetsReturned, 0.00000000001);
      });
      it("burn() and mint() by buyer should use the targetCurveInfo", async () => {
        const tokenDepositedInETH = 100;
        const tokenDeposited = ethers.utils.parseEther(
          tokenDepositedInETH.toString()
        );

        const vaultBalBefore = await token.balanceOf(singleAssetVault.address);
        const balBefore = await meToken.balanceOf(account2.address);

        let meTokenTotalSupply = await meToken.totalSupply();
        let meTokenInfo = await meTokenRegistry.getMeTokenInfo(meToken.address);
        // the updated curve should be applied
        const calcTargetTokenReturn = calculateTokenReturned(
          tokenDepositedInETH,
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenInfo.balancePooled),
          targetReserveWeight / MAX_WEIGHT
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
        meTokenInfo = await meTokenRegistry.getMeTokenInfo(meToken.address);
        const metokenToBurn = balAfter; //.div(2);
        const { active, refundRatio, updating, endCooldown, reconfigure } =
          await hub.getHubInfo(1);
        const targetAssetsReturned = calculateCollateralReturned(
          toETHNumber(metokenToBurn),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenInfo.balancePooled),
          targetReserveWeight / MAX_WEIGHT
        );

        await foundry
          .connect(account2)
          .burn(meToken.address, metokenToBurn, account2.address);

        const balDaiAfterBurn = await token.balanceOf(account2.address);

        const block = await ethers.provider.getBlock("latest");

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
        const { endTime, endCooldown, refundRatio } = await hub.getHubInfo(1);
        const block = await ethers.provider.getBlock("latest");
        expect(block.timestamp).to.be.gt(endTime);

        await passSeconds(endCooldown.sub(block.timestamp).toNumber() + 1);
        updatedTargetReserveWeight = targetReserveWeight / 2;

        await hub.initUpdate(1, 0, updatedTargetReserveWeight);
        const block2 = await ethers.provider.getBlock("latest");
        const details = await hub.getHubInfo(1);

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
        it("Assets received based on initial curveInfo", async () => {
          const details = await hub.getHubInfo(1);

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
          const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
            meToken.address
          );
          const calculatedReturn = calculateTokenReturned(
            tokenDepositedInETH,
            toETHNumber(meTokenTotalSupply),
            toETHNumber(meTokenInfo.balancePooled),
            targetReserveWeight / MAX_WEIGHT
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

          const meTokenTotalSupply = await meToken.totalSupply();
          const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
            meToken.address
          );
          const rawAssetsReturned = calculateCollateralReturned(
            toETHNumber(balAfter),
            toETHNumber(meTokenTotalSupply),
            toETHNumber(meTokenInfo.balancePooled),
            targetReserveWeight / MAX_WEIGHT
          );

          const targetAssetsReturned = calculateCollateralReturned(
            toETHNumber(balAfter),
            toETHNumber(meTokenTotalSupply),
            toETHNumber(meTokenInfo.balancePooled),
            updatedTargetReserveWeight / MAX_WEIGHT
          );

          await foundry
            .connect(account2)
            .burn(meToken.address, balAfter, account2.address);
          const balDaiAfterBurn = await token.balanceOf(account2.address);
          const { active, refundRatio, updating, startTime, endTime } =
            await hub.getHubInfo(1);
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

          const meTokenTotalSupply = await meToken.totalSupply();
          const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
            meToken.address
          );
          const metokenToBurn = balAfter.div(2);

          const rawAssetsReturned = calculateCollateralReturned(
            toETHNumber(metokenToBurn),
            toETHNumber(meTokenTotalSupply),
            toETHNumber(meTokenInfo.balancePooled),
            targetReserveWeight / MAX_WEIGHT
          );
          const targetAssetsReturned = calculateCollateralReturned(
            toETHNumber(metokenToBurn),
            toETHNumber(meTokenTotalSupply),
            toETHNumber(meTokenInfo.balancePooled),
            updatedTargetReserveWeight / MAX_WEIGHT
          );

          await foundry
            .connect(account2)
            .burn(meToken.address, metokenToBurn, account2.address);
          const balDaiAfterBurn = await token.balanceOf(account2.address);
          const { active, refundRatio, updating, startTime, endTime } =
            await hub.getHubInfo(1);
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

          const meTokenTotalSupply = await meToken.totalSupply();
          const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
            meToken.address
          );
          const metokenToBurn = balAfter.div(2);
          const rawAssetsReturned = calculateCollateralReturned(
            toETHNumber(metokenToBurn),
            toETHNumber(meTokenTotalSupply),
            toETHNumber(meTokenInfo.balancePooled),
            targetReserveWeight / MAX_WEIGHT
          );

          const targetAssetsReturned = calculateCollateralReturned(
            toETHNumber(metokenToBurn),
            toETHNumber(meTokenTotalSupply),
            toETHNumber(meTokenInfo.balancePooled),
            updatedTargetReserveWeight / MAX_WEIGHT
          );

          const meTokenInfoBeforeBurn = await meTokenRegistry.getMeTokenInfo(
            meToken.address
          );

          await foundry
            .connect(account0)
            .burn(meToken.address, metokenToBurn, account0.address);

          const balDaiAfterBurn = await token.balanceOf(account0.address);

          const { active, updating, startTime, endTime } = await hub.getHubInfo(
            1
          );
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
              toETHNumber(meTokenInfoBeforeBurn.balanceLocked);

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
          let balBefore = await meToken.balanceOf(account3.address);
          const meTokenTotalSupply = await meToken.totalSupply();
          const meTokenInfo = await meTokenRegistry.getMeTokenInfo(
            meToken.address
          );
          const calcTokenReturn = calculateTokenReturned(
            tokenDepositedInETH,
            toETHNumber(meTokenTotalSupply),
            toETHNumber(meTokenInfo.balancePooled),
            targetReserveWeight / MAX_WEIGHT
          );

          const calcTargetTokenReturn = calculateTokenReturned(
            tokenDepositedInETH,
            toETHNumber(meTokenTotalSupply),
            toETHNumber(meTokenInfo.balancePooled),
            updatedTargetReserveWeight / MAX_WEIGHT
          );

          const { active, updating, startTime, endTime } = await hub.getHubInfo(
            1
          );
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
            0.000000000001
          );
          // Need to burn to avoid migration problems
          await foundry
            .connect(account3)
            .burn(meToken.address, balAfter, account1.address);
          await foundry
            .connect(account2)
            .burn(
              meToken.address,
              await meToken.balanceOf(account1.address),
              account2.address
            );
        });
      });
      describe("Cooldown", () => {
        it("initUpdate() cannot be called", async () => {
          const { active, updating, endTime, reconfigure } =
            await hub.getHubInfo(1);
          expect(active).to.be.true;
          expect(updating).to.be.true;
          expect(reconfigure).to.be.true;
          const block = await ethers.provider.getBlock("latest");

          //Block.timestamp should be between endTime and endCooldown
          // move forward to cooldown
          await passSeconds(endTime.sub(block.timestamp).toNumber() + 1);
          await expect(hub.initUpdate(1, 1000, 0)).to.be.revertedWith(
            "Still cooling down"
          );
        });
        it("burn() and mint() by owner should use the targetCurve", async () => {
          const tokenDepositedInETH = 100;
          const tokenDeposited = ethers.utils.parseEther(
            tokenDepositedInETH.toString()
          );
          await token
            .connect(account1)
            .transfer(account0.address, tokenDeposited);
          const vaultBalBefore = await token.balanceOf(
            singleAssetVault.address
          );
          const balBefore = await meToken.balanceOf(account0.address);

          let meTokenTotalSupply = await meToken.totalSupply();
          let meTokenInfo = await meTokenRegistry.getMeTokenInfo(
            meToken.address
          );
          // the updated curve should be applied
          const calcTargetTokenReturn = calculateTokenReturned(
            tokenDepositedInETH,
            toETHNumber(meTokenTotalSupply),
            toETHNumber(meTokenInfo.balancePooled),
            updatedTargetReserveWeight / MAX_WEIGHT
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
          meTokenInfo = await meTokenRegistry.getMeTokenInfo(meToken.address);
          const metokenToBurn = balAfter.div(2);
          const { active, updating, endCooldown, reconfigure } =
            await hub.getHubInfo(1);

          const targetAssetsReturned = calculateCollateralReturned(
            toETHNumber(metokenToBurn),
            toETHNumber(meTokenTotalSupply),
            toETHNumber(meTokenInfo.balancePooled),
            updatedTargetReserveWeight / MAX_WEIGHT
          );
          const meTokenInfoBeforeBurn = await meTokenRegistry.getMeTokenInfo(
            meToken.address
          );

          await foundry
            .connect(account0)
            .burn(meToken.address, metokenToBurn, account0.address);
          const balDaiAfterBurn = await token.balanceOf(account0.address);

          const block = await ethers.provider.getBlock("latest");
          expect(endCooldown).to.be.gt(block.timestamp);
          expect(active).to.be.true;
          expect(updating).to.be.false;
          expect(reconfigure).to.be.false;

          // the weighted average on the curve should be applied for owner and buyers

          // but the owner gets a proportional share of the token burnt from the balanced locked
          const assetsReturned =
            targetAssetsReturned +
            (toETHNumber(metokenToBurn) / toETHNumber(meTokenTotalSupply)) *
              toETHNumber(meTokenInfoBeforeBurn.balanceLocked);

          // we get the calcWAvgRes percentage of the tokens returned by the Metokens burn
          // expect(balDaiAfterBurn.sub(balDaiAfterMint)).to.equal(calculatedReturn);
          expect(
            toETHNumber(balDaiAfterBurn.sub(balDaiAfterMint))
          ).to.be.approximately(assetsReturned, 0.0000000001);
        });
        it("burn() and mint() by buyer should use the targetCurve", async () => {
          const tokenDepositedInETH = 1000;
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
          let meTokenInfo = await meTokenRegistry.getMeTokenInfo(
            meToken.address
          );
          // the updated curve should be applied
          const calcTargetTokenReturn = calculateTokenReturned(
            tokenDepositedInETH,
            toETHNumber(meTokenTotalSupply),
            toETHNumber(meTokenInfo.balancePooled),
            updatedTargetReserveWeight / MAX_WEIGHT
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
          meTokenInfo = await meTokenRegistry.getMeTokenInfo(meToken.address);
          const metokenToBurn = balAfter.div(2);
          const { active, refundRatio, updating, endCooldown, reconfigure } =
            await hub.getHubInfo(1);

          const targetAssetsReturned = calculateCollateralReturned(
            toETHNumber(metokenToBurn),
            toETHNumber(meTokenTotalSupply),
            toETHNumber(meTokenInfo.balancePooled),
            updatedTargetReserveWeight / MAX_WEIGHT
          );

          await foundry
            .connect(account2)
            .burn(meToken.address, metokenToBurn, account2.address);

          const balDaiAfterBurn = await token.balanceOf(account2.address);

          const block = await ethers.provider.getBlock("latest");
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
