// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

/// @title generic vault interface
/// @author Carl Farterson (@carlfarterson)
abstract contract IVault {
    /// @notice Event when an asset is deposited to the vault
    /// @param _from            address which is depositing the asset
    /// @param _asset           address of asset
    /// @param _depositAmount   amount of assets deposited
    /// @param _feeAmount       amount of fees paid
    event HandleDeposit(
        address _from,
        address _asset,
        uint256 _depositAmount,
        uint256 _feeAmount
    );

    /// @notice Event when an asset is withdrawn from the vault
    /// @param _to                  address which will receive the asset
    /// @param _asset               address of asset
    /// @param _withdrawalAmount    amount of assets withdrawn
    /// @param _feeAmount           amount of fees paid
    event HandleWithdrawal(
        address _to,
        address _asset,
        uint256 _withdrawalAmount,
        uint256 _feeAmount
    );

    /// @notice Event when claiming the accrued fees of an asset
    /// @param _recipient   Recipient of the asset
    /// @param _asset       address of asset
    /// @param _amount      amount of asset
    event Claim(address _recipient, address _asset, uint256 _amount);

    /// @dev key: addr of asset, value: cumulative fees paid in the asset
    mapping(address => uint256) public accruedFees;

    /// @notice Claim the accrued fees of an asset
    /// @param _asset   address of asset
    /// @param _max     true if claiming all accrued fees of the asset, else false
    /// @param _amount  amount of asset to claim
    function claim(
        address _asset,
        bool _max,
        uint256 _amount
    ) external virtual;

    /// @notice Deposit an asset to the vault
    /// @param _from            address which is depositing the asset
    /// @param _asset           address of asset
    /// @param _depositAmount   amount of assets deposited
    /// @param _feeAmount       amount of fees paid
    function handleDeposit(
        address _from,
        address _asset,
        uint256 _depositAmount,
        uint256 _feeAmount
    ) external virtual;

    /// @notice Withdraw an asset from the vault
    /// @param _to                  address which will receive the asset
    /// @param _asset               address of asset
    /// @param _withdrawalAmount    amount of assets withdrawn
    function handleWithdrawal(
        address _to,
        address _asset,
        uint256 _withdrawalAmount,
        uint256 _feeAmount
    ) external virtual;

    /// @notice View to see if an asset with encoded arguments passed
    ///         when a vault is registered to a new hub
    /// @param _asset       address of asset
    /// @param _encodedArgs additional encoded arguments
    function isValid(address _asset, bytes memory _encodedArgs)
        external
        virtual
        returns (bool);
}
