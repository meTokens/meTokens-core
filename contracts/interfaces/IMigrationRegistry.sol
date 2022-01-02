// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

/// @title meToken migration registry interface
/// @author Carl Farterson (@carlfarterson)
interface IMigrationRegistry {
    /// @notice Event of approving a meToken migration route
    /// @param _initialVault    vault for meToken to start migration from
    /// @param _targetVault     vault for meToken to migrate to
    /// @param _migration       address of migration vault
    event Approve(
        address _initialVault,
        address _targetVault,
        address _migration
    );

    /// @notice Event of unapproving a meToken migration route
    /// @param _initialVault    vault for meToken to start migration from
    /// @param _targetVault     vault for meToken to migrate to
    /// @param _migration       address of migration vault
    event Unapprove(
        address _initialVault,
        address _targetVault,
        address _migration
    );

    /// @notice Approve a vault migration route
    /// @param _initialVault    vault for meToken to start migration from
    /// @param _targetVault     vault for meToken to migrate to
    /// @param _migration       address of migration vault
    function approve(
        address _initialVault,
        address _targetVault,
        address _migration
    ) external;

    /// @notice Unapprove a vault migration route
    /// @param _initialVault    vault for meToken to start migration from
    /// @param _targetVault     vault for meToken to migrate to
    /// @param _migration       address of migration vault
    function unapprove(
        address _initialVault,
        address _targetVault,
        address _migration
    ) external;

    /// @notice View to see if a specific migration route is approved
    /// @param _initialVault    vault for meToken to start migration from
    /// @param _targetVault     vault for meToken to migrate to
    /// @param _migration       address of migration vault
    /// @return true if migration route is approved, else false
    function isApproved(
        address _initialVault,
        address _targetVault,
        address _migration
    ) external view returns (bool);
}
