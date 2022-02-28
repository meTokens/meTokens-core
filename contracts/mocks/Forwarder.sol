// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

import {MinimalForwarder} from "@openzeppelin/contracts/metatx/MinimalForwarder.sol";

contract Forwarder is MinimalForwarder {
    constructor() MinimalForwarder() {}
}
