contract VaultRegistry{

	mapping (uint256 => VaultOption) vaultOptions;

    struct VaultOption{
    	string vaultName;
        address vaultOption; //references VaultBalancer.sol as an example of a vault option
        address vaultFactory; // reference vaultBalancerFactory.sol as an example of a vault factory
        bool active;
    }

    function registerVault() returns (uint256) {}
    function deactivateVault() returns (uint256) {}
    function reactivateVault() returns (uint256) {}
}