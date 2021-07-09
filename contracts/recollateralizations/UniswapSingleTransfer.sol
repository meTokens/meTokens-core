// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "./Recollateralization.sol";

/*
Goal: create a vault that instantly swaps token A for token B
when recollateralizing to a vault with a different base token

Trigger: Hub status changing from status.QUEUED to status.UPDATING



*/

/// @title Vault migrator from erc20 to erc20 (non-lp)
/// @author Carl Farterson (@carlfarterson)
/// @notice This contract moves the pooled/locked balances from
///     one erc20 to another
contract UniswapSingleTransfer is Recollateralization, Initializable {

    constructor () {}

    function initialize(
        address _owner,
        address _targetVault
    ) external {
        require(recollateralizationRegistry.isApprovedRecollateralizationFactory(msg.sender), "!approved");
    }

    

}