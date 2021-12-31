// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

abstract contract IVault {
    event HandleDeposit(
        address _from,
        address _asset,
        uint256 _depositAmount,
        uint256 _feeAmount
    );
    event HandleWithdrawal(
        address _to,
        address _asset,
        uint256 _withdrawalAmount,
        uint256 _feeAmount
    );
    event Claim(address _recipient, address _asset, uint256 _amount);

    /// @dev key: addr of asset, value: cumulative fees paid in the asset
    mapping(address => uint256) public accruedFees;

    function claim(
        address _asset,
        bool _max,
        uint256 _amount
    ) external virtual;

    function handleDeposit(
        address _from,
        address _asset,
        uint256 _depositAmount,
        uint256 _feeAmount
    ) external virtual;

    function handleWithdrawal(
        address _to,
        address _asset,
        uint256 _withdrawalAmount,
        uint256 _feeAmount
    ) external virtual;

    function isValid(address _asset, bytes memory _encodedArgs)
        external
        virtual
        returns (bool);
}
