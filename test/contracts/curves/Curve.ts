import { ethers, getNamedAccounts } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { deploy, getContractAt } from "../../utils/helpers";
import { BigNumber, Signer } from "ethers";
import { impersonate, mineBlock, passOneHour } from "../../utils/hardhatNode";
import { BancorZeroCurve } from "../../../artifacts/types/BancorZeroCurve";
import { ERC20 } from "../../../artifacts/types/ERC20";
import { Foundry } from "../../../artifacts/types/Foundry";
import { Hub } from "../../../artifacts/types/Hub";
import { MeTokenRegistry } from "../../../artifacts/types/MeTokenRegistry";
import { SingleAssetVault } from "../../../artifacts/types/SingleAssetVault";
import { Fees } from "../../../artifacts/types/Fees";
import { MeToken } from "../../../artifacts/types/MeToken";
import { expect } from "chai";
import hubSetup from "../../utils/hubSetup";

describe("Generic Curve", () => {
  let DAI: string;
  let DAIWhale: string;
  let daiHolder: Signer;
  let dai: ERC20;
  let account0: SignerWithAddress;
  let account1: SignerWithAddress;
  let account2: SignerWithAddress;
  let _curve: BancorZeroCurve;
  let meTokenRegistry: MeTokenRegistry;
  let foundry: Foundry;
  let meToken: MeToken;
  let hub: Hub;
  let fees: Fees;
  let singleAssetVault: SingleAssetVault;

  const hubId = 1;
  const name = "Carl meToken";
  const symbol = "CARL";
  const refundRatio = 240000;
  const PRECISION = BigNumber.from(10).pow(6);
  const amount1 = ethers.utils.parseEther("100");
  const amount2 = ethers.utils.parseEther("6.9");

  // TODO: pass in curve arguments to function
  // TODO: then loop over array of set of curve arguments
  const MAX_WEIGHT = 1000000;
  const reserveWeight = MAX_WEIGHT / 2;
  const baseY = PRECISION.div(1000).toString();

  before(async () => {
    ({ DAI, DAIWhale } = await getNamedAccounts());
    const encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
      ["address"],
      [DAI]
    );
    // TODO: pass in name of curve to deploy, encodedCurveDetails to general func
    const encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint32"],
      [baseY, reserveWeight]
    );
    _curve = await deploy<BancorZeroCurve>("BancorZeroCurve");

    let token;
    let tokenHolder;
    ({
      token,
      tokenHolder,
      hub,
      foundry,
      account0,
      account1,
      account2,
      meTokenRegistry,
      singleAssetVault,
    } = await hubSetup(encodedCurveDetails, encodedVaultArgs, 5000, _curve));
    fees = await deploy<Fees>("Fees");
    await fees.initialize(0, 0, 0, 0, 0, 0);
    await foundry.initialize(
      hub.address,
      fees.address,
      meTokenRegistry.address
    );

    // Prefund owner/buyer w/ DAI
    dai = token;
    dai
      .connect(tokenHolder)
      .transfer(account0.address, ethers.utils.parseEther("100"));
    dai
      .connect(tokenHolder)
      .transfer(account2.address, ethers.utils.parseEther("1000"));
  });

  describe("register()", () => {
    it("Reverts w/ empty encodedDetails", async () => {
      // TODO
    });
    it("Reverts w/ invalid encodedDetails", async () => {
      // TODO
    });
    it("Passes w/ valid encodedDetails", async () => {
      // TODO
    });
  });

  describe("getDetails()", () => {
    it("Returns correct struct type", async () => {});
    it("Returns correct registered details", async () => {});
  });

  describe("calculateMintReturn()", () => {
    it("balanceLocked = 0, balancePooled = 0, mint on meToken creation", async () => {
      let expectedMeTokensMinted = await _curve.calculateMintReturn(
        amount1,
        hubId,
        0,
        0
      );
      let expectedTokensDeposited = await _curve.calculateTokensDeposited(
        expectedMeTokensMinted,
        hubId,
        0,
        0
      );

      // Get balances before mint
      let ownerDaiBalanceBefore = await dai.balanceOf(account1.address);
      let vaultDaiBalanceBefore = await dai.balanceOf(singleAssetVault.address);

      // Mint first meTokens to owner
      let tx = await meTokenRegistry
        .connect(account1)
        .subscribe(name, symbol, hubId, amount1);
      let meTokenAddr = await meTokenRegistry.getOwnerMeToken(account1.address);
      meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);

      // Compare expected meTokens minted to actual held
      let meTokensMinted = await meToken.balanceOf(account1.address);
      expect(meTokensMinted).to.equal(expectedMeTokensMinted);
      let totalSupply = await meToken.totalSupply();
      expect(totalSupply).to.equal(meTokensMinted);

      // Compare owner dai balance before/after
      let ownerDaiBalanceAfter = await dai.balanceOf(account1.address);
      expect(
        // TODO: how to verify difference of numbers to type of amount1?
        Number(ownerDaiBalanceBefore) - Number(ownerDaiBalanceAfter)
      ).to.equal(amount1);

      // Expect balance of vault to have increased by assets deposited
      let vaultDaiBalanceAfter = await dai.balanceOf(singleAssetVault.address);
      expect(
        Number(vaultDaiBalanceAfter) - Number(vaultDaiBalanceBefore)
      ).to.equal(amount1);
      expect(amount1).to.equal(expectedTokensDeposited);
    });

    it("balanceLocked = 0, balancePooled = 0, mint after meToken creation", async () => {
      let expectedMeTokensMinted = await _curve.calculateMintReturn(
        amount1,
        hubId,
        0,
        0
      );
      let expectedTokensDeposited = await _curve.calculateTokensDeposited(
        expectedMeTokensMinted,
        hubId,
        0,
        0
      );

      // Get balances before mint
      let buyerDaiBalanceBefore = await dai.balanceOf(account2.address);
      let vaultDaiBalanceBefore = await dai.balanceOf(singleAssetVault.address);

      // Mint first meTokens to buyer
      const tx = await meTokenRegistry
        .connect(account1)
        .subscribe(name, symbol, hubId, 0);
      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account1.address
      );
      meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);
      await foundry
        .connect(account2)
        .mint(meToken.address, amount1, account2.address);

      // Compare expected meTokens minted to actual held
      const meTokensMinted = await meToken.balanceOf(account2.address);
      expect(meTokensMinted).to.equal(expectedMeTokensMinted);
      const totalSupply = await meToken.totalSupply();
      expect(totalSupply).to.equal(meTokensMinted);

      // Compare buyer dai balance before/after
      let buyerDaiBalanceAfter = await dai.balanceOf(account1.address);
      expect(
        Number(buyerDaiBalanceBefore) - Number(buyerDaiBalanceAfter)
      ).to.equal(amount1);

      // Expect balance of vault to have increased by assets deposited
      let vaultDaiBalanceAfter = await dai.balanceOf(singleAssetVault.address);
      expect(
        Number(vaultDaiBalanceAfter) - Number(vaultDaiBalanceBefore)
      ).to.equal(amount1);
      expect(amount1).to.equal(expectedTokensDeposited);
    });

    it("balanceLocked = 0, balancePooled > 0", async () => {
      // TODO
    });

    it("balanceLocked > 0, balancePooled = 0", async () => {
      // TODO
    });

    it("balanceLocked > 0, balancePooled > 0", async () => {
      // TODO
    });
  });

  describe("calculateBurnReturn()", () => {
    it("balanceLocked = 0, buyer, ending supply = 0", async () => {
      // TODO
    });
    it("balanceLocked = 0, owner, ending supply = 0", async () => {
      // TODO
    });
    it("balanceLocked = 0, buyer, ending supply > 0", async () => {
      // TODO
    });
    it("balanceLocked = 0, owner, ending supply > 0", async () => {
      // TODO
    });
    it("balanceLocked > 0, buyer, ending supply = 0", async () => {
      // TODO
    });
    it("balanceLocked > 0, owner, ending supply = 0", async () => {
      // TODO
    });
    it("balanceLocked > 0, buyer, ending supply > 0", async () => {
      // TODO
    });
    it("balanceLocked > 0, owner, ending supply > 0", async () => {
      // TODO
    });
  });

  describe("initReconfigure()", () => {
    it("Only be callable by Hub", async () => {
      // TODO
    });
    it("Fails if settings out of range", async () => {
      // TODO
    });
    it("Fails if target values == current values", async () => {
      // TODO
    });
    it("Sets target values", async () => {
      // TODO
    });
  });

  describe("finishReconfigure()", () => {
    it("Only callable by Hub", async () => {
      // TODO
    });
    it("Sets all values to target values", async () => {
      // TODO
    });
    it("Resets target values to default values", async () => {
      // TODO
    });
  });

  // it("calculateMintReturn() should work", async () => {
  //   let amount = one.mul(2);
  //   let estimate = await _curve.calculateMintReturn(
  //     amount,
  //     hubId,
  //     one.mul(2000),
  //     one.mul(2)
  //   );
  //   expect(estimate).to.equal(
  //     ethers.utils.parseEther("828.427124746190097603")
  //   );
  //   amount = one.mul(2);

  //   estimate = await _curve.calculateMintReturn(
  //     amount,
  //     hubId,
  //     ethers.utils.parseEther("2828.427124746190097603"),
  //     one.mul(4)
  //   );
  //   expect(estimate).to.equal(
  //     ethers.utils.parseEther("635.674490391564489451")
  //   );
  // });
  // it("calculateMintReturn should work with a max of 1414213562 supply should work", async () => {
  //   let amount = one.mul(999999999999999);
  //   let estimate = await _curve.calculateMintReturn(amount, hubId, 0, 0);
  //   expect(estimate).to.equal(
  //     ethers.utils.parseEther("1414213562.373094341694907537")
  //   );
  // });
  // it("calculateBurnReturn() to zero supply should work", async () => {
  //   let amount = ethers.utils.parseEther("200");
  //   // 586 burned token should release 1 DAI
  //   //  let p = await getRequestParams(amount);
  //   let estimate = await _curve.calculateBurnReturn(
  //     amount,
  //     hubId,
  //     one.mul(200),
  //     one.mul(20)
  //   );
  //   expect(estimate).to.equal(ethers.utils.parseEther("20"));
  // });

  // describe("calculateBurnReturn()", () => {
  //   // 586 burned token should release 1 DAI
  //   //  let p = await getRequestParams(amount);
  //   let estimate = await _curve.calculateBurnReturn(
  //     amount,
  //     hubId,
  //     one.mul(2000),
  //     one.mul(2)
  //   );
  //   expect(estimate).to.equal(ethers.utils.parseEther("1.000000000000000001"));

  //   amount = ethers.utils.parseEther("1171.572875253809903");

  //   estimate = await _curve.calculateBurnReturn(
  //     amount,
  //     hubId,
  //     one.mul(4000),
  //     one.mul(8)
  //   );
  //   expect(estimate).to.equal(ethers.utils.parseEther("4.000000000000000001"));
  // });
  // it("calculateBurnReturn should work with a max of 999999999999999000000000000000000 supply should work", async () => {
  //   let amount = one;

  //   let estimate = await _curve.calculateBurnReturn(
  //     amount,
  //     hubId,
  //     ethers.utils.parseEther("999999999999998999.99999999999999744"),
  //     one.mul(999999999999999)
  //   );

  //   expect(estimate).to.equal(ethers.utils.parseEther("0.002"));
  // });
  // it("initReconfigure() should work", async () => {
  //   const reserveWeight = BigNumber.from(MAX_WEIGHT).div(2);
  //   const targetReserveWeight = BigNumber.from(MAX_WEIGHT).sub(20000);
  //   const encodedValueSet = ethers.utils.defaultAbiCoder.encode(
  //     ["uint32"],
  //     [targetReserveWeight.toString()]
  //   );
  //   await _curve.initReconfigure(hubId, encodedValueSet);
  //   const detail = await _curve.getDetails(hubId);
  //   const targetBaseY = baseY.mul(reserveWeight).div(targetReserveWeight);
  //   expect(detail.targetReserveWeight).to.equal(targetReserveWeight);
  //   expect(detail.targetBaseY).to.equal(targetBaseY);
  // });

  // it("calculateBurnReturn() should work", async () => {
  //   let amount = ethers.utils.parseEther("1944.930817973436691629");
  //   // 586 burned token should release 1 DAI
  //   //  let p = await getRequestParams(amount);
  //   let estimate = await _curve.calculateTargetBurnReturn(
  //     amount,
  //     hubId,
  //     ethers.utils.parseEther("3944.930817973436691629"),
  //     one.mul(4)
  //   );
  //   expect(estimate).to.equal(ethers.utils.parseEther("1.999999999999999999"));

  //   amount = one.mul(1000);

  //   estimate = await _curve.calculateTargetBurnReturn(
  //     amount,
  //     hubId,
  //     one.mul(2000),
  //     one.mul(2)
  //   );
  //   expect(estimate).to.equal(ethers.utils.parseEther("1.014046278251899934"));
  // });
});