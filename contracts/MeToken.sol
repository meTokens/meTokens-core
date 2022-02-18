// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title meToken
/// @author Carl Farterson (@carlfarterson)
/// @notice Base erc20-like meToken contract used for all meTokens
contract MeToken is ERC20Burnable {
    string public version;
    address public diamond;

    constructor(
        string memory _name,
        string memory _symbol,
        address _diamond
    ) ERC20(_name, _symbol) {
        version = "0.2";
        diamond = _diamond;
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
