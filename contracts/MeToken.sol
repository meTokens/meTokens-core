pragma solidity ^0.5.0;

import "@openzeppelin/contracts/ownership/Ownables.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";


contract MeToken is Ownables, ERC20,  ERC20Detailed{

  constructor(
    uint256 _initialSupply,
    string memory _tokenName
  ) public
  ERC20Detailed(
    "meToken",
    _tokenName,
    18) {
      _symbol = _tokenName;
      _mint(msg.sender, _initialSupply); //mints the appropriate amount of meToken to the msg.sender
  }

  function mint(address account, uint256 amount) public onlyOwner {
    _mint(account, amount);
  }

  function burn(address account, uint256 value) public onlyOwner{
    _burn(account, value);
  }



}
