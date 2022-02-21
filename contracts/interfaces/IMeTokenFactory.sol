// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

/// @title meToken factory interface
/// @author Carl Farterson (@carlfarterson)
interface IMeTokenFactory {
    /// @notice Create a meToken
    /// @param name        name of meToken
    /// @param symbol      symbol of meToken
    /// @param diamond     address of diamond
    function create(
        string calldata name,
        string calldata symbol,
        address diamond
    ) external returns (address);
}
