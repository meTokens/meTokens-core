// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../interfaces/I_RecollateralizationRegistry.sol";

contract Recollateralization {

    I_RecollateralizationRegistry public recollateralizationRegistry = 
        I_RecollateralizationRegistry(address(0));  // TODO

    constructor() {}

    function finish() public virtual {
        // send ending collateral to new hub
    }

}