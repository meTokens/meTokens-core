pragma solidity ^0.5.0;

import "@openzeppelin/contracts/access/Ownables.sol";
import "@openzeppelin/contracts/token/ERC20/ERCBurnable.sol";


contract MeToken is Ownables, ERC20Burnable {

    event SwitchUpdating(bool _updating);

    modifier onlyCreator() {
        require(msg.sender == creator, "!creator");
        _;
    }

    modifier isUpdating() {
        require(!updating, "meToken is updating");
        _;
    }

    bool public updating;
    bool private initialized;
    bool private _canMigrate;
    
    // For person that creates meToken, may not be the designated owner
    // For example, someone creates ANDRE coin on his behalf and he takes ownership later
    address public owner;

    address public vault;
    string public name;
    string public symbol;

    constructor() {}

    function initialize(
        address _creator,
        string _name,
        string _symbol
    ) public {
        require(!initialized, "initalize: already initalized");
        // TODO: owner has to be vault address
        owner = _owner;
        name = _name;
        symbol = symbol;
    }

    function mint(address to, uint256 amount) public {
        require(msg.sender == vault, "!vault");
        _mint(to, amount);
    }

    function burn(address from, uint256 value) public {
        require(msg.sender == vault, "!vault");
        _burn(from, value);
    }

    function canMigrate() external view returns (bool) {
        return _canMigrate;
    }

    /*
    Scenarios when updating would happen
    * only owner
    * whoever is in charge of the hub
    */
    function switchUpdating() returns (bool) {
        require(msg.sender == 0x0); // TODO
    }
}