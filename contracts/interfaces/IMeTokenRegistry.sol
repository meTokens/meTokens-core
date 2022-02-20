// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {MeTokenInfo} from "../libs/LibMeToken.sol";

/// @title meToken registry interface
/// @author Carl Farterson (@carlfarterson)
interface IMeTokenRegistry {
    /// @notice Event of subscribing (creating) a new meToken
    /// @param meToken         address of created meToken
    /// @param owner           address of meToken owner
    /// @param minted          amount of meToken minted to owner
    /// @param asset           address of underlying asset
    /// @param assetsDeposited amount of assets deposited
    /// @param name            name of meToken
    /// @param symbol          symbol of meToken
    /// @param hubId           unique hub identifier
    event Subscribe(
        address indexed meToken,
        address indexed owner,
        uint256 minted,
        address asset,
        uint256 assetsDeposited,
        string name,
        string symbol,
        uint256 hubId
    );

    /// @notice Event of initializing a meToken subscription to a different hub
    /// @param meToken                 address of meToken
    /// @param targetHubId             target hub to suscribe to
    /// @param migration               address of migration vault
    /// @param encodedMigrationArgs    additional encoded migration vault arguments
    event InitResubscribe(
        address indexed meToken,
        uint256 targetHubId,
        address migration,
        bytes encodedMigrationArgs
    );
    /// @notice Event of canceling a meToken resubscription
    /// @param meToken address of meToken
    event CancelResubscribe(address indexed meToken);

    /// @notice Event of finishing a meToken resubscription
    /// @param meToken address of meToken
    event FinishResubscribe(address indexed meToken);

    /// @notice Event of updating a meToken's balancePooled and balanceLocked
    /// @param meToken     address of meToken
    /// @param newBalance  rate to multiply balances by
    event UpdateBalances(address meToken, uint256 newBalance);

    /// @notice Event of transfering meToken ownership to a new owner
    /// @param from    address of current meToken owner
    /// @param to      address to own the meToken
    /// @param meToken address of meToken
    event TransferMeTokenOwnership(address from, address to, address meToken);

    /// @notice Event of cancelling the transfer of meToken ownership
    /// @param from    address of current meToken owner
    /// @param meToken address of meToken
    event CancelTransferMeTokenOwnership(address from, address meToken);

    /// @notice Event of claiming the transfer of meToken ownership
    /// @param from    address of current meToken owner
    /// @param to      address to own the meToken
    /// @param meToken address of meToken
    event ClaimMeTokenOwnership(address from, address to, address meToken);

    /// @notice Event of updating a meToken's balancePooled
    /// @param add     boolean that is true if adding to balance, false if subtracting
    /// @param meToken address of meToken
    /// @param amount  amount to add/subtract
    event UpdateBalancePooled(bool add, address meToken, uint256 amount);

    /// @notice Event of updating a meToken's balanceLocked
    /// @param add     boolean that is true if adding to balance, false if subtracting
    /// @param meToken address of meToken
    /// @param amount  amount to add/subtract
    event UpdateBalanceLocked(bool add, address meToken, uint256 amount);

    /// @notice Create and subscribe a meToken to a hub
    /// @param name            name of meToken
    /// @param symbol          symbol of meToken
    /// @param hubId           initial hub to subscribe to
    /// @param assetsDeposited amount of assets deposited at meToken initialization
    function subscribe(
        string calldata name,
        string calldata symbol,
        uint256 hubId,
        uint256 assetsDeposited
    ) external;

    /// @notice Initialize a meToken resubscription to a new hub
    /// @param meToken                 address of meToken
    /// @param targetHubId             hub which meToken is resubscribing to
    /// @param migration               address of migration vault
    /// @param encodedMigrationArgs    additional encoded migration vault arguments
    function initResubscribe(
        address meToken,
        uint256 targetHubId,
        address migration,
        bytes memory encodedMigrationArgs
    ) external;

    /// @notice Cancel a meToken resubscription
    /// @dev can only be done during the warmup period
    /// @param meToken address of meToken
    function cancelResubscribe(address meToken) external;

    /// @notice Finish a meToken's resubscription to a new hub
    /// @param meToken  address of meToken
    /// @return         details of meToken
    function finishResubscribe(address meToken)
        external
        returns (MeTokenInfo memory);

    /// @notice Update a meToken's balanceLocked and balancePooled
    /// @param meToken     address of meToken
    /// @param newBalance  rate to multiply balances by
    function updateBalances(address meToken, uint256 newBalance) external;

    /// @notice Update a meToken's balancePooled
    /// @param add     boolean that is true if adding to balance, false if subtracting
    /// @param meToken address of meToken
    /// @param amount  amount to add/subtract
    function updateBalancePooled(
        bool add,
        address meToken,
        uint256 amount
    ) external;

    /// @notice Update a meToken's balanceLocked
    /// @param add     boolean that is true if adding to balance, false if subtracting
    /// @param meToken address of meToken
    /// @param amount  amount to add/subtract
    function updateBalanceLocked(
        bool add,
        address meToken,
        uint256 amount
    ) external;

    /// @notice Transfer meToken ownership to a new owner
    /// @param newOwner address to claim meToken ownership of msg.sender
    function transferMeTokenOwnership(address newOwner) external;

    /// @notice Cancel the transfer of meToken ownership
    function cancelTransferMeTokenOwnership() external;

    /// @notice Claim the transfer of meToken ownership
    /// @param from address of current meToken owner
    function claimMeTokenOwnership(address from) external;

    /// @notice View to return address of meToken owned by owner
    /// @param owner   address of meToken owner
    /// @return         address of meToken
    function getOwnerMeToken(address owner) external view returns (address);

    /// @notice View to see the address to claim meToken ownership from from
    /// @param from address to transfer meToken ownership
    /// @return     address of pending meToken owner
    function getPendingOwner(address from) external view returns (address);

    /// @notice View to get details of a meToken
    /// @param meToken      address of meToken queried
    /// @return meToken     details of meToken
    function getMeTokenDetails(address meToken)
        external
        view
        returns (MeTokenInfo memory);

    /// @notice View to return if an address owns a meToken or not
    /// @param owner    address to query
    /// @return         true if owns a meToken, else false
    function isOwner(address owner) external view returns (bool);
}
