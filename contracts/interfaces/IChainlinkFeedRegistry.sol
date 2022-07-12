// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

interface IChainlinkFeedRegistry {
    function decimals(address base, address quote)
        external
        view
        returns (uint8);

    function latestAnswer(address base, address quote)
        external
        view
        returns (int256);
}
