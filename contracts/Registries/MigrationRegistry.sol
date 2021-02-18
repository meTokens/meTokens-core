contract MigrationRegistry{

	mapping (uint256 => Migration) migrations;

    struct Migration{
        address fromHub;
        address toHub;
        address migrationVault;
        uint256 blockStart;
        uint256 blockTarget;
        bool targetReached;
    }

    function registerMigration() external returns(uint256) {}
    function deactivateMigration() external returns(uint256) {}
    function reactivateMigration() external returns(uint256) {}
}