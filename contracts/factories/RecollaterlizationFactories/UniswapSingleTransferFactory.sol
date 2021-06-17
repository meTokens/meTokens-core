pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Create2.sol";

import "../../recollateralizations/UniswapSingleTransfer.sol";
import "../../interfaces/I_recollateralizationRegistry.sol";


contract UniswapSingleTransferFactory {

    event CreateRecollateralization(address recollateralization);

    address public hub;
    I_RecollateralizationRegistry public recollateralizationRegistry;

    constructor(address _hub, address _recollateralizationRegistry) public {
        hub = _hub;
        recollateralizationRegistry = I_RecollateralizationRegistry(_recollateralizationRegistry);
    }
    

    function createRecollateralization(
        string calldata _name,
        uint256 _targetVault,
        bytes4 _encodedRecollateralizationAdditionalArgs // NOTE: potentially needed for other recollateralizations
    ) external returns (address) {
        // TODO: access control
        uint256 recollateralizationId = recollateralizationRegistry.recollateralizationCount();
        // TODO: validate salt of recollateralizationId is correct type
        address recollateralizationAddress = Create2.deploy(recollateralizationId, type(UniswapSingleTransfer).creationCode);

        // create our recollateralization
        UniswapSingleTransfer(recollateralizationAddress).initialize(
            _owner,
            _collateralAsset
        );

        // Add recollateralization to recollateralizationRegistry
        recollateralizationRegistry.registerRecollateralization(_name, recollateralizationAddress, address(this));

        emit CreateRecollateralization(recollateralizationAddress);
        return recollateralizationAddress;
    }
}