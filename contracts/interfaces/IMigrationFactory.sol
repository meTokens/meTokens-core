// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IMigrationFactory {
    function create(
        uint256 _hubId,
        address _owner,
        address _initialVault,
        address _targetVault,
        bytes memory _encodedMigrationArgs
    ) external returns (address);
}
