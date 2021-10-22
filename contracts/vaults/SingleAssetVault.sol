// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

import "../interfaces/IERC20.sol";
import "./Vault.sol";

/// @title Vault
/// @author Carl Farterson (@carlfarterson)
/// @notice Implementation contract for SingleAssetFactory.sol
contract SingleAssetVault is Ownable, Vault {
    uint256 foo;

    constructor(address _dao, address _foundry) Vault(_dao, _foundry) {}

    function setFoo(uint256 _foo) external {
        foo = _foo;
    }
}
