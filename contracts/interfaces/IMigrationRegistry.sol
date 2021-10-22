// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IMigrationRegistry {
    event Approve(address initialVault, address targetVault, address migration);
    event Unapprove(
        address initialVault,
        address targetVault,
        address migration
    );

    /// @notice TODO
    /// @param initialVault TODO
    /// @param targetVault TODO
    /// @param migration TODO
    function unapprove(
        address initialVault,
        address targetVault,
        address migration
    ) external;

    /// @notice TODO
    /// @param initialVault) TODO
    /// @param targetVault TODO
    /// @param migration TODO
    function approve(
        address initialVault,
        address targetVault,
        address migration
    ) external;

    /// @notice TODO
    /// @param initialVault TODO
    /// @param targetVault TODO
    /// @param migration TODO
    /// @return bool status of factory
    function isApproved(
        address initialVault,
        address targetVault,
        address migration
    ) external view returns (bool);
}
