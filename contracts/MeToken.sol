pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownables.sol";
import "@openzeppelin/contracts/token/ERC20/ERCBurnable.sol";


/// @title
/// @author
/// @notice
contract MeToken is Ownables, ERC20Burnable {

    modifier onlyOwner() {
        require(msg.sender == creator, "!owner");
        _;
    }

    modifier isUpdating() {
        require(!updating, "meToken is updating");
        _;
    }

    bool public updating;
    bool private initialized;
    
    // For person that creates meToken, may not be the designated owner
    // For example, someone creates ANDRE coin on his behalf and he takes ownership later
    address public owner;

    string public name;
    string public symbol;

    constructor() public {}

    function initialize(
        address _creator,
        string _name,
        string _symbol
    ) public {
        require(!initialized, "initalize: already initalized");
        // TODO: owner has to be contract responsible for mint/burn
        owner = _owner;
        name = _name;
        symbol = symbol;
    }

    function mint(address to, uint256 amount) public {
        require(msg.sender == hub, "!hub");
        _mint(to, amount);
    }

    function burn(address from, uint256 value) public {
        require(msg.sender == hub, "!hub");
        _burn(from, value);
    }

}