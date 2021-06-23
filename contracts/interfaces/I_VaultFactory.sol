// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface I_VaultFactory {
    function createVault(
        string calldata name,
        address owner,
        address valueSetAddress,
        bytes memory encodedVaultAdditionalArgs) external returns (address);
}