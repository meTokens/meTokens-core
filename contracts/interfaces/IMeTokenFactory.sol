// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IMeTokenFactory {
    function create(
        string calldata name,
        string calldata symbol,
        address foundry,
        address meTokenRegistry
    ) external returns (address);
}
