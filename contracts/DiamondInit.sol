// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IRegistry} from "./interfaces/IRegistry.sol";
import {IMigrationRegistry} from "./interfaces/IMigrationRegistry.sol";

/******************************************************************************\
* Author: Nick Mudge <nick@perfectabstractions.com> (https://twitter.com/mudgen)
* EIP-2535 Diamonds: https://eips.ethereum.org/EIPS/eip-2535
*
* Implementation of a diamond.
/******************************************************************************/

import {LibDiamond} from "./libs/LibDiamond.sol";
import {IDiamondCut} from "./interfaces/IDiamondCut.sol";
import "./libs/Details.sol";

contract DiamondInit {
    AppStorage internal s;

    struct Args {
        address foundry;
        IRegistry vaultRegistry;
        IRegistry curveRegistry;
        IMigrationRegistry migrationRegistry;
    }

    // TODO: access control
    function init(Args memory _args) external {
        s.foundry = _args.foundry;
        s.vaultRegistry = _args.vaultRegistry;
        s.curveRegistry = _args.curveRegistry;
        s.migrationRegistry = _args.migrationRegistry;
    }
}
