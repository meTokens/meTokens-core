// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../interfaces/IRecollateralizationRegistry.sol";

contract Recollateralization {

    IRecollateralizationRegistry public recollateralizationRegistry = 
        IRecollateralizationRegistry(address(0));  // TODO

    constructor() {}

    function finish() public virtual {
        // send ending collateral to new hub
    }

}