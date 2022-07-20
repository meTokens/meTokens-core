// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

import {IERC1820Registry} from "@openzeppelin/contracts/utils/introspection/IERC1820Registry.sol";
import {IERC777Recipient} from "@openzeppelin/contracts/token/ERC777/IERC777Recipient.sol";
import {ERC1820Implementer} from "@openzeppelin/contracts/utils/introspection/ERC1820Implementer.sol";
import {SingleAssetVault} from "../vaults/SingleAssetVault.sol";

contract SingleAssetVaultMock is
    SingleAssetVault,
    IERC777Recipient,
    ERC1820Implementer
{
    IERC1820Registry private _erc1820 =
        IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);

    bytes32 private constant _TOKENS_RECIPIENT_INTERFACE_HASH =
        keccak256("ERC777TokensRecipient");

    constructor(address _dao, address _diamond)
        SingleAssetVault(_dao, _diamond)
    {
        _erc1820.setInterfaceImplementer(
            address(this),
            _TOKENS_RECIPIENT_INTERFACE_HASH,
            address(this)
        );
    }

    function tokensReceived(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes calldata userData,
        bytes calldata operatorData
    ) external override {}
}
