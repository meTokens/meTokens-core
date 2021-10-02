// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../interfaces/IMigrationRegistry.sol";

/// @title migration registry
/// @author Carl Farterson (@carlfarterson)
/// @notice Keeps track of all used migration strategies
abstract contract MigrationRegistry is IMigrationRegistry {
    mapping(address => bool) private _migrations;
    mapping(address => bool) private _approved;

    /// @inheritdoc IMigrationRegistry
    function register(address _migration) external override {
        require(_approved[msg.sender], "!_approved");
        _migrations[_migration] = true;

        emit Register(_migration);
    }

    /// @inheritdoc IMigrationRegistry
    function deactivate(address _migration) external override {
        // TODO: access controll
        require(_migrations[_migration], "!active");
        _migrations[_migration] = false;
        emit Deactivate(_migration);
    }

    /// @inheritdoc IMigrationRegistry
    function approve(address _factory) external override {
        // TODO: access control
        require(!_approved[_factory], "_approved");
        _approved[_factory] = true;
        emit Approve(_factory);
    }

    /// @inheritdoc IMigrationRegistry
    function unapprove(address _factory) external override {
        // TODO: access control
        require(_approved[_factory], "!_approved");
        _approved[_factory] = false;
        emit Unapprove(_factory);
    }

    /// @inheritdoc IMigrationRegistry
    function isApproved(address _factory)
        external
        view
        override
        returns (bool)
    {
        return _approved[_factory];
    }

    /// @inheritdoc IMigrationRegistry
    function isActive(address _migration)
        external
        view
        override
        returns (bool)
    {
        return _migrations[_migration];
    }
}
