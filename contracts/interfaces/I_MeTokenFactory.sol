// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface I_MeTokenFactory {
    function createMeToken(
        address owner,
        string calldata name,
        string calldata symbol
    ) external returns (address);
}