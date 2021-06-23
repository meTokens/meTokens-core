// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Create2.sol";

import "../../recollateralizations/UniswapSingleTransfer.sol";
import "../../interfaces/I_RecollateralizationRegistry.sol";
import "../../interfaces/I_Vault.sol";


contract UniswapSingleTransferFactory {

    event CreateRecollateralization(address recollateralization);

    address public hub;
    uint256 private deployCount;
    I_RecollateralizationRegistry public recollateralizationRegistry;

    constructor(address _hub, address _recollateralizationRegistry) {
        hub = _hub;
        recollateralizationRegistry = I_RecollateralizationRegistry(_recollateralizationRegistry);
    }
    

    function createRecollateralization(
        string calldata _name,
        address _owner,
        address _targetVault,
        bytes memory _encodedRecollateralizationAdditionalArgs // NOTE: potentially needed for other recollateralizations
    ) external returns (address) {
        // TODO: access control
        uint256 recollateralizationId = recollateralizationRegistry.recollateralizationCount();
        // TODO: validate salt of recollateralizationId is correct type
        address recollateralizationAddress = Create2.deploy(deployCount, type(UniswapSingleTransfer).creationCode);

        // create our recollateralization
        UniswapSingleTransfer(recollateralizationAddress).initialize(
            _owner,
            I_Vault(_targetVault).getCollateralAsset()
        );

        // Add recollateralization to recollateralizationRegistry
        recollateralizationRegistry.registerRecollateralization(_name, recollateralizationAddress, address(this));

        deployCount++;
        emit CreateRecollateralization(recollateralizationAddress);
        return recollateralizationAddress;
    }
}