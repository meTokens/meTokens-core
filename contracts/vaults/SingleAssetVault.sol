// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

import "../interfaces/IERC20.sol";
import "./Vault.sol";

/// @title Vault
/// @author Carl Farterson (@carlfarterson)
/// @notice Implementation contract for SingleAssetFactory.sol
contract SingleAssetVault is Ownable, Vault {
    uint256 public foo;

    constructor(
        address _dao,
        address _foundry,
        uint256 _foo
    ) Vault(_dao, _foundry) {
        foo = _foo;
    }

    function setFoo(uint256 _foo) external {
        foo = _foo;
    }
}
