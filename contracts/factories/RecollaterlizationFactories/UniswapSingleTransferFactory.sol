// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../../recollateralizations/UniswapSingleTransfer.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

import "../../interfaces/I_RecollateralizationRegistry.sol";
import "../../interfaces/I_Vault.sol";


contract UniswapSingleTransferFactory {

    event CreateRecollateralization(address recollateralization);

    uint256 public deployCount;
    address public hub;
    address public implementation;
    I_RecollateralizationRegistry public recollateralizationRegistry;

    constructor(address _hub, address _recollateralizationRegistry, address _implementation) {
        hub = _hub;
        recollateralizationRegistry = I_RecollateralizationRegistry(_recollateralizationRegistry);
        implementation = _implementation;
    }
    

    function createRecollateralization(
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
            I_Vault(_targetVault).getCollateralAsset()
        );

        // Add recollateralization to recollateralizationRegistry
        recollateralizationRegistry.registerRecollateralization(
            recollateralizationAddress,
            _targetVault,
            I_Vault(_targetVault).getCollateralAsset(),
            I_Vault(recollateralizationAddress).getCollateralAsset()
        );

        deployCount++;
        emit CreateRecollateralization(recollateralizationAddress);
        return recollateralizationAddress;
    }
}