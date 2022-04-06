// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

/// @title Generic migration vault interface
/// @author Carter Carlson (@cartercarlson)
interface IMigration {
    /// @notice Method to trigger actions from the migration vault if needed
    /// @param meToken Address of meToken
    function poke(address meToken) external;

    /// @notice Method called when a meToken starts resubscribing to a new hub
    /// @dev This is called within meTokenRegistry.initResubscribe()
    /// @param meToken     Address of meToken
    /// @param encodedArgs Additional encoded arguments
    function initMigration(address meToken, bytes memory encodedArgs) external;

    /// @notice Method to send assets from migration vault to the vault of the
    ///         target hub
    /// @param meToken      Address of meToken
    /// @return amountOut   Amount of token returned
    function finishMigration(address meToken)
        external
        returns (uint256 amountOut);

    /// @notice Method returns bool if migration started
    /// @param meToken  Address of meToken
    /// @return started True if migration started else false
    function migrationStarted(address meToken)
        external
        view
        returns (bool started);
}
