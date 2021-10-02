// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract Roles is AccessControl {
    bytes32 public constant DEVELOPER = keccak256("DEVELOPER");
    bytes32 public constant DAO_MULTISIG = keccak256("DAO_MULTISIG");
    bytes32 public constant DEV_MULTISIG = keccak256("DEV_MULTISIG");
    bytes32 public constant FOUNDRY = keccak256("FOUNDRY");
    bytes32 public constant METOKEN_REGISTRY = keccak256("METOKEN_REGISTRY");

    // address public constant devMultisig = address(0); // TODO
    // address public constant daoMultisig = address(0); // TODO
    address public foundry;
    address public meTokenRegistry;

    constructor() {
        _setupRole(DEVELOPER, msg.sender);
        // _setupRole(DEFAULT_ADMIN_ROLE, daoMultisig);
        // _setupRole(DAO_MULTISIG, daoMultisig);
        // _setupRole(DEV_MULTISIG, devMultisig);
        _setupRole(FOUNDRY, foundry);
        _setupRole(METOKEN_REGISTRY, meTokenRegistry);
    }
}
