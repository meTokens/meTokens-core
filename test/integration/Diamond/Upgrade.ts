import { expect } from "chai";
import { BigNumber, Signer } from "ethers";
import { ethers, getNamedAccounts } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { hubSetup } from "../../utils/hubSetup";
import { deploy, getContractAt } from "../../utils/helpers";
import {
  FoundryFacet,
  MeTokenRegistryFacet,
  ERC20,
  SingleAssetVault,
  Diamond,
  DiamondLoupeFacet,
  FeesFacetMock,
  IDiamondCut,
  FeesFacet,
  OwnershipFacet,
  DiamondInit,
} from "../../../artifacts/types";
const setup = async () => {
  describe("Upgrade diamond", () => {
    let meTokenRegistry: MeTokenRegistryFacet;
    let singleAssetVault: SingleAssetVault;
    let foundry: FoundryFacet;
    let diamond: Diamond;
    let token: ERC20;
    let account0: SignerWithAddress;
    let tokenHolder: Signer;
    let account2: SignerWithAddress;
    let account3: SignerWithAddress;
    let diamondCut: IDiamondCut;
    let updatedFeesFacet: FeesFacetMock;
    const one = ethers.utils.parseEther("1");
    const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 };
    let baseY: BigNumber;
    let baseYNum: number;
    let reserveWeight: number;
    const firstHubId = 1;
    const refundRatio = 5000;
    const MAX_WEIGHT = 1000000;
    before(async () => {
      baseYNum = 1000;
      baseY = one.mul(baseYNum);
      reserveWeight = MAX_WEIGHT / 2;
      let DAI;
      ({ DAI } = await getNamedAccounts());

      const encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [DAI]
      );

      ({
        token,
        foundry,
        diamond,
        singleAssetVault,
        tokenHolder,
        account0,
        account2,
        account3,
        meTokenRegistry,
      } = await hubSetup(baseY, reserveWeight, encodedVaultArgs, refundRatio));
      diamondCut = await getContractAt<IDiamondCut>(
        "IDiamondCut",
        diamond.address
      );

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

      let max = ethers.constants.MaxUint256;
      await token.connect(account2).approve(singleAssetVault.address, max);

      const vaultBalBefore = await token.balanceOf(singleAssetVault.address);
      await foundry
        .connect(account2)
        .mint(meTokenAddr, tokenDeposited, account2.address);
      const vaultBalAfter = await token.balanceOf(singleAssetVault.address);
      expect(vaultBalAfter.sub(vaultBalBefore)).to.equal(tokenDeposited);
    });

    describe("facet", () => {
      it("add a new one should work", async () => {
        updatedFeesFacet = await deploy<FeesFacetMock>("FeesFacetMock");
        const setTotallyNewAddressSigHash =
          updatedFeesFacet.interface.getSighash(
            updatedFeesFacet.interface.functions[
              "setTotallyNewAddress(address)"
            ]
          );
        const totallyNewAddressSigHash = updatedFeesFacet.interface.getSighash(
          updatedFeesFacet.interface.functions["totallyNewAddress()"]
        );
        const cut = [
          {
            facetAddress: updatedFeesFacet.address,
            action: FacetCutAction.Add,
            functionSelectors: [
              setTotallyNewAddressSigHash,
              totallyNewAddressSigHash,
            ],
          },
        ];

        const tx = await diamondCut.diamondCut(
          cut,
          ethers.constants.AddressZero,
          ethers.utils.toUtf8Bytes("")
        );
        const receipt = await tx.wait();
        if (!receipt.status) {
          throw Error(`Diamond upgrade failed: ${tx.hash}`);
        }

        const loupe = await getContractAt<DiamondLoupeFacet>(
          "DiamondLoupeFacet",
          diamond.address
        );
        const funcs = await loupe.facetFunctionSelectors(
          updatedFeesFacet.address
        );
        expect(funcs)
          .to.be.an("array")
          .to.members([totallyNewAddressSigHash, setTotallyNewAddressSigHash]);

        // Ensure a new func that wasn't added to cut won't be recognized by
        // the diamond, even though the func exists on the facet
        const interestPlusYieldFee = updatedFeesFacet.interface.getSighash(
          updatedFeesFacet.interface.functions["interestPlusYieldFee()"]
        );
        expect(funcs).to.be.an("array").to.not.contain(interestPlusYieldFee);

        // call to new facet works
        const updatedFees = await getContractAt<FeesFacetMock>(
          "FeesFacetMock",
          diamond.address
        );
        await updatedFees.setTotallyNewAddress(account2.address);
        const newAdr = await updatedFees.totallyNewAddress();
        expect(newAdr).to.equal(account2.address);
        //call to other facet also works
        const ownFacet = await getContractAt<OwnershipFacet>(
          "OwnershipFacet",
          diamond.address
        );
        await ownFacet.setDeactivateController(account3.address);
        const newOwner = await ownFacet.deactivateController();
        expect(newOwner).to.equal(account3.address);
      });

      it("add only a function should work", async () => {
        const interestPlusYieldFee = updatedFeesFacet.interface.getSighash(
          updatedFeesFacet.interface.functions["interestPlusYieldFee()"]
        );

        const cut = [
          {
            facetAddress: updatedFeesFacet.address,
            action: FacetCutAction.Add,
            functionSelectors: [interestPlusYieldFee],
          },
        ];

        const tx = await diamondCut.diamondCut(
          cut,
          ethers.constants.AddressZero,
          ethers.utils.toUtf8Bytes("")
        );
        const receipt = await tx.wait();
        if (!receipt.status) {
          throw Error(`Diamond upgrade failed: ${tx.hash}`);
        }

        const loupe = await getContractAt<DiamondLoupeFacet>(
          "DiamondLoupeFacet",
          diamond.address
        );
        const funcs = await loupe.facetFunctionSelectors(
          updatedFeesFacet.address
        );
        expect(funcs).to.be.an("array").to.contain(interestPlusYieldFee);
        //call to other facet also works
        const feesFacet = await getContractAt<FeesFacet>(
          "FeesFacet",
          diamond.address
        );
        await feesFacet.setInterestFee(30);
        const interestFee = await feesFacet.interestFee();
        expect(interestFee).to.equal(30);
        await feesFacet.setYieldFee(12);
        const yieldFee = await feesFacet.yieldFee();
        expect(yieldFee).to.equal(12);
        // call to new facet works
        const updatedFees = await getContractAt<FeesFacetMock>(
          "FeesFacetMock",
          diamond.address
        );

        const intPlusYieldFee = await updatedFees.interestPlusYieldFee();
        expect(intPlusYieldFee).to.equal(42);
      });

      it("remove only a function should work", async () => {
        const interestPlusYieldFee = updatedFeesFacet.interface.getSighash(
          updatedFeesFacet.interface.functions["interestPlusYieldFee()"]
        );
        const cut = [
          {
            facetAddress: ethers.constants.AddressZero,
            action: FacetCutAction.Remove,
            functionSelectors: [interestPlusYieldFee],
          },
        ];
        const tx = await diamondCut.diamondCut(
          cut,
          ethers.constants.AddressZero,
          ethers.utils.toUtf8Bytes("")
        );
        const receipt = await tx.wait();
        if (!receipt.status) {
          throw Error(`Diamond upgrade failed: ${tx.hash}`);
        }
        const loupe = await getContractAt<DiamondLoupeFacet>(
          "DiamondLoupeFacet",
          diamond.address
        );
        const funcs = await loupe.facetFunctionSelectors(
          updatedFeesFacet.address
        );
        expect(funcs).to.be.an("array").to.not.contain(interestPlusYieldFee);
        //call to other facet also works
        const feesFacet = await getContractAt<FeesFacet>(
          "FeesFacet",
          diamond.address
        );
        await feesFacet.setInterestFee(28);
        const interestFee = await feesFacet.interestFee();
        expect(interestFee).to.equal(28);
        await feesFacet.setYieldFee(14);
        const yieldFee = await feesFacet.yieldFee();
        expect(yieldFee).to.equal(14);
        // call to new facet works
        const updatedFees = await getContractAt<FeesFacetMock>(
          "FeesFacetMock",
          diamond.address
        );
        await expect(updatedFees.interestPlusYieldFee()).to.revertedWith(
          "Diamond: Function does not exist"
        );
      });

      it("update a function should work", async () => {
        const setInterestFee = updatedFeesFacet.interface.getSighash(
          updatedFeesFacet.interface.functions["setInterestFee(uint256)"]
        );
        const cut = [
          {
            facetAddress: updatedFeesFacet.address,
            action: FacetCutAction.Replace,
            functionSelectors: [setInterestFee],
          },
        ];
        const tx = await diamondCut.diamondCut(
          cut,
          ethers.constants.AddressZero,
          ethers.utils.toUtf8Bytes("")
        );
        const receipt = await tx.wait();
        if (!receipt.status) {
          throw Error(`Diamond upgrade failed: ${tx.hash}`);
        }
        const loupe = await getContractAt<DiamondLoupeFacet>(
          "DiamondLoupeFacet",
          diamond.address
        );
        const funcs = await loupe.facetFunctionSelectors(
          updatedFeesFacet.address
        );
        expect(funcs).to.be.an("array").to.contain(setInterestFee);
        //call to other facet also works
        const feesFacet = await getContractAt<FeesFacet>(
          "FeesFacet",
          diamond.address
        );
        let interestFee = await feesFacet.interestFee();
        expect(interestFee).to.equal(28);
        await feesFacet.setInterestFee(1);
        interestFee = await feesFacet.interestFee();
        expect(interestFee).to.equal(43);
      });

      it("add same a function should revert", async () => {
        const totallyNewAddressSigHash = updatedFeesFacet.interface.getSighash(
          updatedFeesFacet.interface.functions["totallyNewAddress()"]
        );

        const cut = [
          {
            facetAddress: updatedFeesFacet.address,
            action: FacetCutAction.Add,
            functionSelectors: [totallyNewAddressSigHash],
          },
        ];

        await expect(
          diamondCut.diamondCut(
            cut,
            ethers.constants.AddressZero,
            ethers.utils.toUtf8Bytes("")
          )
        ).to.be.revertedWith(
          "LibDiamondCut: Can't add function that already exists"
        );
      });

      it("removing non existing function should revert", async () => {
        const add = updatedFeesFacet.interface.getSighash(
          updatedFeesFacet.interface.functions["add(uint256,uint256)"]
        );

        const cut = [
          {
            facetAddress: ethers.constants.AddressZero,
            action: FacetCutAction.Remove,
            functionSelectors: [add],
          },
        ];

        await expect(
          diamondCut.diamondCut(
            cut,
            ethers.constants.AddressZero,
            ethers.utils.toUtf8Bytes("")
          )
        ).to.be.revertedWith(
          "LibDiamondCut: Can't remove function that doesn't exist"
        );
      });

      it("add a new one with init data should work", async () => {
        updatedFeesFacet = await deploy<FeesFacetMock>("FeesFacetMock");
        const diamondInit = await deploy<DiamondInit>("DiamondInit");
        const interestPlusYieldFee = updatedFeesFacet.interface.getSighash(
          updatedFeesFacet.interface.functions["interestPlusYieldFee()"]
        );
        const cut = [
          {
            facetAddress: updatedFeesFacet.address,
            action: FacetCutAction.Add,
            functionSelectors: [interestPlusYieldFee],
          },
        ];
        const feesFacet = await getContractAt<FeesFacet>(
          "FeesFacet",
          diamond.address
        );
        const interestFeeBefore = await feesFacet.interestFee();
        expect(interestFeeBefore).to.equal(43);
        const yieldFeeBefore = await feesFacet.yieldFee();
        expect(yieldFeeBefore).to.equal(14);

        let args: any = [
          {
            mintFee: 1,
            burnBuyerFee: 2,
            burnOwnerFee: 3,
            transferFee: 4,
            interestFee: 24568974545,
            yieldFee: 89746654654,
            diamond: diamond.address,
            vaultRegistry: diamond.address,
            migrationRegistry: diamond.address,
            meTokenFactory: diamond.address,
          },
        ];
        let functionCall = diamondInit.interface.encodeFunctionData(
          "init",
          args
        );
        const tx = await diamondCut.diamondCut(
          cut,
          diamondInit.address,
          functionCall
        );
        const receipt = await tx.wait();
        if (!receipt.status) {
          throw Error(`Diamond upgrade failed: ${tx.hash}`);
        }
        const interestFeeAfter = await feesFacet.interestFee();
        expect(interestFeeAfter).to.equal(24568974545);
        const yieldFeeAfter = await feesFacet.yieldFee();
        expect(yieldFeeAfter).to.equal(89746654654);
        const loupe = await getContractAt<DiamondLoupeFacet>(
          "DiamondLoupeFacet",
          diamond.address
        );
        const funcs = await loupe.facetFunctionSelectors(
          updatedFeesFacet.address
        );
        expect(funcs).to.be.an("array").to.contain(interestPlusYieldFee);
        // call to new facet works
        const updatedFees = await getContractAt<FeesFacetMock>(
          "FeesFacetMock",
          diamond.address
        );

        const newAdr = await updatedFees.interestPlusYieldFee();
        expect(newAdr).to.equal(24568974545 + 89746654654);
        //call to other facet also works
        const ownFacet = await getContractAt<OwnershipFacet>(
          "OwnershipFacet",
          diamond.address
        );
        await ownFacet
          .connect(account3)
          .setDeactivateController(account2.address);
        const newOwner = await ownFacet.deactivateController();
        expect(newOwner).to.equal(account2.address);
      });
    });
  });
};

setup().then(() => {
  run();
});
