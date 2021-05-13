pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/ERCBurnable.sol";

// TODO: is I_Hub needed?

/// @title meToken
/// @author Carl Farterson (@carlfarterson)
/// @notice Base erc20-like meToken contract used for all meTokens
contract MeToken is Initializable, ERC20Burnable {

    modifier onlyHub() {
        require(msg.sender == hub, "!hub");
    }

    // For person that creates meToken, may not be the designated owner
    // For example, someone creates ANDRE coin on his behalf and he takes ownership later
    address public hub;

    string public name;
    string public symbol;

    constructor() public {}

    /// @notice create a meToken
    /// @param _creator address that created the meToken
    /// @param _name name of meToken
    /// @param _symbol symbol of meToken
    function initialize(
        address _hub,
        string calldata _name,
        string calldata _symbol
    ) initializer public {
        hub = _hub;
        name = _name;
        symbol = symbol;
    }

    function mint(address to, uint256 amount) onlyHub external {
        _mint(to, amount);
    }

    function burn(address from, uint256 value) onlyHub external {
        _burn(from, value);
    }

}