pragma solidity ^0.8.0;

interface I_VaultRegistry {
    // TODO: argument check
    function registerVault(address factory, string calldata name) public;
    function deactivateVault(uint256 vaultId) public;
    function reactivateVault(uint256 vaultId) public;
}