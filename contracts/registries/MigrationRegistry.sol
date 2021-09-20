// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../interfaces/IMigrationRegistry.sol";

/// @title migration registry
/// @author Carl Farterson (@carlfarterson)
/// @notice Keeps track of all used migration strategies 
abstract contract MigrationRegistry is IMigrationRegistry {

	mapping (address => bool) private migrations;
    mapping (address => bool) private approved;

    /// @inheritdoc IMigrationRegistry
    function register(
        address _migration
    ) external override{
        require(approved[msg.sender], "!approved");
        migrations[_migration] = true;

        emit Register(_migration);
    }

    /// @inheritdoc IMigrationRegistry
    function deactivate(address _migration) external override {
        // TODO: access controll
        require(migrations[_migration], "!active");
        migrations[_migration] = false;
        emit Deactivate(_migration);
    }

    /// @inheritdoc IMigrationRegistry
    function approve(address _factory) external override {
        // TODO: access control
        require(!approved[_factory], "approved");
        approved[_factory] = true;
        emit Approve(_factory);
    }

    /// @inheritdoc IMigrationRegistry
    function unapprove(address _factory) external override {
        // TODO: access control
        require(approved[_factory], "!approved");
        approved[_factory] = false;
        emit Unapprove(_factory);
    }

    /// @inheritdoc IMigrationRegistry
    function isApproved(address _factory) external view override returns (bool) {
        return approved[_factory];
    }

    /// @inheritdoc IMigrationRegistry
    function isActive(address _migration) external view override returns (bool) {
        return migrations[_migration];
    }
}