// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorProposalThreshold.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

contract MEGovernor is
    Governor,
    GovernorProposalThreshold,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl
{
    constructor(ERC20Votes _token, TimelockController _timelock)
        Governor("ME Governor")
        GovernorVotes(_token)
        // define quorum as a percentage of the total supply at the block a proposal’s voting power is retrieved
        GovernorVotesQuorumFraction(4) // 4%
        GovernorTimelockControl(_timelock)
    {}

    // The following functions are overrides required by Solidity.
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    )
        public
        override(Governor, GovernorProposalThreshold, IGovernor)
        returns (uint256)
    {
        return super.propose(targets, values, calldatas, description);
    }

    function quorum(uint256 blockNumber)
        public
        view
        override(IGovernor, GovernorVotesQuorumFraction)
        returns (uint256)
    {
        return super.quorum(blockNumber);
    }

    function getVotes(address account, uint256 blockNumber)
        public
        view
        override(IGovernor, Governor)
        returns (uint256)
    {
        return super.getVotes(account, blockNumber);
    }

    function state(uint256 proposalId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (ProposalState)
    {
        return super.state(proposalId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function quorumDenominator()
        public
        pure
        virtual
        override
        returns (uint256)
    {
        return 10000;
    }

    /**
     * @dev How long after a proposal is created should voting power be fixed.
     *      A large voting delay gives users time to unstake tokens if necessary.
     */
    function votingDelay() public pure override returns (uint256) {
        return 1; // 1  block
    }

    /**
     * @dev How long does a proposal remain open to votes.
     */
    function votingPeriod() public pure override returns (uint256) {
        return 45992; //  1 week = 45992 blocks
    }

    /**
     * @dev This restricts proposal creation to accounts who have at least 100,000 MeTokens.
     */
    function proposalThreshold() public pure override returns (uint256) {
        return 100_000e18;
    }

    function _execute(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) {
        super._execute(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor()
        internal
        view
        override(Governor, GovernorTimelockControl)
        returns (address)
    {
        return super._executor();
    }
}
