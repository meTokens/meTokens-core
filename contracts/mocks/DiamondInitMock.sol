// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {AppStorage} from "../libs/LibAppStorage.sol";

/// @title Diamond Init
/// @author Carter Carlson (@cartercarlson), @zgorizzo69
/// @notice Contract to initialize state variables, similar to OZ's initialize()
contract DiamondInitMock {
    address private immutable _owner;

    constructor() {
        _owner = msg.sender;
    }

    AppStorage internal s; // solhint-disable-line

    function init(uint256 mintFee) external {
        require(msg.sender == _owner, "!owner");
        s.mintFee = mintFee;
    }
}
