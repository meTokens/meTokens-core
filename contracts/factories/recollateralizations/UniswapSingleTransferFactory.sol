// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../../recollateralizations/UniswapSingleTransfer.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

import "../../interfaces/IRecollateralizationRegistry.sol";
import "../../interfaces/IVault.sol";


contract UniswapSingleTransferFactory {

    event Create(address recollateralization);

    uint256 public count;
    address public hub;
    address public implementation;
    IRecollateralizationRegistry public recollateralizationRegistry;

    constructor(address _hub, address _recollateralizationRegistry, address _implementation) {
        hub = _hub;
        recollateralizationRegistry = IRecollateralizationRegistry(_recollateralizationRegistry);
        implementation = _implementation;
    }
    

    function create(
        address _owner,
        address _targetVault,
        bytes memory _encodedRecollateralizationAdditionalArgs // NOTE: potentially needed for other recollateralizations
    ) external returns (address) {
        // TODO: access control
        address recollateralizationAddress = Clones.cloneDeterministic(implementation, bytes32(count++));

        // create our recollateralization
        UniswapSingleTransfer(recollateralizationAddress).initialize(
            _owner,
            IVault(_targetVault).getToken()
        );

        // Add recollateralization to recollateralizationRegistry
        recollateralizationRegistry.register(
            recollateralizationAddress,
            _targetVault,
            IVault(_targetVault).getToken(),
            IVault(recollateralizationAddress).getToken()
        );

        emit Create(recollateralizationAddress);
        return recollateralizationAddress;
    }
}