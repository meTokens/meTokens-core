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
import { Foundry } from "../../../artifacts/types/Foundry";
import { Hub } from "../../../artifacts/types/Hub";
import { MeTokenRegistry } from "../../../artifacts/types/MeTokenRegistry";
import { MigrationRegistry } from "../../../artifacts/types/MigrationRegistry";
import { expect } from "chai";
import { MeToken } from "../../../artifacts/types/MeToken";
import { UniswapSingleTransferMigration } from "../../../artifacts/types/UniswapSingleTransferMigration";
import { SingleAssetVault } from "../../../artifacts/types/SingleAssetVault";
import { passDays, passHours } from "../../utils/hardhatNode";
const setup = async () => {
  describe("Hub - update CurveDetails", () => {
    let meTokenRegistry: MeTokenRegistry;
    let bancorABDK: BancorABDK;
    let updatedBancorABDK: BancorABDK;
    let curveRegistry: CurveRegistry;
    let migrationRegistry: MigrationRegistry;
    let singleAssetVault: SingleAssetVault;
    let foundry: Foundry;
    let hub: Hub;
    let token: ERC20;
    let dai: ERC20;
    let meToken: MeToken;
    let account0: SignerWithAddress;
    let tokenHolder: Signer;
    let account1: SignerWithAddress;
    let account2: SignerWithAddress;
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
      bancorABDK = await deploy<BancorABDK>("BancorABDK");

      ({
        token,
        hub,
        curveRegistry,
        migrationRegistry,
        singleAssetVault,
        tokenHolder,
        foundry,
        account0,
        account1,
        account2,
        meTokenRegistry,
      } = await hubSetup(
        encodedCurveDetails,
        encodedVaultArgs,
        refundRatio,
        bancorABDK
      ));
      dai = token;
      const detail = await bancorABDK.getBancorDetails(firstHubId);
      expect(detail.reserveWeight).to.equal(reserveWeight);
      // Deploy uniswap migration and approve it to the registry
      const migration = await deploy<UniswapSingleTransferMigration>(
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

      // Pre-load owner and buyer w/ DAI
      await token
        .connect(tokenHolder)
        .transfer(account2.address, ethers.utils.parseEther("1000"));
      // Create meToken and subscribe to Hub1
      const name = "Carl0 meToken";
      const symbol = "CARL";

      const tx = await meTokenRegistry
        .connect(account0)
        .subscribe(name, symbol, firstHubId, 0);
      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account0.address
      );
      meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);
      // Register Hub2 w/ same args but different refund Ratio

      const tokenDeposited = ethers.utils.parseEther("100");
      await token.connect(account2).approve(foundry.address, tokenDeposited);
      const balBefore = await meToken.balanceOf(account2.address);
      const vaultBalBefore = await token.balanceOf(singleAssetVault.address);
      await foundry
        .connect(account2)
        .mint(meTokenAddr, tokenDeposited, account2.address);
      const balAfter = await meToken.balanceOf(account2.address);
      const vaultBalAfter = await token.balanceOf(singleAssetVault.address);
      expect(vaultBalAfter.sub(vaultBalBefore)).to.equal(tokenDeposited);
      //setWarmup for 2 days
      let warmup = await hub.getWarmup();
      expect(warmup).to.equal(0);
      await hub.setWarmup(172800);

      warmup = await hub.getWarmup();
      expect(warmup).to.equal(172800);
      let cooldown = await hub.getCooldown();
      expect(cooldown).to.equal(0);
      //setCooldown for 1 day
      await hub.setCooldown(86400);
      cooldown = await hub.getCooldown();
      expect(cooldown).to.equal(86400);

      let duration = await hub.getDuration();
      expect(duration).to.equal(0);
      //setDuration for 1 week
      await hub.setDuration(604800);
      duration = await hub.getDuration();
      expect(duration).to.equal(604800);
    });

    describe("Warmup", () => {
      it("should revert if targetCurve is the current curve", async () => {
        const updatedEncodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
          ["uint256", "uint32"],
          [updatedBaseY, updatedReserveWeight]
        );
        await expect(
          hub.initUpdate(
            firstHubId,
            bancorABDK.address,
            0,
            updatedEncodedCurveDetails
          )
        ).to.be.revertedWith("targetCurve==curve");
      });
      it("Assets received based on initial curveDetails", async () => {
        const updatedEncodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
          ["uint256", "uint32"],
          [updatedBaseY, updatedReserveWeight]
        );
        updatedBancorABDK = await deploy<BancorABDK>("BancorABDK");
        await curveRegistry.approve(updatedBancorABDK.address);
        await hub.initUpdate(
          firstHubId,
          updatedBancorABDK.address,
          0,
          updatedEncodedCurveDetails
        );

        const detail = await updatedBancorABDK.getBancorDetails(firstHubId);
        expect(detail.reserveWeight).to.equal(updatedReserveWeight);

        const tokenDepositedInETH = 100;
        const tokenDeposited = ethers.utils.parseEther(
          tokenDepositedInETH.toString()
        );

        await token.connect(account2).approve(foundry.address, tokenDeposited);
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
        console.log(`
        reserveWeight     :${reserveWeight}
        vaultBalBefore    :${toETHNumber(vaultBalBefore)}
        meTokenTotalSupply:${toETHNumber(meTokenTotalSupply)}
        calculatedReturn  :${calculatedReturn}
        `);
        await foundry
          .connect(account2)
          .mint(meToken.address, tokenDeposited, account0.address);
        const balAfter = await meToken.balanceOf(account0.address);
        const vaultBalAfter = await token.balanceOf(singleAssetVault.address);

        expect(toETHNumber(balAfter)).to.be.approximately(
          calculatedReturn,
          0.0000000000000001
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
        await token.connect(account1).approve(foundry.address, tokenDeposited);
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
      it("Assets received for buyer based on weighted average burning full supply ", async () => {
        //move forward  3 Days
        await passDays(3);
        // TODO: calculate weighted refundRatio based on current time relative to duration
        const tokenDepositedInETH = 100;
        const tokenDeposited = ethers.utils.parseEther(
          tokenDepositedInETH.toString()
        );
        await token.connect(account2).approve(foundry.address, tokenDeposited);
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
        //  burnt by owner
        await meToken.connect(account2).approve(foundry.address, balAfter);

        const rawAssetsReturnedFromFoundry =
          await foundry.calculateRawAssetsReturned(meToken.address, balAfter);
        const balBefore = await meToken.balanceOf(account0.address);
        const balDaiBefore = await token.balanceOf(account0.address);
        const vaultBalBeforeBurn = await token.balanceOf(
          singleAssetVault.address
        );
        const meTokenTotalSupply = await meToken.totalSupply();
        const meTokenDetails = await meTokenRegistry.getDetails(
          meToken.address
        );

        const rawAssetsReturned = calculateCollateralReturned(
          toETHNumber(balAfter),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenDetails.balancePooled),
          reserveWeight / MAX_WEIGHT
        );
        const targetassetsReturned = calculateCollateralReturned(
          toETHNumber(balAfter),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenDetails.balancePooled),
          updatedReserveWeight / MAX_WEIGHT
        );

        console.log(`
        reserveWeight:${reserveWeight} updatedReserveWeight:${updatedReserveWeight}
        vaultBalBeforeBurn  :${toETHNumber(vaultBalBeforeBurn)}
          balancepool       :${toETHNumber(meTokenDetails.balancePooled)}
          balanceLocked     :${toETHNumber(meTokenDetails.balanceLocked)}
                  balAfter  :${toETHNumber(balAfter)}
        meTokenTotalSupply  :${toETHNumber(meTokenTotalSupply)}
        rawAssetsReturned   :${rawAssetsReturned}
        targetassetsReturned:${targetassetsReturned}
        `);
        await foundry
          .connect(account2)
          .burn(meToken.address, balAfter, account2.address);
        const balDaiAfterBurn = await token.balanceOf(account2.address);
        const meTokenDetailsAfterBurn = await meTokenRegistry.getDetails(
          meToken.address
        );
        console.log(` 
        balanceLocked       :${toETHNumber(
          meTokenDetailsAfterBurn.balanceLocked
        )}
          balancepool       :${toETHNumber(
            meTokenDetailsAfterBurn.balancePooled
          )} 
        `);
        const {
          active,
          refundRatio,
          updating,
          startTime,
          endTime,
          endCooldown,
          reconfigure,
          targetRefundRatio,
        } = await hub.getDetails(1);
        expect(active).to.be.true;
        expect(updating).to.be.true;
        const block = await ethers.provider.getBlock("latest");
        const assetsReturned =
          (rawAssetsReturned * refundRatio.toNumber()) / MAX_WEIGHT;
        const calcWAvrgRes = weightedAverageSimulation(
          rawAssetsReturned,
          targetassetsReturned,
          startTime.toNumber(),
          endTime.toNumber(),
          block.timestamp
        );
        const calculatedReturn = ethers.utils
          .parseEther(`${assetsReturned}`)
          .mul(BigNumber.from(Math.floor(calcWAvrgRes)))
          .div(BigNumber.from(10 ** 6));
        console.log(` 
        calcWAvrgRes       :${calcWAvrgRes}
        assetsReturned  :${assetsReturned}
        calculatedReturn  :${toETHNumber(calculatedReturn)}
        rawAssetsReturnedFromFoundry  :${toETHNumber(
          rawAssetsReturnedFromFoundry
        )}
          balDaiAfterMint  :${toETHNumber(balDaiAfterMint)}
          balDaiAfterBurn  :${toETHNumber(balDaiAfterBurn)}
         
          `);
        // we get the calcWAvrgRes percentage of the tokens returned by the Metokens burn
        // expect(balDaiAfterBurn.sub(balDaiAfterMint)).to.equal(calculatedReturn);
        expect(
          toETHNumber(balDaiAfterBurn.sub(balDaiAfterMint))
        ).to.be.approximately(assetsReturned, 0.0000000000000001);
      });
      it("Assets received for buyer based on weighted average not burning full supply ", async () => {
        // TODO: calculate weighted refundRatio based on current time relative to duration
        const tokenDepositedInETH = 100;
        const tokenDeposited = ethers.utils.parseEther(
          tokenDepositedInETH.toString()
        );
        await token.connect(account2).approve(foundry.address, tokenDeposited);
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
        //  burnt by owner
        await meToken.connect(account2).approve(foundry.address, balAfter);

        const rawAssetsReturnedFromFoundry =
          await foundry.calculateRawAssetsReturned(meToken.address, balAfter);
        const balBefore = await meToken.balanceOf(account0.address);
        const balDaiBefore = await token.balanceOf(account0.address);
        const vaultBalBeforeBurn = await token.balanceOf(
          singleAssetVault.address
        );
        const meTokenTotalSupply = await meToken.totalSupply();
        const meTokenDetails = await meTokenRegistry.getDetails(
          meToken.address
        );
        const metokenToBurn = balAfter.div(2);
        const rawAssetsReturned = calculateCollateralReturned(
          toETHNumber(metokenToBurn),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenDetails.balancePooled),
          reserveWeight / MAX_WEIGHT
        );
        const targetassetsReturned = calculateCollateralReturned(
          toETHNumber(metokenToBurn),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenDetails.balancePooled),
          updatedReserveWeight / MAX_WEIGHT
        );

        console.log(`
        reserveWeight:${reserveWeight} updatedReserveWeight:${updatedReserveWeight}
        vaultBalBeforeBurn  :${toETHNumber(vaultBalBeforeBurn)}
          balancepool       :${toETHNumber(meTokenDetails.balancePooled)}
          balanceLocked     :${toETHNumber(meTokenDetails.balanceLocked)}
          metokenToBurn  :${toETHNumber(metokenToBurn)}
        meTokenTotalSupply  :${toETHNumber(meTokenTotalSupply)}
        rawAssetsReturned   :${rawAssetsReturned}
        targetassetsReturned:${targetassetsReturned}
        `);
        await foundry
          .connect(account2)
          .burn(meToken.address, metokenToBurn, account2.address);
        const balDaiAfterBurn = await token.balanceOf(account2.address);
        const meTokenDetailsAfterBurn = await meTokenRegistry.getDetails(
          meToken.address
        );
        console.log(` 
        balanceLocked       :${toETHNumber(
          meTokenDetailsAfterBurn.balanceLocked
        )}
          balancepool       :${toETHNumber(
            meTokenDetailsAfterBurn.balancePooled
          )} 
        `);
        const {
          active,
          refundRatio,
          updating,
          startTime,
          endTime,
          endCooldown,
          reconfigure,
          targetRefundRatio,
        } = await hub.getDetails(1);
        expect(active).to.be.true;
        expect(updating).to.be.true;
        const block = await ethers.provider.getBlock("latest");

        const calcWAvrgRes = weightedAverageSimulation(
          rawAssetsReturned,
          targetassetsReturned,
          startTime.toNumber(),
          endTime.toNumber(),
          block.timestamp
        );
        const assetsReturned =
          (calcWAvrgRes * refundRatio.toNumber()) / MAX_WEIGHT;
        const calculatedReturn = ethers.utils
          .parseEther(`${assetsReturned}`)
          .mul(BigNumber.from(Math.floor(calcWAvrgRes)))
          .div(BigNumber.from(10 ** 6));
        console.log(` 
        calcWAvrgRes       :${calcWAvrgRes}
        assetsReturned  :${assetsReturned}
        calculatedReturn  :${toETHNumber(calculatedReturn)}
        rawAssetsReturnedFromFoundry  :${toETHNumber(
          rawAssetsReturnedFromFoundry
        )}
          balDaiAfterMint  :${toETHNumber(balDaiAfterMint)}
          balDaiAfterBurn  :${toETHNumber(balDaiAfterBurn)}
         
          `);
        // we get the calcWAvrgRes percentage of the tokens returned by the Metokens burn
        // expect(balDaiAfterBurn.sub(balDaiAfterMint)).to.equal(calculatedReturn);
        expect(
          toETHNumber(balDaiAfterBurn.sub(balDaiAfterMint))
        ).to.be.approximately(assetsReturned, 0.0000000000000001);
      });
      it("Assets received for owner based on weighted average not burning full supply ", async () => {
        // TODO: calculate weighted refundRatio based on current time relative to duration
        const tokenDepositedInETH = 100;
        const tokenDeposited = ethers.utils.parseEther(
          tokenDepositedInETH.toString()
        );
        await token
          .connect(account1)
          .transfer(account0.address, ethers.utils.parseEther("100"));
        await token.approve(foundry.address, tokenDeposited);
        const vaultBalBefore = await token.balanceOf(singleAssetVault.address);

        // send token to owner
        await foundry.mint(meToken.address, tokenDeposited, account0.address);
        const balDaiAfterMint = await token.balanceOf(account0.address);
        const balAfter = await meToken.balanceOf(account0.address);

        const vaultBalAfterMint = await token.balanceOf(
          singleAssetVault.address
        );
        expect(vaultBalAfterMint.sub(vaultBalBefore)).to.equal(tokenDeposited);
        //  burnt by owner
        await meToken.connect(account0).approve(foundry.address, balAfter);

        const rawAssetsReturnedFromFoundry =
          await foundry.calculateRawAssetsReturned(meToken.address, balAfter);
        const balBefore = await meToken.balanceOf(account0.address);
        const balDaiBefore = await token.balanceOf(account0.address);
        const vaultBalBeforeBurn = await token.balanceOf(
          singleAssetVault.address
        );
        const meTokenTotalSupply = await meToken.totalSupply();
        const meTokenDetails = await meTokenRegistry.getDetails(
          meToken.address
        );
        const metokenToBurn = balAfter.div(2);
        const rawAssetsReturned = calculateCollateralReturned(
          toETHNumber(metokenToBurn),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenDetails.balancePooled),
          reserveWeight / MAX_WEIGHT
        );
        const targetassetsReturned = calculateCollateralReturned(
          toETHNumber(metokenToBurn),
          toETHNumber(meTokenTotalSupply),
          toETHNumber(meTokenDetails.balancePooled),
          updatedReserveWeight / MAX_WEIGHT
        );

        console.log(`
        reserveWeight:${reserveWeight} updatedReserveWeight:${updatedReserveWeight}
        vaultBalBeforeBurn  :${toETHNumber(vaultBalBeforeBurn)}
        balancepool       :${toETHNumber(meTokenDetails.balancePooled)}
        balanceLocked     :${toETHNumber(meTokenDetails.balanceLocked)}
        metokenToBurn  :${toETHNumber(metokenToBurn)}
        meTokenTotalSupply  :${toETHNumber(meTokenTotalSupply)}
        rawAssetsReturned   :${rawAssetsReturned}
        targetassetsReturned:${targetassetsReturned}
        `);
        let meTokenDetailsAfterBurn = await meTokenRegistry.getDetails(
          meToken.address
        );
        console.log(` 
        balanceLocked before burn :${toETHNumber(
          meTokenDetailsAfterBurn.balanceLocked
        )}
        balancepool before burn :${toETHNumber(
          meTokenDetailsAfterBurn.balancePooled
        )} 
        `);

        await foundry
          .connect(account0)
          .burn(meToken.address, metokenToBurn, account0.address);

        const balDaiAfterBurn = await token.balanceOf(account0.address);
        meTokenDetailsAfterBurn = await meTokenRegistry.getDetails(
          meToken.address
        );
        console.log(` 
        balanceLocked       :${toETHNumber(
          meTokenDetailsAfterBurn.balanceLocked
        )}
        balancepool       :${toETHNumber(
          meTokenDetailsAfterBurn.balancePooled
        )} 
        `);
        const {
          active,
          refundRatio,
          updating,
          startTime,
          endTime,
          endCooldown,
          reconfigure,
          targetRefundRatio,
        } = await hub.getDetails(1);
        expect(active).to.be.true;
        expect(updating).to.be.true;
        const block = await ethers.provider.getBlock("latest");

        const calcWAvrgRes = weightedAverageSimulation(
          rawAssetsReturned,
          targetassetsReturned,
          startTime.toNumber(),
          endTime.toNumber(),
          block.timestamp
        );
        const assetsReturned =
          (calcWAvrgRes * refundRatio.toNumber()) / MAX_WEIGHT;
        const calculatedReturn = ethers.utils
          .parseEther(`${assetsReturned}`)
          .mul(BigNumber.from(Math.floor(calcWAvrgRes)))
          .div(BigNumber.from(10 ** 6));
        console.log(` 
        calcWAvrgRes      :${calcWAvrgRes}
        assetsReturned    :${assetsReturned}
        calculatedReturn  :${toETHNumber(calculatedReturn)}
        rawAssetsReturnedFromFoundry  :${toETHNumber(
          rawAssetsReturnedFromFoundry
        )}
        balDaiAfterMint   :${toETHNumber(balDaiAfterMint)}
        balDaiAfterBurn   :${toETHNumber(balDaiAfterBurn)}
        `);

        // we get the calcWAvrgRes percentage of the tokens returned by the Metokens burn
        // expect(balDaiAfterBurn.sub(balDaiAfterMint)).to.equal(calculatedReturn);
        expect(
          toETHNumber(balDaiAfterBurn.sub(balDaiAfterMint))
        ).to.be.approximately(assetsReturned, 0.0000000000000001);
      });
      /*    it("Assets received for owner are not based on weighted average refund ratio only applies to buyer", async () => {
        //move forward  2 Days
        await passDays(2);
        const tokenDepositedInETH = 100;
        const tokenDeposited = ethers.utils.parseEther(
          tokenDepositedInETH.toString()
        );

        await token.connect(account2).approve(foundry.address, tokenDeposited);

        const balBefore = await meToken.balanceOf(account0.address);
        const balDaiBefore = await token.balanceOf(account0.address);
        const vaultBalBefore = await token.balanceOf(singleAssetVault.address);

        // send token to owner
        await foundry
          .connect(account2)
          .mint(meToken.address, tokenDeposited, account0.address);
        const balAfter = await meToken.balanceOf(account0.address);
        const vaultBalAfterMint = await token.balanceOf(
          singleAssetVault.address
        );

        expect(vaultBalAfterMint.sub(vaultBalBefore)).to.equal(tokenDeposited);
        //  burnt by owner
        await meToken.connect(account0).approve(foundry.address, balAfter);

        const meTotSupply = await meToken.totalSupply();

        const meDetails = await meTokenRegistry.getDetails(meToken.address);

        const tokensReturned = await foundry.calculateRawAssetsReturned(
          meToken.address,
          balAfter
        );

        const rewardFromLockedPool = one
          .mul(balAfter)
          .mul(meDetails.balanceLocked)
          .div(meTotSupply)
          .div(one);

        await foundry
          .connect(account0)
          .burn(meToken.address, balAfter, account0.address);
        const balAfterBurn = await meToken.balanceOf(account0.address);
        expect(balBefore).to.equal(balAfterBurn);
        const balDaiAfter = await token.balanceOf(account0.address);

        const { active, updating } = await hub.getDetails(1);
        expect(active).to.be.true;
        expect(updating).to.be.true;

        expect(toETHNumber(balDaiAfter.sub(balDaiBefore))).to.equal(
          toETHNumber(tokensReturned.add(rewardFromLockedPool))
        );
      }); */

      it("mint(): assets received based on weighted average", async () => {});

      it("burn(): assets received for owner based on weighted average", async () => {
        // TODO: calculate weighted curveDetails based on current time relative to duration
      });

      it("burn(): assets received for buyer based on weighted average", async () => {});
    });

    describe("Cooldown", () => {
      it("Before refundRatio set, burn() should use the targetRefundRatio", async () => {});

      it("Call finishUpdate() and update refundRatio to targetRefundRatio", async () => {});
    });

    describe("Hub not", () => {
      it("If no burns during cooldown, initUpdate() first calls finishUpdate()", async () => {});

      it("If no burns during cooldown, initUpdate() args are compared to new vals set from on finishUpdate()", async () => {});
    });
  });
};
setup().then(() => {
  run();
});
