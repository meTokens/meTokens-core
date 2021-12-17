// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

abstract contract IVault {
    event Withdraw(address _asset, uint256 _amount);
    event AddFee(address _asset, uint256 _amount);

    /// @dev key: addr of asset, value: cumulative fees paid in the asset
    mapping(address => uint256) public accruedFees;

    function withdraw(
        address _asset,
        bool _max,
        uint256 _amount
    ) external virtual;

    function approveAsset(address _asset, uint256 _amount) external virtual;

    function isValid(address _asset, bytes memory _encodedArgs)
        external
        virtual
        returns (bool);

    function addFee(address _meToken, uint256 _amount) external virtual;
}
