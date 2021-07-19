// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IMeTokenFactory {
    function create(
        address owner,
        string calldata name,
        string calldata symbol
    ) external returns (address);
}