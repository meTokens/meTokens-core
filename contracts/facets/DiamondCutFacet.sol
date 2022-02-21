// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/******************************************************************************\
* Author: Nick Mudge <nick@perfectabstractions.com> (https://twitter.com/mudgen)
* EIP-2535 Diamonds: https://eips.ethereum.org/EIPS/eip-2535
/******************************************************************************/

import {IDiamondCut} from "../interfaces/IDiamondCut.sol";
import {LibDiamond} from "../libs/LibDiamond.sol";
import {Modifiers} from "../libs/Details.sol";

contract DiamondCutFacet is IDiamondCut, Modifiers {
    /// @notice Add/replace/remove any number of functions and optionally execute
    ///         a function with delegatecall
    /// @param cut Contains the facet addresses and function selectors
    /// @param init The address of the contract or facet to execute calldata
    /// @param data A function call, including function selector and arguments
    ///                  calldata is executed with delegatecall on init
    function diamondCut(
        FacetCut[] calldata cut,
        address init,
        bytes calldata data
    ) external onlyDiamondController {
        LibDiamond.diamondCut(cut, init, data);
    }
}
