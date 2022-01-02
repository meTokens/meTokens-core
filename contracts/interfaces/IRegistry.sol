// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

/// @title generic registry interface
/// @author Carl Farterson (@carlfarterson)
interface IRegistry {
    /// @notice Event of approving an address
    /// @param _addr address to approve
    event Approve(address _addr);

    /// @notice Event of unapproving an address
    /// @param _addr address to unapprove
    event Unapprove(address _addr);

    /// @notice Approve an address
    /// @param _addr address to approve
    function approve(address _addr) external;

    /// @notice Unapprove an address
    /// @param _addr address to unapprove
    function unapprove(address _addr) external;

    /// @notice View to see if an address is approved
    /// @param _addr address to view
    /// @return true if address is approved, else false
    function isApproved(address _addr) external view returns (bool);
}
