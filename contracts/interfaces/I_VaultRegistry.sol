pragma solidity ^0.8.0;

interface I_VaultRegistry {
    function registerVault(string calldata name, address vault, address factory) external;
    function registerVaultFactory(address factory) external;
    function deactivateVault(address vault) external;
    function deactiveVaultFactory(address factory) external;
    function isActiveVault(address vault) external view returns (bool);
    function isApprovedVaultFactory(address factory) external view returns (bool);
}