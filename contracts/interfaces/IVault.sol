// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

/// @title generic vault interface
/// @author Carter Carlson (@cartercarlson)
abstract contract IVault {
    /// @notice Event when an asset is deposited to the vault
    /// @param from            address which is depositing the asset
    /// @param asset           address of asset
    /// @param depositAmount   amount of assets deposited
    /// @param feeAmount       amount of fees paid
    event HandleDeposit(
        address from,
        address asset,
        uint256 depositAmount,
        uint256 feeAmount
    );

    /// @notice Event when an asset is withdrawn from the vault
    /// @param to                  address which will receive the asset
    /// @param asset               address of asset
    /// @param withdrawalAmount    amount of assets withdrawn
    /// @param feeAmount           amount of fees paid
    event HandleWithdrawal(
        address to,
        address asset,
        uint256 withdrawalAmount,
        uint256 feeAmount
    );

    /// @notice Event when claiming the accrued fees of an asset
    /// @param recipient   Recipient of the asset
    /// @param asset       address of asset
    /// @param amount      amount of asset
    event Claim(address recipient, address asset, uint256 amount);

    /// @dev key: addr of asset, value: cumulative fees paid in the asset
    mapping(address => uint256) public accruedFees;

    /// @notice Claim the accrued fees of an asset
    /// @param asset   address of asset
    /// @param max     true if claiming all accrued fees of the asset, else false
    /// @param amount  amount of asset to claim
    function claim(
        address asset,
        bool max,
        uint256 amount
    ) external virtual;

    /// @notice Deposit an asset to the vault
    /// @param from            address which is depositing the asset
    /// @param asset           address of asset
    /// @param depositAmount   amount of assets deposited
    /// @param feeAmount       amount of fees paid
    function handleDeposit(
        address from,
        address asset,
        uint256 depositAmount,
        uint256 feeAmount
    ) external virtual;

    /// @notice Withdraw an asset from the vault
    /// @param to                  address which will receive the asset
    /// @param asset               address of asset
    /// @param withdrawalAmount    amount of assets withdrawn
    function handleWithdrawal(
        address to,
        address asset,
        uint256 withdrawalAmount,
        uint256 feeAmount
    ) external virtual;

    /// @notice View to see if an asset with encoded arguments passed
    ///         when a vault is registered to a new hub
    /// @param asset       address of asset
    /// @param encodedArgs additional encoded arguments
    function isValid(address asset, bytes memory encodedArgs)
        external
        virtual
        returns (bool);
}
