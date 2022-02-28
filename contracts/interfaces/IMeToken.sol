// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

/// @title MeToken erc20 interface
/// @author Carter Carlson (@cartercarlson)
/// @dev Required for all meTokens
interface IMeToken {
    function mint(address to, uint256 amount) external;

    function burn(address from, uint256 amount) external;
}
