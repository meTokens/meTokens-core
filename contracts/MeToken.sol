pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/ERCBurnable.sol";

// TODO: is I_Hub needed?

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
    address public hub = address(0x0); // TODO
    address public meTokenRegistry = address(0x0); // TODO

    string public name;
    string public symbol;

    constructor() public {}

    /// @notice create a meToken
    /// @param _creator address that created the meToken
    /// @param _name name of meToken
    /// @param _symbol symbol of meToken
    function initialize(
        string calldata _name,
        string calldata _symbol
    ) initializer public {
        name = _name;
        symbol = symbol;
    }

    function mint(address to, uint256 amount) onlyAuthorized external {
        _mint(to, amount);
    }

    function burn(address from, uint256 value) onlyAuthorized external {
        _burn(from, value);
    }

}