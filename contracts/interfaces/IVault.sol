// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

/// @title Generic vault interface
/// @author Carter Carlson (@cartercarlson)
interface IVault {
    /// @notice Event of depositing an asset to the vault
    /// @param from            Address which is depositing the asset
    /// @param asset           Address of asset
    /// @param depositAmount   Amount of assets deposited
    /// @param feeAmount       Amount of fees paid
    event HandleDeposit(
        address from,
        address asset,
        uint256 depositAmount,
        uint256 feeAmount
    );

    /// @notice Event of withdrawing an asset from the vault
    /// @param to                  Address which will receive the asset
    /// @param asset               Address of asset
    /// @param withdrawalAmount    Amount of assets withdrawn
    /// @param feeAmount           Amount of fees paid
    event HandleWithdrawal(
        address to,
        address asset,
        uint256 withdrawalAmount,
        uint256 feeAmount
    );

    /// @notice Event of claiming the accrued fees of an asset
    /// @param recipient   Recipient of the asset
    /// @param asset       Address of asset
    /// @param amount      Amount of asset
    event Claim(address recipient, address asset, uint256 amount);

    /// @notice Claim the accrued fees of an asset
    /// @param asset   Address of asset
    /// @param max     True if claiming all accrued fees of the asset, else false
    /// @param amount  Amount of asset to claim
    function claim(
        address asset,
        bool max,
        uint256 amount
    ) external;

    /// @notice Deposit an asset to the vault
    /// @param from            Address which is depositing the asset
    /// @param asset           Address of asset
    /// @param depositAmount   Amount of assets deposited
    /// @param feeAmount       Amount of fees paid
    function handleDeposit(
        address from,
        address asset,
        uint256 depositAmount,
        uint256 feeAmount
    ) external;

    /// @notice Withdraw an asset from the vault
    /// @param to                  Address which will receive the asset
    /// @param asset               Address of asset
    /// @param withdrawalAmount    Amount of assets withdrawn
    function handleWithdrawal(
        address to,
        address asset,
        uint256 withdrawalAmount,
        uint256 feeAmount
    ) external;

    /// @notice View to see if an asset with encoded arguments passed
    ///           when a vault is registered to a new hub
    /// @param asset        Address of asset
    /// @param encodedArgs  Additional encoded arguments
    /// @return             True if asset & encoded args are valid, else false
    function isValid(address asset, bytes memory encodedArgs)
        external
        returns (bool);
}
