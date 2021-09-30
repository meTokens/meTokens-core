// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

contract MeTokenRegistryMock {
    mapping(address => bool) public owners;

    function setOwner(address _owner) public {
        owners[_owner] = true;
    }

    function isOwner(address _owner) external view returns (bool) {
        return owners[_owner];
    }
}
