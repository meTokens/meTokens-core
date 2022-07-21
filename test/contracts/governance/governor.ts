import "@nomiclabs/hardhat-ethers";
import { ethers } from "hardhat";
import { BigNumber, utils, Contract } from "ethers";
import { expect } from "chai";
import {
  GovernanceTimeLock,
  MEGovernor,
  METoken,
} from "../../../artifacts/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { mineBlocks } from "../../utils/hardhatNode";

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

    let Governor: MEGovernor;
    let gToken: METoken;
    let Timelock: GovernanceTimeLock;

    beforeEach(async () => {
      [owner, acc1, acc2, acc3, acc4, proposer, recepient] =
        await ethers.getSigners();

      const tokenFactory = await ethers.getContractFactory("METoken");
      const timeLockFactory = await ethers.getContractFactory(
        "GovernanceTimeLock"
      );
      const govFactory = await ethers.getContractFactory("MEGovernor");

      gToken = (await tokenFactory.deploy()) as METoken;

      Timelock = (await timeLockFactory.deploy(
        TIMELOCK_DELAY,
        [],
        [owner.address]
      )) as GovernanceTimeLock;

      Governor = (await govFactory.deploy(
        gToken.address,
        Timelock.address
      )) as MEGovernor;

      //setup timelock
      await Timelock.grantRole(PROPOSER_ROLE, Governor.address);
      await Timelock.grantRole(PROPOSER_ROLE, proposer.address);
      await Timelock.grantRole(EXECUTOR_ROLE, Governor.address);
      await Timelock.grantRole(CANCELLER_ROLE, Governor.address);
      await Timelock.grantRole(CANCELLER_ROLE, owner.address);

      //setup token
      await gToken.mint(owner.address, BigNumber.from(100000).mul(decimals));
      const vp = await gToken.getVotes(owner.address);
      expect(vp).to.equal(0);
      await gToken.delegate(owner.address);
      const vpd = await gToken.getVotes(owner.address);
      expect(vpd).to.equal(BigNumber.from(100000).mul(decimals));
      const proposalThreshold = await Governor.proposalThreshold();
      expect(proposalThreshold).to.equal(vpd);
      await gToken.mint(acc1.address, BigNumber.from(10).mul(decimals));
      await gToken.mint(acc2.address, BigNumber.from(7).mul(decimals));
      await gToken.mint(acc3.address, BigNumber.from(6).mul(decimals));
      await gToken.mint(acc4.address, BigNumber.from(5).mul(decimals));
      await gToken.transferOwnership(Timelock.address);
      // need to self delegate as minting doesn't accrue voting power
      await gToken.connect(acc1).delegate(acc1.address);
      await gToken.connect(acc2).delegate(acc2.address);
      await gToken.connect(acc3).delegate(acc3.address);
      await gToken.connect(acc4).delegate(acc4.address);
    });

    describe("Test TimeLock", async () => {
      it("initial state", async () => {
        expect(await Timelock.TIMELOCK_ADMIN_ROLE()).to.be.equal(
          TIMELOCK_ADMIN_ROLE
        );
        expect(await Timelock.PROPOSER_ROLE()).to.be.equal(PROPOSER_ROLE);
        expect(await Timelock.EXECUTOR_ROLE()).to.be.equal(EXECUTOR_ROLE);
        expect(await Timelock.CANCELLER_ROLE()).to.be.equal(CANCELLER_ROLE);
      });

      it("Test Roles", async () => {
        expect(
          await Timelock.hasRole(TIMELOCK_ADMIN_ROLE, owner.address)
        ).to.be.equal(true);
        expect(
          await Timelock.hasRole(PROPOSER_ROLE, Governor.address)
        ).to.be.equal(true);
        expect(
          await Timelock.hasRole(EXECUTOR_ROLE, Governor.address)
        ).to.be.equal(true);
        expect(
          await Timelock.hasRole(CANCELLER_ROLE, Governor.address)
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
        const proposalThresholdBefore = await Governor.proposalThreshold();
        const balBefore = await gToken.balanceOf(acc1.address);

        expect(balBefore).to.be.lt(proposalThresholdBefore);
        await expect(
          Governor.connect(acc1).propose(
            [gToken.address],
            [0],
            [calldata],
            description
          )
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
          Governor.connect(acc1).propose(
            [gToken.address],
            [0],
            [calldata],
            description
          )
        ).to.emit(Governor, "ProposalCreated");
      });

      it("Should revert because voting delay", async () => {
        const description = "Proposal #1 mint tokens to recepient";
        const calldata = gToken.interface.encodeFunctionData("mint", [
          recepient.address,
          BigNumber.from(99).mul(decimals),
        ]);
        const propose1 = await Governor.propose(
          [gToken.address],
          [0],
          [calldata],
          description
        );
        const proposeReceipt = await propose1.wait(1);
        const proposalId = proposeReceipt.events![0].args!.proposalId;

        await expect(
          Governor.connect(acc1).castVote(proposalId, 1)
        ).to.be.revertedWith("Governor: vote not currently active");
      });

      it("Should revert because voting period", async () => {
        const description = "Proposal #1 mint tokens to recepient";
        const calldata = gToken.interface.encodeFunctionData("mint", [
          recepient.address,
          BigNumber.from(99).mul(decimals),
        ]);
        const propose1 = await Governor.propose(
          [gToken.address],
          [0],
          [calldata],
          description
        );
        const proposeReceipt = await propose1.wait(1);
        const proposalId = proposeReceipt.events![0].args!.proposalId;

        await mineBlocks(VOTING_DELAY + 1);

        await Governor.connect(acc1).castVote(proposalId, 1);
        await Governor.connect(acc2).castVote(proposalId, 1);
        await Governor.connect(acc3).castVote(proposalId, 1);

        const descriptionHash = ethers.utils.id(description);
        await expect(
          Governor.queue([gToken.address], [0], [calldata], descriptionHash)
        ).to.revertedWith("Governor: proposal not successful");
      });

      it("Should revert because of the quorum", async () => {
        const description = "Proposal #1 mint tokens to recepient";
        const calldata = gToken.interface.encodeFunctionData("mint", [
          recepient.address,
          BigNumber.from(99).mul(decimals),
        ]);
        const propose1 = await Governor.propose(
          [gToken.address],
          [0],
          [calldata],
          description
        );
        const block = await ethers.provider.getBlock("latest");
        const proposeReceipt = await propose1.wait(1);
        const proposalId = proposeReceipt.events![0].args!.proposalId;

        await mineBlocks(VOTING_DELAY + 1);

        await Governor.connect(acc1).castVote(proposalId, 1);
        await Governor.connect(acc2).castVote(proposalId, 1);
        await Governor.connect(acc3).castVote(proposalId, 1);
        await Governor.connect(acc4).castVote(proposalId, 2);

        await mineBlocks(VOTING_PERIOD + 1);

        const descriptionHash = ethers.utils.id(description);

        const quorum = await Governor.quorum(block.number);
        const votePower1 = await Governor.getVotes(acc1.address, block.number);
        const votePower2 = await Governor.getVotes(acc2.address, block.number);
        const votePower3 = await Governor.getVotes(acc3.address, block.number);
        const votePower4 = await Governor.getVotes(acc4.address, block.number);
        const allVotesFor = votePower1.add(votePower2).add(votePower3);
        const allVotes = allVotesFor.add(votePower4);
        expect(allVotes).to.be.lt(quorum);

        const votes = await Governor.proposalVotes(proposalId);
        // vote for
        expect(votes[1]).to.equal(allVotesFor);
        // vote abstention
        expect(votes[2]).to.equal(votePower4);

        await expect(
          Governor.queue([gToken.address], [0], [calldata], descriptionHash)
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
        const propose1 = await Governor.connect(acc1).propose(
          [gToken.address],
          [0],
          [calldata],
          description
        );
        const proposeReceipt = await propose1.wait(1);
        const proposalId = proposeReceipt.events![0].args!.proposalId;

        await mineBlocks(VOTING_DELAY + 1);

        await Governor.connect(acc1).castVote(proposalId, 1);
        await Governor.connect(acc2).castVote(proposalId, 1);
        await Governor.connect(acc3).castVote(proposalId, 1);

        await mineBlocks(VOTING_PERIOD + 1);

        const descriptionHash = ethers.utils.id(description);
        const propState = await Governor.state(proposalId);
        const quorum = await Governor.quorum(proposeReceipt.blockNumber);

        const votePower1 = await Governor.getVotes(
          acc1.address,
          proposeReceipt.blockNumber
        );
        // vote from acc1 is now enough to reach the quorum
        expect(votePower1).to.be.gt(quorum);

        const votes = await Governor.proposalVotes(proposalId);

        const queueProp = await Governor.queue(
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
          Governor.execute([gToken.address], [0], [calldata], descriptionHash)
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
        const propose1 = await Governor.connect(acc1).propose(
          [gToken.address],
          [0],
          [calldata],
          description
        );
        const proposeReceipt = await propose1.wait(1);
        const proposalId = proposeReceipt.events![0].args!.proposalId;

        await mineBlocks(VOTING_DELAY + 1);

        await Governor.connect(acc1).castVote(proposalId, 1);
        await Governor.connect(acc2).castVote(proposalId, 1);
        await Governor.connect(acc3).castVote(proposalId, 1);

        await mineBlocks(VOTING_PERIOD + 1);

        const descriptionHash = ethers.utils.id(description);
        const propState = await Governor.state(proposalId);
        const quorum = await Governor.quorum(proposeReceipt.blockNumber);

        const votePower1 = await Governor.getVotes(
          acc1.address,
          proposeReceipt.blockNumber
        );
        // vote from acc1 is now enough to reach the quorum
        expect(votePower1).to.be.gt(quorum);

        const votes = await Governor.proposalVotes(proposalId);

        const queueProp = await Governor.queue(
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

        const executeProp = await Governor.execute(
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
        const propose1 = await Governor.connect(acc1).propose(
          [gToken.address],
          [0],
          [calldata],
          description
        );
        const proposeReceipt = await propose1.wait(1);
        const proposalId = proposeReceipt.events![0].args!.proposalId;

        await mineBlocks(VOTING_DELAY + 1);

        await Governor.connect(acc1).castVote(proposalId, 1);
        await Governor.connect(acc2).castVote(proposalId, 1);
        await Governor.connect(acc3).castVote(proposalId, 1);

        await mineBlocks(VOTING_PERIOD + 1);

        const descriptionHash = ethers.utils.id(description);
        await Governor.queue(
          [gToken.address],
          [0],
          [calldata],
          descriptionHash
        );
        await mineBlocks(TIMELOCK_DELAY + 1);
        const executeProp = await Governor.execute(
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
          Governor.execute([gToken.address], [0], [calldata], descriptionHash)
        ).to.be.revertedWith("Governor: proposal not successful");
      });
    });
  });
};
setup().then(() => {
  run();
});
