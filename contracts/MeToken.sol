// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/// @title MeToken
/// @author Carter Carlson (@cartercarlson)
/// @notice Base erc20-like meToken contract used for all meTokens
contract MeToken is ERC20Burnable {
    string public version;
    address public diamond;

    constructor(
        string memory name,
        string memory symbol,
        address diamondAdr
    ) ERC20(name, symbol) {
        version = "0.2";
        diamond = diamondAdr;
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == diamond, "!authorized");
        _mint(to, amount);
    }

    function burn(address from, uint256 value) external {
        require(msg.sender == diamond, "!authorized");
        _burn(from, value);
    }
}
