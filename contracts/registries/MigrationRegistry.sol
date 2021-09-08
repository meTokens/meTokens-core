// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../interfaces/IMigrationRegistry.sol";

/// @title migration registry
/// @author Carl Farterson (@carlfarterson)
/// @notice Keeps track of all used migration strategies 
abstract contract MigrationRegistry is IMigrationRegistry {

    uint256 private count;
	mapping (address => Details) migrations;
    mapping (address => bool) private approved;

    struct Details {
        address migration;
        address targetVault;
        address collateralTokenStart;
        address collateralTokenIntra;
        bool active;
    }

    function register(
        address _migration,
        address _targetVault,
        address _collateralTokenStart,
        address _collateralTokenIntra
    ) external override {
        require(approved[msg.sender], "!approved");
        // Add migration details to storage
        Details memory r = Details(
            _migration,
            _targetVault,
            _collateralTokenStart,
            _collateralTokenIntra,
            true
        );
        migrations[_migration] = r;

        emit Register(_migration);
    }

    function approve(address _factory) external override {
        // TODO: access control
        require(!approved[_factory], "Already approved");
        approved[_factory] = true;
        emit Approve(_factory);
    }

    function unapprove(address _factory) external override {
        // TODO: access control
        require(approved[_factory], "!approved");
        approved[_factory] = false;
        emit Unapprove(_factory);
    }

    function isApproved(address _factory) external view override returns (bool) {
        return approved[_factory];
    }


    function deactivate() external returns(uint256) {}

    // TODO: function isActive() ?

    // function getDetails(address recollater) external view override returns (
    //     address migration,
    //     address targetVault,
    //     address collateralTokenStart,
    //     address collateralTokenIntra,
    //     address collateralTokenEnd,
    //     bool active
    // )
}