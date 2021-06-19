// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface I_MeToken {
    function initialize(string calldata name, address owner, string calldata symbol) public;
    function mint(address to, uint256 amount) public;
    function burn(address from, uint256 amount) public;
    function canMigrate() external view returns (bool);
    function switchUpdating() public returns (bool);
}