pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "./Recollateralization.sol";


/// @title Vault migrator from erc20 to erc20 (non-lp)
/// @author Carl Farterson (@carlfarterson)
/// @notice This contract moves the pooled/locked balances from
///     one erc20 to another
contract UniswapSingleTransfer is Recollateralization, Initializable {

    constructor () {}

    function initialize(
        address _owner,
        address _targetVault
    ) external {
        require(recollateralizationRegistry.isApprovedRecollateralizationFactory(msg.sender), "!approved");


    }

}