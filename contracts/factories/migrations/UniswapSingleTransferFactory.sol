// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../../migrations/UniswapSingleTransfer.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

import "../../interfaces/IMigrationRegistry.sol";
import "../../interfaces/IVault.sol";

contract UniswapSingleTransferFactory {
    uint256 private _count;
    address public hub;
    address public implementation;
    IMigrationRegistry public migrationRegistry;

    event Create(address migration);

    constructor(
        address _hub,
        address _migrationRegistry,
        address _implementation
    ) {
        hub = _hub;
        migrationRegistry = IMigrationRegistry(_migrationRegistry);
        implementation = _implementation;
    }

    function create(
        uint256 _hubId,
        address _owner,
        address _initialVault,
        address _targetVault,
        bytes memory _encodedArgs
    ) external returns (address) {
        // TODO: access control

        address migration = Clones.cloneDeterministic(
            implementation,
            bytes32(_count++)
        );

        // create our migration
        UniswapSingleTransfer(migration).initialize(
            _hubId,
            _owner,
            _initialVault,
            _targetVault,
            _encodedArgs
        );

        // Add migration to migrationRegistry
        migrationRegistry.register(migration);

        return migration;
    }
}
