// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

/// @title meToken factory interface
/// @author Carl Farterson (@carlfarterson)
interface IMeTokenFactory {
    /// @notice Create a meToken
    /// @param _name        name of meToken
    /// @param _symbol      symbol of meToken
    /// @param _diamond     address of diamond
    function create(
        string calldata _name,
        string calldata _symbol,
        address _diamond
    ) external returns (address);
}
