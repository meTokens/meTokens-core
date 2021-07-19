// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../../recollateralizations/UniswapSingleTransfer.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

import "../../interfaces/IRecollateralizationRegistry.sol";
import "../../interfaces/IVault.sol";


contract UniswapSingleTransferFactory {

    event Create(address recollateralization);

    uint256 public deployCount;
    address public hub;
    address public implementation;
    IRecollateralizationRegistry public recollateralizationRegistry;

    constructor(address _hub, address _recollateralizationRegistry, address _implementation) {
        hub = _hub;
        recollateralizationRegistry = IRecollateralizationRegistry(_recollateralizationRegistry);
        implementation = _implementation;
    }
    

    function create(
        string calldata _name,
        address _owner,
        address _targetVault,
        bytes memory _encodedRecollateralizationAdditionalArgs // NOTE: potentially needed for other recollateralizations
    ) external returns (address) {
        // TODO: access control
        address recollateralizationAddress = Clones.cloneDeterministic(implementation, bytes32(deployCount));

        // create our recollateralization
        UniswapSingleTransfer(recollateralizationAddress).initialize(
            _owner,
            IVault(_targetVault).getCollateralAsset()
        );

        // Add recollateralization to recollateralizationRegistry
        recollateralizationRegistry.registerRecollateralization(
            recollateralizationAddress,
            _targetVault,
            IVault(_targetVault).getCollateralAsset(),
            IVault(recollateralizationAddress).getCollateralAsset()
        );

        deployCount++;
        emit Create(recollateralizationAddress);
        return recollateralizationAddress;
    }
}