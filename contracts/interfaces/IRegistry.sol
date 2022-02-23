// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

/// @title generic registry interface
/// @author Carter Carlson (@cartercarlson)
interface IRegistry {
    /// @notice Event of approving an address
    /// @param addr address to approve
    event Approve(address addr);

    /// @notice Event of unapproving an address
    /// @param addr address to unapprove
    event Unapprove(address addr);

    /// @notice Approve an address
    /// @param addr address to approve
    function approve(address addr) external;

    /// @notice Unapprove an address
    /// @param addr address to unapprove
    function unapprove(address addr) external;

    /// @notice View to see if an address is approved
    /// @param addr address to view
    /// @return true if address is approved, else false
    function isApproved(address addr) external view returns (bool);
}
