// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor() ERC20("MOCK", "MOCK") {}

    // sets the balance of the address
    // this mints/burns the amount depending on the current balance
    function setBalance(address to, uint256 amount) public {
        uint256 old = balanceOf(to);
        if (old < amount) {
            _mint(to, amount - old);
        } else if (old > amount) {
            _burn(to, old - amount);
        }
    }
}
