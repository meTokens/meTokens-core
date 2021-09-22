// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../interfaces/IMigrationRegistry.sol";
import "../interfaces/IHub.sol";
import "../interfaces/IMeTokenRegistry.sol";

contract Migration {
    uint256 public immutable PRECISION = 10**18;

    // TODO
    IMigrationRegistry public migrationRegistry =
        IMigrationRegistry(address(0));
    IHub public hub = IHub(address(0));
    IMeTokenRegistry public meTokenRegistry = IMeTokenRegistry(address(0));

    constructor() {}

    function finish() public virtual {
        // send ending collateral to new hub
    }
}
