pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";


/// @title meToken
/// @author Carl Farterson (@carlfarterson)
/// @notice Base erc20-like meToken contract used for all meTokens
contract MeToken is Initializable, ERC20Burnable {

    modifier onlyAuthorized() {
        require(msg.sender == hub || msg.sender == meTokenRegistry , "!authorized");
        _;
    }

    // For person that creates meToken, may not be the designated owner
    // For example, someone creates ANDRE coin on his behalf and he takes ownership later
    // TODO: is I_Hub needed?
    address public hub = address(0x0); // TODO
    address public meTokenRegistry = address(0x0); // TODO

    constructor(
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol) {}

    function mint(address to, uint256 amount) onlyAuthorized external {
        _mint(to, amount);
    }

    function burn(address from, uint256 value) onlyAuthorized external {
        _burn(from, value);
    }

}