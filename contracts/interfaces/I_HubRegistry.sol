pragma solidity ^0.8.0;

interface I_HubRegistry {
    function registerHub(
        string calldata hubName,
        address hubOwner,
        string calldata vaultName,
        address vaultOwner,
        address vaultFactory,
        address valueSet,
        bytes4 encodedValueSetArgs,
        bytes4 encodedVaultAdditionalArgs
    ) external;
}