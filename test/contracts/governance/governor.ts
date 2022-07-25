import "@nomiclabs/hardhat-ethers";
import { ethers, getNamedAccounts } from "hardhat";
import { BigNumber, utils } from "ethers";
import { expect } from "chai";
import {
  DiamondLoupeFacet,
  FeesFacetMock,
  GovernanceTimeLock,
  HubFacet,
  IDiamondCut,
  MEGovernor,
  METoken,
  OwnershipFacet,
  SingleAssetVault,
} from "../../../artifacts/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { mineBlocks } from "../../utils/hardhatNode";
import { hubSetupWithoutRegister } from "../../utils/hubSetup";
import { deploy, getContractAt } from "../../utils/helpers";

const setup = async () => {
  describe("Test Governance and Timelock", () => {
    let owner: SignerWithAddress,
      acc1: SignerWithAddress,
      acc2: SignerWithAddress,
      acc3: SignerWithAddress,
      acc4: SignerWithAddress,
      proposer: SignerWithAddress,
      recepient: SignerWithAddress;

    const decimals: BigNumber = ethers.utils.parseEther("1");

    const VOTING_PERIOD = 45992; //blocks = 1 week
    const VOTING_DELAY = 1; //block
    const TIMELOCK_DELAY = 6575; //block = 1 day
    const TIMELOCK_ADMIN_ROLE = utils.solidityKeccak256(
      ["string"],
      ["TIMELOCK_ADMIN_ROLE"]
    );
    const PROPOSER_ROLE = utils.solidityKeccak256(
      ["string"],
      ["PROPOSER_ROLE"]
    );
    const EXECUTOR_ROLE = utils.solidityKeccak256(
      ["string"],
      ["EXECUTOR_ROLE"]
    );
    const CANCELLER_ROLE = utils.solidityKeccak256(
      ["string"],
      ["CANCELLER_ROLE"]
    );

    let governor: MEGovernor;
    let gToken: METoken;
    let timelock: GovernanceTimeLock;

    beforeEach(async () => {
      [owner, acc1, acc2, acc3, acc4, proposer, recepient] =
        await ethers.getSigners();

      const tokenFactory = await ethers.getContractFactory("METoken");
      const timeLockFactory = await ethers.getContractFactory(
        "GovernanceTimeLock"
      );
      const govFactory = await ethers.getContractFactory("MEGovernor");

      gToken = (await tokenFactory.deploy()) as METoken;

      timelock = (await timeLockFactory.deploy(
        TIMELOCK_DELAY,
        [],
        []
      )) as GovernanceTimeLock;

      governor = (await govFactory.deploy(
        gToken.address,
        timelock.address
      )) as MEGovernor;

      // setup timelock
      // we can assign this role to the special zero address to allow anyone to execute
      await timelock.grantRole(EXECUTOR_ROLE, ethers.constants.AddressZero);
      // Proposer role is in charge of queueing operations this is the role the Governor instance should be granted
      // and it should likely be the only proposer in the system.
      await timelock.grantRole(PROPOSER_ROLE, governor.address);
      await timelock.grantRole(CANCELLER_ROLE, governor.address);

      // this is a very sensitive role that will be granted automatically to both deployer and timelock itself
      // should be renounced by the deployer after setup.
      await timelock.revokeRole(TIMELOCK_ADMIN_ROLE, owner.address);

      //setup token
      await gToken.mint(owner.address, BigNumber.from(100000).mul(decimals));
      const vp = await gToken.getVotes(owner.address);
      expect(vp).to.equal(0);
      await gToken.delegate(owner.address);
      const vpd = await gToken.getVotes(owner.address);
      expect(vpd).to.equal(BigNumber.from(100000).mul(decimals));
      const proposalThreshold = await governor.proposalThreshold();
      expect(proposalThreshold).to.equal(vpd);
      await gToken.mint(acc1.address, BigNumber.from(10).mul(decimals));
      await gToken.mint(acc2.address, BigNumber.from(7).mul(decimals));
      await gToken.mint(acc3.address, BigNumber.from(6).mul(decimals));
      await gToken.mint(acc4.address, BigNumber.from(5).mul(decimals));
      await gToken.transferOwnership(timelock.address);
      // need to self delegate as minting doesn't accrue voting power
      await gToken.connect(acc1).delegate(acc1.address);
      await gToken.connect(acc2).delegate(acc2.address);
      await gToken.connect(acc3).delegate(acc3.address);
      await gToken.connect(acc4).delegate(acc4.address);
    });

    describe("Test TimeLock", async () => {
      it("initial state", async () => {
        expect(await timelock.TIMELOCK_ADMIN_ROLE()).to.be.equal(
          TIMELOCK_ADMIN_ROLE
        );
        expect(await timelock.PROPOSER_ROLE()).to.be.equal(PROPOSER_ROLE);
        expect(await timelock.EXECUTOR_ROLE()).to.be.equal(EXECUTOR_ROLE);
        expect(await timelock.CANCELLER_ROLE()).to.be.equal(CANCELLER_ROLE);
      });

      it("Test Roles", async () => {
        expect(
          await timelock.hasRole(TIMELOCK_ADMIN_ROLE, owner.address)
        ).to.be.equal(false);
        expect(
          await timelock.hasRole(TIMELOCK_ADMIN_ROLE, timelock.address)
        ).to.be.equal(true);
        expect(
          await timelock.hasRole(PROPOSER_ROLE, governor.address)
        ).to.be.equal(true);
        expect(
          await timelock.hasRole(CANCELLER_ROLE, governor.address)
        ).to.be.equal(true);
        expect(
          await timelock.hasRole(EXECUTOR_ROLE, governor.address)
        ).to.be.equal(false);
        expect(
          await timelock.hasRole(EXECUTOR_ROLE, ethers.constants.AddressZero)
        ).to.be.equal(true);
      });
    });

    describe("Propose scenarios ", async () => {
      it("Should revert because of voting power", async () => {
        const description = "Proposal #1 mint tokens to recipient";
        const calldata = gToken.interface.encodeFunctionData("mint", [
          recepient.address,
          BigNumber.from(99).mul(decimals),
        ]);
        const proposalThresholdBefore = await governor.proposalThreshold();
        const balBefore = await gToken.balanceOf(acc1.address);

        expect(balBefore).to.be.lt(proposalThresholdBefore);
        await expect(
          governor
            .connect(acc1)
            .propose([gToken.address], [0], [calldata], description)
        ).to.be.revertedWith(
          "Governor: proposer votes below proposal threshold"
        );

        const vp = await gToken.getVotes(acc1.address);
        expect(vp).to.equal(await gToken.balanceOf(acc1.address));
        await gToken.delegate(acc1.address);
        const vpd = await gToken.getVotes(acc1.address);
        // mint doesn't add voting power so we self delegate
        expect(vpd).to.equal(proposalThresholdBefore.add(vp));

        await expect(
          governor
            .connect(acc1)
            .propose([gToken.address], [0], [calldata], description)
        ).to.emit(governor, "ProposalCreated");
      });
      it("Should revert because voting delay", async () => {
        const description = "Proposal #1 mint tokens to recepient";
        const calldata = gToken.interface.encodeFunctionData("mint", [
          recepient.address,
          BigNumber.from(99).mul(decimals),
        ]);
        const propose1 = await governor.propose(
          [gToken.address],
          [0],
          [calldata],
          description
        );
        const proposeReceipt = await propose1.wait(1);
        const proposalId = proposeReceipt.events![0].args!.proposalId;

        await expect(
          governor.connect(acc1).castVote(proposalId, 1)
        ).to.be.revertedWith("Governor: vote not currently active");
      });
      it("Should revert because voting period", async () => {
        const description = "Proposal #1 mint tokens to recepient";
        const calldata = gToken.interface.encodeFunctionData("mint", [
          recepient.address,
          BigNumber.from(99).mul(decimals),
        ]);
        const propose1 = await governor.propose(
          [gToken.address],
          [0],
          [calldata],
          description
        );
        const proposeReceipt = await propose1.wait(1);
        const proposalId = proposeReceipt.events![0].args!.proposalId;

        await mineBlocks(VOTING_DELAY + 1);

        await governor.connect(acc1).castVote(proposalId, 1);
        await governor.connect(acc2).castVote(proposalId, 1);
        await governor.connect(acc3).castVote(proposalId, 1);

        const descriptionHash = ethers.utils.id(description);
        await expect(
          governor.queue([gToken.address], [0], [calldata], descriptionHash)
        ).to.revertedWith("Governor: proposal not successful");
      });
      it("Should revert because of the quorum", async () => {
        const description = "Proposal #1 mint tokens to recepient";
        const calldata = gToken.interface.encodeFunctionData("mint", [
          recepient.address,
          BigNumber.from(99).mul(decimals),
        ]);
        const propose1 = await governor.propose(
          [gToken.address],
          [0],
          [calldata],
          description
        );
        const block = await ethers.provider.getBlock("latest");
        const proposeReceipt = await propose1.wait(1);
        const proposalId = proposeReceipt.events![0].args!.proposalId;

        await mineBlocks(VOTING_DELAY + 1);

        await governor.connect(acc1).castVote(proposalId, 1);
        await governor.connect(acc2).castVote(proposalId, 1);
        await governor.connect(acc3).castVote(proposalId, 1);
        await governor.connect(acc4).castVote(proposalId, 2);

        await mineBlocks(VOTING_PERIOD + 1);

        const descriptionHash = ethers.utils.id(description);

        const quorum = await governor.quorum(block.number);
        const votePower1 = await governor.getVotes(acc1.address, block.number);
        const votePower2 = await governor.getVotes(acc2.address, block.number);
        const votePower3 = await governor.getVotes(acc3.address, block.number);
        const votePower4 = await governor.getVotes(acc4.address, block.number);
        const allVotesFor = votePower1.add(votePower2).add(votePower3);
        const allVotes = allVotesFor.add(votePower4);
        expect(allVotes).to.be.lt(quorum);

        const votes = await governor.proposalVotes(proposalId);
        // vote for
        expect(votes[1]).to.equal(allVotesFor);
        // vote abstention
        expect(votes[2]).to.equal(votePower4);

        await expect(
          governor.queue([gToken.address], [0], [calldata], descriptionHash)
        ).to.revertedWith("Governor: proposal not successful");
      });
      it("Should revert execution because of timelock", async () => {
        const description = "Proposal #1 mint tokens to recepient";
        const calldata = gToken.interface.encodeFunctionData("mint", [
          recepient.address,
          BigNumber.from(99).mul(decimals),
        ]);
        // delegate before the proposal creation
        await gToken.delegate(acc1.address);
        const propose1 = await governor
          .connect(acc1)
          .propose([gToken.address], [0], [calldata], description);
        const proposeReceipt = await propose1.wait(1);
        const proposalId = proposeReceipt.events![0].args!.proposalId;

        await mineBlocks(VOTING_DELAY + 1);

        await governor.connect(acc1).castVote(proposalId, 1);
        await governor.connect(acc2).castVote(proposalId, 1);
        await governor.connect(acc3).castVote(proposalId, 1);

        await mineBlocks(VOTING_PERIOD + 1);

        const descriptionHash = ethers.utils.id(description);
        const propState = await governor.state(proposalId);
        const quorum = await governor.quorum(proposeReceipt.blockNumber);

        const votePower1 = await governor.getVotes(
          acc1.address,
          proposeReceipt.blockNumber
        );
        // vote from acc1 is now enough to reach the quorum
        expect(votePower1).to.be.gt(quorum);

        const votes = await governor.proposalVotes(proposalId);

        const queueProp = await governor.queue(
          [gToken.address],
          [0],
          [calldata],
          descriptionHash
        );
        await queueProp.wait(1);
        await mineBlocks(1);

        expect(await gToken.balanceOf(recepient.address)).to.be.equal(
          BigNumber.from(0).mul(decimals)
        );

        await expect(
          governor.execute([gToken.address], [0], [calldata], descriptionHash)
        ).to.be.revertedWith("TimelockController: operation is not ready");
      });
      it("Should execute the proposal", async () => {
        const description = "Proposal #1 mint tokens to recepient";
        const calldata = gToken.interface.encodeFunctionData("mint", [
          recepient.address,
          BigNumber.from(99).mul(decimals),
        ]);
        // delegate before the proposal creation
        await gToken.delegate(acc1.address);
        const propose1 = await governor
          .connect(acc1)
          .propose([gToken.address], [0], [calldata], description);
        const proposeReceipt = await propose1.wait(1);
        const proposalId = proposeReceipt.events![0].args!.proposalId;

        await mineBlocks(VOTING_DELAY + 1);

        await governor.connect(acc1).castVote(proposalId, 1);
        await governor.connect(acc2).castVote(proposalId, 1);
        await governor.connect(acc3).castVote(proposalId, 1);

        await mineBlocks(VOTING_PERIOD + 1);

        const descriptionHash = ethers.utils.id(description);
        const propState = await governor.state(proposalId);
        const quorum = await governor.quorum(proposeReceipt.blockNumber);

        const votePower1 = await governor.getVotes(
          acc1.address,
          proposeReceipt.blockNumber
        );
        // vote from acc1 is now enough to reach the quorum
        expect(votePower1).to.be.gt(quorum);

        const votes = await governor.proposalVotes(proposalId);

        const queueProp = await governor.queue(
          [gToken.address],
          [0],
          [calldata],
          descriptionHash
        );
        await queueProp.wait(1);
        await mineBlocks(TIMELOCK_DELAY);

        expect(await gToken.balanceOf(recepient.address)).to.be.equal(
          BigNumber.from(0).mul(decimals)
        );

        const executeProp = await governor.execute(
          [gToken.address],
          [0],
          [calldata],
          descriptionHash
        );
        await executeProp.wait(1);
        expect(await gToken.balanceOf(recepient.address)).to.be.equal(
          BigNumber.from(99).mul(decimals)
        );
      });
      it("Should revert because already executed", async () => {
        const description = "Proposal #1 mint tokens to recepient";
        const calldata = gToken.interface.encodeFunctionData("mint", [
          recepient.address,
          BigNumber.from(99).mul(decimals),
        ]);
        // delegate voting power to reach quorum
        await gToken.delegate(acc1.address);
        // as there is a threshold to propose we use acc1
        const propose1 = await governor
          .connect(acc1)
          .propose([gToken.address], [0], [calldata], description);
        const proposeReceipt = await propose1.wait(1);
        const proposalId = proposeReceipt.events![0].args!.proposalId;

        await mineBlocks(VOTING_DELAY + 1);

        await governor.connect(acc1).castVote(proposalId, 1);
        await governor.connect(acc2).castVote(proposalId, 1);
        await governor.connect(acc3).castVote(proposalId, 1);

        await mineBlocks(VOTING_PERIOD + 1);

        const descriptionHash = ethers.utils.id(description);
        await governor.queue(
          [gToken.address],
          [0],
          [calldata],
          descriptionHash
        );
        await mineBlocks(TIMELOCK_DELAY + 1);
        const executeProp = await governor.execute(
          [gToken.address],
          [0],
          [calldata],
          descriptionHash
        );
        await executeProp.wait(1);
        expect(await gToken.balanceOf(recepient.address)).to.be.equal(
          BigNumber.from(99).mul(decimals)
        );
        await expect(
          governor.execute([gToken.address], [0], [calldata], descriptionHash)
        ).to.be.revertedWith("Governor: proposal not successful");
      });
      it("Should execute the register hub proposal", async () => {
        //setup diamond
        let DAI;
        const hubId = 1;
        const PRECISION = ethers.utils.parseEther("1");
        const MAX_WEIGHT = 1000000;
        const reserveWeight = MAX_WEIGHT / 2;
        const refundRatio = 250000;
        const baseY = PRECISION.div(1000);
        ({ DAI } = await getNamedAccounts());
        const encodedVaultDAIArgs = ethers.utils.defaultAbiCoder.encode(
          ["address"],
          [DAI]
        );

        let account0: SignerWithAddress;
        let hub: HubFacet;

        let singleAssetVault: SingleAssetVault;

        ({ hub, singleAssetVault, account0 } = await hubSetupWithoutRegister());
        // register timelock as RegisterController to be able to register a hub
        const ownershipFacet = await getContractAt<OwnershipFacet>(
          "OwnershipFacet",
          hub.address
        );
        await ownershipFacet.setRegisterController(timelock.address);
        const controller = await ownershipFacet.registerController();
        expect(controller).to.equal(timelock.address);
        // create proposal
        const description = "Proposal #1 register a new hub";
        const calldata = hub.interface.encodeFunctionData("register", [
          account0.address,
          DAI,
          singleAssetVault.address,
          BigNumber.from(refundRatio),
          BigNumber.from(baseY),
          BigNumber.from(reserveWeight),
          encodedVaultDAIArgs,
        ]);

        // delegate before the proposal creation
        await gToken.delegate(acc1.address);
        const propose1 = await governor
          .connect(acc1)
          .propose([hub.address], [0], [calldata], description);

        const proposeReceipt = await propose1.wait(1);
        const proposalId = proposeReceipt.events![0].args!.proposalId;

        await mineBlocks(VOTING_DELAY + 1);

        await governor.connect(acc1).castVote(proposalId, 1);
        await governor.connect(acc2).castVote(proposalId, 0);
        await governor.connect(acc3).castVote(proposalId, 0);

        await mineBlocks(VOTING_PERIOD + 1);

        const descriptionHash = ethers.utils.id(description);

        const quorum = await governor.quorum(proposeReceipt.blockNumber);

        const votePower1 = await governor.getVotes(
          acc1.address,
          proposeReceipt.blockNumber
        );
        const votePower2 = await governor.getVotes(
          acc2.address,
          proposeReceipt.blockNumber
        );
        const votePower3 = await governor.getVotes(
          acc3.address,
          proposeReceipt.blockNumber
        );
        expect(votePower2).to.be.gt(0);
        // vote from acc1 is now enough to reach the quorum
        expect(votePower1).to.be.gt(quorum);

        const votes = await governor.proposalVotes(proposalId);
        expect(votes[0]).to.equal(votePower2.add(votePower3));
        const queueProp = await governor.queue(
          [hub.address],
          [0],
          [calldata],
          descriptionHash,
          { gasLimit: 8000000 }
        );
        await queueProp.wait(1);
        await mineBlocks(TIMELOCK_DELAY);

        expect(await gToken.balanceOf(recepient.address)).to.be.equal(
          BigNumber.from(0).mul(decimals)
        );

        const executeProp = governor.execute(
          [hub.address],
          [0],
          [calldata],
          descriptionHash,
          { gasLimit: 8000000 }
        );
        await expect(executeProp)
          .to.emit(hub, "Register")
          .withArgs(
            hubId,
            account0.address,
            DAI,
            singleAssetVault.address,
            refundRatio,
            baseY,
            reserveWeight,
            encodedVaultDAIArgs
          );
        expect(await hub.count()).to.be.equal(hubId);
        const info = await hub.getHubInfo(hubId);
        expect(info.active).to.be.equal(true);
        expect(info.owner).to.be.equal(account0.address);
        expect(info.vault).to.be.equal(singleAssetVault.address);
        expect(info.asset).to.be.equal(DAI);
        expect(info.refundRatio).to.be.equal(refundRatio);
        expect(info.updating).to.be.equal(false);
        expect(info.startTime).to.be.equal(0);
        expect(info.endTime).to.be.equal(0);
        expect(info.endCooldown).to.be.equal(0);
        expect(info.reconfigure).to.be.equal(false);
        expect(info.targetRefundRatio).to.be.equal(0);
      });
      it("Should execute a facet update proposal", async () => {
        //setup diamond
        let account0: SignerWithAddress;
        let account2: SignerWithAddress;
        let account3: SignerWithAddress;
        let hub: HubFacet;

        ({ hub, account0, account2, account3 } =
          await hubSetupWithoutRegister());

        const ownershipFacet = await getContractAt<OwnershipFacet>(
          "OwnershipFacet",
          hub.address
        );
        // register timelock as DiamondController to be able to update the diamond facets
        await ownershipFacet.setDiamondController(timelock.address);
        const controller = await ownershipFacet.diamondController();
        expect(controller).to.equal(timelock.address);
        // deploy a new facet
        const updatedFeesFacet = await deploy<FeesFacetMock>("FeesFacetMock");
        const setTotallyNewAddressSigHash =
          updatedFeesFacet.interface.getSighash(
            updatedFeesFacet.interface.functions[
              "setTotallyNewAddress(address)"
            ]
          );
        const totallyNewAddressSigHash = updatedFeesFacet.interface.getSighash(
          updatedFeesFacet.interface.functions["totallyNewAddress()"]
        );
        const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 };
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
        // create proposal
        const description = "Proposal #1 add a facet";
        const diamondCut = await getContractAt<IDiamondCut>(
          "IDiamondCut",
          hub.address
        );
        const calldata = diamondCut.interface.encodeFunctionData("diamondCut", [
          cut,
          ethers.constants.AddressZero,
          ethers.utils.toUtf8Bytes(""),
        ]);

        // delegate before the proposal creation
        await gToken.delegate(acc1.address);
        const propose1 = await governor
          .connect(acc1)
          .propose([diamondCut.address], [0], [calldata], description);
        const proposeReceipt = await propose1.wait(1);
        const proposalId = proposeReceipt.events![0].args!.proposalId;

        await mineBlocks(VOTING_DELAY + 1);

        await governor.connect(acc1).castVote(proposalId, 1);
        await governor.connect(acc2).castVote(proposalId, 2);
        await governor.connect(acc3).castVote(proposalId, 2);

        await mineBlocks(VOTING_PERIOD + 1);

        const descriptionHash = ethers.utils.id(description);

        const quorum = await governor.quorum(proposeReceipt.blockNumber);

        const votePower1 = await governor.getVotes(
          acc1.address,
          proposeReceipt.blockNumber
        );
        const votePower2 = await governor.getVotes(
          acc2.address,
          proposeReceipt.blockNumber
        );
        const votePower3 = await governor.getVotes(
          acc3.address,
          proposeReceipt.blockNumber
        );
        expect(votePower2).to.be.gt(0);
        // vote from acc1 is now enough to reach the quorum
        expect(votePower1).to.be.gt(quorum);

        const votes = await governor.proposalVotes(proposalId);
        expect(votes[2]).to.equal(votePower2.add(votePower3));
        const queueProp = await governor.queue(
          [diamondCut.address],
          [0],
          [calldata],
          descriptionHash,
          { gasLimit: 8000000 }
        );
        await queueProp.wait(1);
        await mineBlocks(TIMELOCK_DELAY);

        expect(await gToken.balanceOf(recepient.address)).to.be.equal(
          BigNumber.from(0).mul(decimals)
        );

        const executeProp = governor.execute(
          [diamondCut.address],
          [0],
          [calldata],
          descriptionHash,
          { gasLimit: 8000000 }
        );

        await expect(executeProp).to.emit(diamondCut, "DiamondCut");
        const loupe = await getContractAt<DiamondLoupeFacet>(
          "DiamondLoupeFacet",
          diamondCut.address
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
          diamondCut.address
        );

        await updatedFees
          .connect(account0)
          .setTotallyNewAddress(account2.address, {
            gasLimit: 8000000,
          });
        const newAdr = await updatedFees.totallyNewAddress();
        expect(newAdr).to.equal(account2.address);
        //call to other facet also works
        const ownFacet = await getContractAt<OwnershipFacet>(
          "OwnershipFacet",
          diamondCut.address
        );
        await ownFacet.setDeactivateController(account3.address);
        const newOwner = await ownFacet.deactivateController();
        expect(newOwner).to.equal(account3.address);
      });
    });
  });
};
setup().then(() => {
  run();
});
