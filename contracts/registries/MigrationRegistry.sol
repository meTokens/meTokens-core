pragma solidity ^0.8.0;


/// @title Migration registry
/// @author Carl Farterson (@carlfarterson)
/// @notice Keeps track of all used migration strategies 
contract MigrationRegistry {

	mapping (uint256 => MigrationDetails) migrations;

    struct MigrationDetails {
        uint256 fromHub;
        uint256 toHub;
        address migrationVault;
        uint256 blockStart;
        uint256 blockTarget;
        bool targetReached;
    }

    function registerMigration() external returns(uint256) {}
    function deactivateMigration() external returns(uint256) {}
    function reactivateMigration() external returns(uint256) {}
}