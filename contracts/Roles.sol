// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract Roles is AccessControl {

    bytes32 public constant DEVELOPER = keccak256("DEVELOPER");
    bytes32 public constant DAO_MULTISIG = keccak256("DAO_MULTISIG");
    bytes32 public constant DEV_MULTISIG = keccak256("DEV_MULTISIG");
    bytes32 public constant FOUNDRY = keccak256("FOUNDRY");
    bytes32 public constant METOKEN_REGISTRY = keccak256("METOKEN_REGISTRY");


    address private constant devMultisig = address(0);
    address private constant daoMultisig = address(0);
    // NOTE: deploy foundry, then meTokenRegistry, then meToken
    address private constant foundry = address(0);
    address private constant meTokenRegistry = address(0);


    constructor () {

        _setupRole(DEVELOPER, msg.sender);
        _setupRole(DEFAULT_ADMIN_ROLE, daoMultisig);
        _setupRole(DAO_MULTISIG, daoMultisig);
        _setupRole(DEV_MULTISIG, devMultisig);
        _setupRole(FOUNDRY, foundry);
        _setupRole(METOKEN_REGISTRY, meTokenRegistry);
    }
}