// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

import "../interfaces/IERC20.sol";
import "./Vault.sol";

/// @title Vault
/// @author Carl Farterson (@carlfarterson)
/// @notice Implementation contract for SingleAssetFactory.sol
contract SingleAssetVault is Ownable, Vault {
    constructor(
        address _dao,
        address _foundry,
        IHub _hub,
        IMeTokenRegistry _meTokenRegistry,
        IMigrationRegistry _migrationRegistry
    ) Vault(_dao, _foundry, _hub, _meTokenRegistry, _migrationRegistry) {}

    function isValid(address _asset, bytes memory _encodedArgs)
        public
        view
        override
        returns (bool)
    {
        _asset = abi.decode(_encodedArgs, (address));
        require(_encodedArgs.length > 0, "_encodedArgs empty");
        require(_asset != address(0), "0 address");
        return true;
    }
}
