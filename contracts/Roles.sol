// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract Roles is AccessControl {

    bytes32 public constant DEVELOPER = keccak256("DEVELOPER");
    bytes32 public constant DAO_MULTISIG = keccak256("DAO_MULTISIG");
    bytes32 public constant DEV_MULTISIG = keccak256("DEV_MULTISIG");
    address private constant devmultisig = address(0);
    address private constant daomultisig = address(0);

    constructor () {

        _setupRole(DEFAULT_ADMIN_ROLE, daomultisig);
        _setupRole(DAO_MULTISIG, daomultisig);
        _setupRole(DEV_MULTISIG, devmultisig);
        _setupRole(DEVELOPER, msg.sender);
    }
}