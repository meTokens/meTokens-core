pragma solidity ^0.8.0;

contract VaultRegistry {

    event RegisterVault(address factory, string name, uint256 vaultId);
    event DeactivateVault(uint256 vaultId);
    event ReactivateVault(uint256 vaultId);

	mapping (uint256 => VaultDetails) vaults;
    uint256 private _vaultCount;

    struct VaultDetails {
        address factory; // reference vaultBalancerFactory.sol as an example of a vault factory
    	string name;
        bool active;
    }

    // TODO: argument check
    // TODO: access control
    function registerVault(address factory, string calldata name) {
        VaultDetails memory v = VaultDetails(factory, name, true);
        vaults[_vaultCount] = v;
        emit RegisterVault(factory, name, _vaultCount);
        _vaultCount++;
    }
    
    function deactivateVault(uint256 vaultId) {
        emit DeactivateVault(vaultId);
    }
    function reactivateVault(uint256 vaultId) {
        emit ReactivateVault(vaultId);
    }

    function vaultCount() public view returns (uint256) {
        return _vaultCount;
    }
}