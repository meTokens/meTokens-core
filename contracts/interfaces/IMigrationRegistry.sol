// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IMigrationRegistry {
    event Register(address migration);
    event Deactivate(address migration);
    event Approve(address factory);
    event Unapprove(address factory);

    /// @notice TODO
    /// @param _migration TODO
    function register(address _migration) external;

    /// @notice TODO
    /// @param _migration TODO
    function deactivate(address _migration) external;

    /// @notice TODO
    /// @param _factory TODO
    function unapprove(address _factory) external;

    /// @notice TODO
    /// @param _factory) TODO
    function approve(address _factory) external;

    /// @notice TODO
    /// @param _factory TODO
    /// @return bool status of factory
    function isApproved(address _factory) external view returns (bool);

    /// @notice TODO
    /// @param _migration TODO
    /// @return bool status of migration
    function isActive(address _migration) external view returns (bool);
}
