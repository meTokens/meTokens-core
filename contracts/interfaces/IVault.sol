// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

abstract contract IVault {
    event Claim(address _recipient, address _asset, uint256 _amount);
    event AddFee(address _asset, uint256 _amount);

    /// @dev key: addr of asset, value: cumulative fees paid in the asset
    mapping(address => uint256) public accruedFees;

    function claim(
        address _asset,
        bool _max,
        uint256 _amount
    ) external virtual;

    function handleDeposit(
        address _asset,
        uint256 _depositAmount,
        uint256 _feeAmount,
        address _from
    ) external virtual;

    function handleWithdrawal(
        address _asset,
        uint256 _withdrawalAmount,
        uint256 _feeAmount,
        address _to
    ) external virtual;

    function isValid(address _asset, bytes memory _encodedArgs)
        external
        virtual
        returns (bool);

    function addFee(address _meToken, uint256 _amount) external virtual;
}
