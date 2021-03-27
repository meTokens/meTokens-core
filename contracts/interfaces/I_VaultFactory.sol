pragma solidity ^0.8.0;

interface I_VaultFactory {
    function createVault(
        string calldata name,
        address owner,
        uint256 hubId,
        address valueSetAddress,
        bytes4 encodedVaultAdditionalArgs) external returns (address);
}