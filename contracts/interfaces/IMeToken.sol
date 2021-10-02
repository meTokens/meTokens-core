// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IMeToken {
    function initialize(
        string calldata name,
        address owner,
        string calldata symbol
    ) external;

    function mint(address to, uint256 amount) external;

    function burn(address from, uint256 amount) external;

    function canMigrate() external view returns (bool);

    function switchUpdating() external returns (bool);
}
