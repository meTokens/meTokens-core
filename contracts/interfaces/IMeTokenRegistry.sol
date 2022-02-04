// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../libs/Details.sol";
import {MeTokenInfo} from "../libs/LibMeToken.sol";

/// @title meToken registry interface
/// @author Carl Farterson (@carlfarterson)
interface IMeTokenRegistry {
    /// @notice Event of subscribing (creating) a new meToken
    /// @param _meToken         address of created meToken
    /// @param _owner           address of meToken owner
    /// @param _minted          amount of meToken minted to owner
    /// @param _asset           address of underlying asset
    /// @param _assetsDeposited amount of assets deposited
    /// @param _name            name of meToken
    /// @param _symbol          symbol of meToken
    /// @param _hubId           unique hub identifier
    event Subscribe(
        address indexed _meToken,
        address indexed _owner,
        uint256 _minted,
        address _asset,
        uint256 _assetsDeposited,
        string _name,
        string _symbol,
        uint256 _hubId
    );

    /// @notice Event of initializing a meToken subscription to a different hub
    /// @param _meToken                 address of meToken
    /// @param _targetHubId             target hub to suscribe to
    /// @param _migration               address of migration vault
    /// @param _encodedMigrationArgs    additional encoded migration vault arguments
    event InitResubscribe(
        address indexed _meToken,
        uint256 _targetHubId,
        address _migration,
        bytes _encodedMigrationArgs
    );
    /// @notice Event of canceling a meToken resubscription
    /// @param _meToken address of meToken
    event CancelResubscribe(address indexed _meToken);

    /// @notice Event of finishing a meToken resubscription
    /// @param _meToken address of meToken
    event FinishResubscribe(address indexed _meToken);

    /// @notice Event of updating a meToken's balancePooled and balanceLocked
    /// @param _meToken     address of meToken
    /// @param _newBalance  rate to multiply balances by
    event UpdateBalances(address _meToken, uint256 _newBalance);

    /// @notice Event of transfering meToken ownership to a new owner
    /// @param _from    address of current meToken owner
    /// @param _to      address to own the meToken
    /// @param _meToken address of meToken
    event TransferMeTokenOwnership(
        address _from,
        address _to,
        address _meToken
    );

    /// @notice Event of cancelling the transfer of meToken ownership
    /// @param _from    address of current meToken owner
    /// @param _meToken address of meToken
    event CancelTransferMeTokenOwnership(address _from, address _meToken);

    /// @notice Event of claiming the transfer of meToken ownership
    /// @param _from    address of current meToken owner
    /// @param _to      address to own the meToken
    /// @param _meToken address of meToken
    event ClaimMeTokenOwnership(address _from, address _to, address _meToken);

    /// @notice Event of updating a meToken's balancePooled
    /// @param _add     boolean that is true if adding to balance, false if subtracting
    /// @param _meToken address of meToken
    /// @param _amount  amount to add/subtract
    event UpdateBalancePooled(bool _add, address _meToken, uint256 _amount);

    /// @notice Event of updating a meToken's balanceLocked
    /// @param _add     boolean that is true if adding to balance, false if subtracting
    /// @param _meToken address of meToken
    /// @param _amount  amount to add/subtract
    event UpdateBalanceLocked(bool _add, address _meToken, uint256 _amount);

    /// @notice Create and subscribe a meToken to a hub
    /// @param _name            name of meToken
    /// @param _symbol          symbol of meToken
    /// @param _hubId           initial hub to subscribe to
    /// @param _assetsDeposited amount of assets deposited at meToken initialization
    function subscribe(
        string calldata _name,
        string calldata _symbol,
        uint256 _hubId,
        uint256 _assetsDeposited
    ) external;

    /// @notice Initialize a meToken resubscription to a new hub
    /// @param _meToken                 address of meToken
    /// @param _targetHubId             hub which meToken is resubscribing to
    /// @param _migration               address of migration vault
    /// @param _encodedMigrationArgs    additional encoded migration vault arguments
    function initResubscribe(
        address _meToken,
        uint256 _targetHubId,
        address _migration,
        bytes memory _encodedMigrationArgs
    ) external;

    /// @notice Cancel a meToken resubscription
    /// @dev can only be done during the warmup period
    /// @param _meToken address of meToken
    function cancelResubscribe(address _meToken) external;

    /// @notice Finish a meToken's resubscription to a new hub
    /// @param _meToken address of meToken
    /// @return details of meToken
    function finishResubscribe(address _meToken)
        external
        returns (MeTokenInfo memory);

    /// @notice Update a meToken's balanceLocked and balancePooled
    /// @param _meToken     address of meToken
    /// @param _newBalance  rate to multiply balances by
    function updateBalances(address _meToken, uint256 _newBalance) external;

    /// @notice Update a meToken's balancePooled
    /// @param _add     boolean that is true if adding to balance, false if subtracting
    /// @param _meToken address of meToken
    /// @param _amount  amount to add/subtract
    function updateBalancePooled(
        bool _add,
        address _meToken,
        uint256 _amount
    ) external;

    /// @notice Update a meToken's balanceLocked
    /// @param _add     boolean that is true if adding to balance, false if subtracting
    /// @param _meToken address of meToken
    /// @param _amount  amount to add/subtract
    function updateBalanceLocked(
        bool _add,
        address _meToken,
        uint256 _amount
    ) external;

    /// @notice Transfer meToken ownership to a new owner
    /// @param _newOwner address to claim meToken ownership of msg.sender
    function transferMeTokenOwnership(address _newOwner) external;

    /// @notice Cancel the transfer of meToken ownership
    function cancelTransferMeTokenOwnership() external;

    /// @notice Claim the transfer of meToken ownership
    /// @param _from address of current meToken owner
    function claimMeTokenOwnership(address _from) external;

    /// @notice View to return address of meToken owned by _owner
    /// @param _owner   address of meToken owner
    /// @return         address of meToken
    function getOwnerMeToken(address _owner) external view returns (address);

    /// @notice View to see the address to claim meToken ownership from _from
    /// @param _from    address to transfer meToken ownership
    /// @return         address of pending meToken owner
    function getPendingOwner(address _from) external view returns (address);

    /// @notice View to get details of a meToken
    /// @param meToken      address of meToken queried
    /// @return meToken_    details of meToken
    function getDetails(address meToken)
        external
        view
        returns (MeTokenInfo memory meToken_);

    /// @notice View to return if an address owns a meToken or not
    /// @param _owner   address to query
    /// @return         true if owns a meToken, else false
    function isOwner(address _owner) external view returns (bool);
}
