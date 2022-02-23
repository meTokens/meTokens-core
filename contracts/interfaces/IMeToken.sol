// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

/// @title meToken interface
/// @author Carter Carlson (@cartercarlson)
/// @dev Required for all meTokens
interface IMeToken {
    // TODO: are these needed, or can we do IERC20?
    function initialize(
        string calldata name,
        address owner,
        string calldata symbol
    ) external;

    function mint(address to, uint256 amount) external;

    function burn(address from, uint256 amount) external;
}
