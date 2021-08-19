// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

import "./Roles.sol";


/// @title meToken
/// @author Carl Farterson (@carlfarterson)
/// @notice Base erc20-like meToken contract used for all meTokens
contract MeToken is Initializable, ERC20Burnable, Roles {

    constructor(
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol) {}

    function mint(address to, uint256 amount) external {
        require(hasRole(FOUNDRY, msg.sender) || hasRole(METOKEN_REGISTRY, msg.sender));
        _mint(to, amount);
    }

    function burn(address from, uint256 value) external {
        require(hasRole(FOUNDRY, msg.sender) || hasRole(METOKEN_REGISTRY, msg.sender));
        _burn(from, value);
    }
}