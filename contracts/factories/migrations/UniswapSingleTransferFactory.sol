// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../../migrations/UniswapSingleTransfer.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

import "../../interfaces/IMigrationRegistry.sol";
import "../../interfaces/IVault.sol";


contract UniswapSingleTransferFactory {

    event Create(address migration);

    uint256 public count;
    address public hub;
    address public implementation;
    IMigrationRegistry public migrationRegistry;

    constructor(address _hub, address _migrationRegistry, address _implementation) {
        hub = _hub;
        migrationRegistry = IMigrationRegistry(_migrationRegistry);
        implementation = _implementation;
    }
    

    function create(
        uint _hubId,
        address _owner,
        address _initialVault,
        address _targetVault,
        bytes memory _encodedmigrationAdditionalArgs // NOTE: potentially needed for other migrations
    ) external returns (address) {
        // TODO: access control
        address migrationVault = Clones.cloneDeterministic(implementation, bytes32(count++));

        // create our migration
        UniswapSingleTransfer(migrationVault).initialize(
            _hubId,
            _owner,
            _initialVault,
            _targetVault,
        );

        // Add migration to migrationRegistry
        migrationRegistry.register(migrationVault);

        return migrationVault;
    }
}