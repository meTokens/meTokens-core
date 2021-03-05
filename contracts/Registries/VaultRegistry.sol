contract VaultRegistry{

	mapping (uint256 => VaultDetails) vaults;

    struct VaultDetails{
    	string name;
        address factory; // reference vaultBalancerFactory.sol as an example of a vault factory
        bool active;
    }

    function registerVault() returns (uint256) {}
    function deactivateVault() returns (uint256) {}
    function reactivateVault() returns (uint256) {}
}