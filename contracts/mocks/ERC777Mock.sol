// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.9;

import {ERC777} from "@openzeppelin/contracts/token/ERC777/ERC777.sol";

contract ERC777Mock is ERC777 {
    constructor() ERC777("MOCK", "MOCK", new address[](0)) {}

    // sets the balance of the address
    // this mints/burns the amount depending on the current balance
    function setBalance(address to, uint256 amount) public {
        uint256 old = balanceOf(to);
        if (old < amount) {
            _mint(to, amount - old, "", "");
        } else if (old > amount) {
            _burn(to, old - amount, "", "");
        }
    }
}
