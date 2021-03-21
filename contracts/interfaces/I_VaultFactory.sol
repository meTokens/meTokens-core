pragma solidity ^0.8.0;

interface I_VaultFactory {
    function createVault(string calldata name,
        address _owner,
        uint256 _hubId,
        address _valueSetAddress,
        bytes4 _encodedVaultAdditionalArgs) public returns (address);
}