// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

/// @title Generic migration vault interface
/// @author Carl Farterson (@carlfarterson)
interface IMigration {
    /// @notice Method to trigger actions from the migration vault if needed
    /// @param _meToken address of meToken
    function poke(address _meToken) external;

    /// @notice Method called when a meToken starts resubscribing to a new hub
    /// @dev This is called within meTokenRegistry.initResubscribe()
    /// @param _meToken     address of meToken
    /// @param _encodedArgs additional encoded arguments
    function initMigration(address _meToken, bytes memory _encodedArgs)
        external;

    /// @notice Method to send assets from migration vault to the vault of the
    ///         target hub
    /// @param _meToken address of meToken
    function finishMigration(address _meToken) external returns (uint256);
}
