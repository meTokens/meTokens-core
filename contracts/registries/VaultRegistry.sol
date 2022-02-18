// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {Registry} from "./Registry.sol";

contract VaultRegistry is Registry {
    constructor() Registry() {}
}
