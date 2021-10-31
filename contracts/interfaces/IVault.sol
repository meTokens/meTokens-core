// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IVault {
    event Withdraw(address _asset, uint256 _amount);
    event AddFee(address _asset, uint256 _amount);

    function withdraw(
        address _asset,
        bool _max,
        uint256 _amount
    ) external;

    function isValid(address _asset, bytes memory _encodedArgs)
        external
        view
        returns (bool);

    function addFee(address _asset, uint256 _amount) external;

    function getAccruedFees(address _asset) external view returns (uint256);
}
