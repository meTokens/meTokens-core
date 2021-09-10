// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../interfaces/IMigrationRegistry.sol";

contract Migration {

    IMigrationRegistry public migrationRegistry = 
        IMigrationRegistry(address(0));  // TODO

    constructor() {}

    function finish() public virtual {
        // send ending collateral to new hub
    }

}