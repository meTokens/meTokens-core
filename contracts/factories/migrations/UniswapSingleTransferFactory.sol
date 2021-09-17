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
        address _owner,
        address _migrationVault,
        address _targetVault,
        bytes memory _encodedmigrationAdditionalArgs // NOTE: potentially needed for other migrations
    ) external returns (address) {
        // TODO: access control
        address migrationAddress = Clones.cloneDeterministic(implementation, bytes32(count++));

        // create our migration
        UniswapSingleTransfer(migrationAddress).initialize(
            _owner,
            IVault(_migrationVault).getToken(),
            IVault(_targetVault).getToken()
        );

        // Add migration to migrationRegistry
        migrationRegistry.register(
            migrationAddress,
            _targetVault,
            IVault(_targetVault).getToken(),
            IVault(migrationAddress).getToken()
        );

        emit Create(migrationAddress);
        return migrationAddress;
    }
}