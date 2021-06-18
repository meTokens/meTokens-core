// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface I_MeTokenFactory {
    function createMeToken(
        string calldata name,
        address owner,
        string calldata symbol,
        uint256 hub
    ) external returns (address);
}