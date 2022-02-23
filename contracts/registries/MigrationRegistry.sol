// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title migration registry
/// @author Carter Carlson (@cartercarlson)
/// @notice Keeps track of all used migration strategies
contract MigrationRegistry is Ownable {
    // Initial vault, target vault, migration vault, approved status
    mapping(address => mapping(address => mapping(address => bool)))
        private _migrations;

    function approve(
        address initialVault,
        address targetVault,
        address migration
    ) external onlyOwner {
        require(
            !_migrations[initialVault][targetVault][migration],
            "migration already approved"
        );
        _migrations[initialVault][targetVault][migration] = true;
    }

    function unapprove(
        address initialVault,
        address targetVault,
        address migration
    ) external onlyOwner {
        require(
            _migrations[initialVault][targetVault][migration],
            "migration not approved"
        );
        _migrations[initialVault][targetVault][migration] = false;
    }

    function isApproved(
        address initialVault,
        address targetVault,
        address migration
    ) external view returns (bool) {
        return _migrations[initialVault][targetVault][migration];
    }
}
