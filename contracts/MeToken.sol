pragma solidity ^0.5.0;

import "@openzeppelin/contracts/ownership/Ownables.sol";
import "@openzeppelin/contracts/token/ERC20/ERCBurnable.sol";


contract MeToken is Ownables, ERC20Burnable {

    bool private initialized;
    bool private _canMigrate;
    address public owner;
    string public name;
    string public symbol;

    constructor() {}

    function initialize(
        address _owner,
        string _name,
        string _symbol
    ) public external returns () {
        require(!initialized, "initalize: already initalized");
        owner = _owner;
        name = _name;
        symbol = symbol;
    }

    function mint(address account, uint256 amount) public onlyOwner {
        _mint(account, amount);
    }

    function burn(address account, uint256 value) public onlyOwner{
        _burn(account, value);
    }

    function canMigrate() external view returns (bool) {
        return _canMigrate;
    }
}