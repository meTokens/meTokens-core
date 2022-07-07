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
  DiamondInitMock,
} from "../../../artifacts/types";
const setup = async () => {
  describe("Upgrade diamond", () => {
    let meTokenRegistry: MeTokenRegistryFacet;
    let singleAssetVault: SingleAssetVault;
    let foundry: FoundryFacet;
    let diamond: Diamond;
    let token: ERC20;
    let account0: SignerWithAddress;
    let whale: Signer;
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
        whale,
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
        .connect(whale)
        .transfer(account2.address, ethers.utils.parseEther("100"));
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
    describe("init", () => {
      it("twice init should fail", async () => {
        updatedFeesFacet = await deploy<FeesFacetMock>("FeesFacetMock");
        const diamondInit = await deploy<DiamondInit>("DiamondInit");
        const mintPlusBurnBuyerFee = updatedFeesFacet.interface.getSighash(
          updatedFeesFacet.interface.functions["mintPlusBurnBuyerFee()"]
        );
        const cut = [
          {
            facetAddress: updatedFeesFacet.address,
            action: FacetCutAction.Add,
            functionSelectors: [mintPlusBurnBuyerFee],
          },
        ];

        let args: any = [
          {
            mintFee: 1,
            burnBuyerFee: 2,
            burnOwnerFee: 3,
            diamond: diamond.address,
            //  me: ethers.constants.AddressZero,
            vaultRegistry: diamond.address,
            migrationRegistry: diamond.address,
            meTokenFactory: diamond.address,
          },
        ];
        let functionCall = diamondInit.interface.encodeFunctionData(
          "init",
          args
        );
        await expect(
          diamondCut.diamondCut(cut, diamondInit.address, functionCall)
        ).to.be.revertedWith("Already initialized");
      });
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
        const mintPlusBurnBuyerFee = updatedFeesFacet.interface.getSighash(
          updatedFeesFacet.interface.functions["mintPlusBurnBuyerFee()"]
        );
        expect(funcs).to.be.an("array").to.not.contain(mintPlusBurnBuyerFee);

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
        const mintPlusBurnBuyerFee = updatedFeesFacet.interface.getSighash(
          updatedFeesFacet.interface.functions["mintPlusBurnBuyerFee()"]
        );

        const cut = [
          {
            facetAddress: updatedFeesFacet.address,
            action: FacetCutAction.Add,
            functionSelectors: [mintPlusBurnBuyerFee],
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
        expect(funcs).to.be.an("array").to.contain(mintPlusBurnBuyerFee);
        //call to other facet also works
        const feesFacet = await getContractAt<FeesFacet>(
          "FeesFacet",
          diamond.address
        );
        // current value
        let mintFee = await feesFacet.mintFee();
        expect(mintFee).to.equal(0);
        // resetting
        await feesFacet.setMintFee(2);
        mintFee = await feesFacet.mintFee();
        expect(mintFee).to.equal(2);
        await feesFacet.setBurnBuyerFee(5);
        let burnBuyerFee = await feesFacet.burnBuyerFee();
        expect(burnBuyerFee).to.equal(5);
        // call to new facet works
        const updatedFees = await getContractAt<FeesFacetMock>(
          "FeesFacetMock",
          diamond.address
        );

        const intPlusYieldFee = await updatedFees.mintPlusBurnBuyerFee();
        expect(intPlusYieldFee).to.equal(7); // 5+ 2
      });

      it("remove only a function should work", async () => {
        const mintPlusBurnBuyerFee = updatedFeesFacet.interface.getSighash(
          updatedFeesFacet.interface.functions["mintPlusBurnBuyerFee()"]
        );
        const cut = [
          {
            facetAddress: ethers.constants.AddressZero,
            action: FacetCutAction.Remove,
            functionSelectors: [mintPlusBurnBuyerFee],
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
        expect(funcs).to.be.an("array").to.not.contain(mintPlusBurnBuyerFee);
        //call to other facet also works
        const feesFacet = await getContractAt<FeesFacet>(
          "FeesFacet",
          diamond.address
        );
        // current value
        let mintFee = await feesFacet.mintFee();
        expect(mintFee).to.equal(2);
        // resetting
        await feesFacet.setMintFee(10);
        mintFee = await feesFacet.mintFee();
        expect(mintFee).to.equal(10);
        // call to new facet works
        const updatedFees = await getContractAt<FeesFacetMock>(
          "FeesFacetMock",
          diamond.address
        );
        await expect(updatedFees.mintPlusBurnBuyerFee()).to.revertedWith(
          "Diamond: Function does not exist"
        );
      });

      it("update a function should work", async () => {
        const setMintFee = updatedFeesFacet.interface.getSighash(
          updatedFeesFacet.interface.functions["setMintFee(uint256)"]
        );
        const cut = [
          {
            facetAddress: updatedFeesFacet.address,
            action: FacetCutAction.Replace,
            functionSelectors: [setMintFee],
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
        expect(funcs).to.be.an("array").to.contain(setMintFee);
        //call to other facet also works
        const feesFacet = await getContractAt<FeesFacet>(
          "FeesFacet",
          diamond.address
        );
        // current value
        let mintFee = await feesFacet.mintFee();
        expect(mintFee).to.equal(10);
        // resetting
        await feesFacet.setMintFee(20);
        mintFee = await feesFacet.mintFee();
        expect(mintFee).to.equal(20 + 42);
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
        const diamondInit = await deploy<DiamondInitMock>("DiamondInitMock");
        const mintPlusBurnBuyerFee = updatedFeesFacet.interface.getSighash(
          updatedFeesFacet.interface.functions["mintPlusBurnBuyerFee()"]
        );
        const cut = [
          {
            facetAddress: updatedFeesFacet.address,
            action: FacetCutAction.Add,
            functionSelectors: [mintPlusBurnBuyerFee],
          },
        ];
        const feesFacet = await getContractAt<FeesFacet>(
          "FeesFacet",
          diamond.address
        );

        // current value
        let mintFee = await feesFacet.mintFee();
        expect(mintFee).to.equal(20 + 42);
        // resetting
        await feesFacet.setMintFee(1);
        mintFee = await feesFacet.mintFee();
        expect(mintFee).to.equal(1 + 42);

        let functionCall = diamondInit.interface.encodeFunctionData("init", [
          "24568974545",
        ]);
        const tx = await diamondCut.diamondCut(
          cut,
          diamondInit.address,
          functionCall
        );
        const receipt = await tx.wait();
        if (!receipt.status) {
          throw Error(`Diamond upgrade failed: ${tx.hash}`);
        }
        // current value
        mintFee = await feesFacet.mintFee();
        expect(mintFee).to.equal(24568974545);
        // resetting
        await feesFacet.setMintFee(1);
        mintFee = await feesFacet.mintFee();
        expect(mintFee).to.equal(1 + 42);
        const loupe = await getContractAt<DiamondLoupeFacet>(
          "DiamondLoupeFacet",
          diamond.address
        );
        const funcs = await loupe.facetFunctionSelectors(
          updatedFeesFacet.address
        );
        expect(funcs).to.be.an("array").to.contain(mintPlusBurnBuyerFee);
        // call to new facet works
        const updatedFees = await getContractAt<FeesFacetMock>(
          "FeesFacetMock",
          diamond.address
        );

        const newAdr = await updatedFees.mintPlusBurnBuyerFee();
        expect(newAdr)
          .to.equal(1 + 42 + 5)
          .to.equal(
            (await feesFacet.mintFee()).add(await feesFacet.burnBuyerFee())
          );
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
