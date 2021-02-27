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
    address public creator;
    address public vault;
    string public name;
    string public symbol;

    constructor() {}

    function initialize(
        address _owner,
        string _name,
        string _symbol
    ) public external returns () {
        require(!initialized, "initalize: already initalized");
        // NOTE: owner has to be vault address
        owner = _owner;
        name = _name;
        symbol = symbol;
    }

    function mint(address account, uint256 amount) public {
        require(msg.sender == vault, "!vault");
        _mint(account, amount);
    }

    function burn(address account, uint256 value) public {
        require(msg.sender == vault, "!vault");
        _burn(account, value);
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
        require(msg.sender == )
    }
}