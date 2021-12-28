// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/// @title meToken
/// @author Carl Farterson (@carlfarterson)
/// @notice Base erc20-like meToken contract used for all meTokens
contract MeToken is ERC20Burnable {
    string public version;
    address public foundry;
    address public meTokenRegistry;

    constructor(
        string memory _name,
        string memory _symbol,
        address _foundry,
        address _meTokenRegistry
    ) ERC20(_name, _symbol) {
        version = "0.2";
        foundry = _foundry;
        meTokenRegistry = _meTokenRegistry;
    }

    function mint(address to, uint256 amount) external {
        require(
            msg.sender == foundry || msg.sender == meTokenRegistry,
            "!authorized"
        );
        _mint(to, amount);
    }

    function burn(address from, uint256 value) external {
        require(
            msg.sender == foundry || msg.sender == meTokenRegistry,
            "!authorized"
        );
        _burn(from, value);
    }
}
