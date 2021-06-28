// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IVault {
    function addFee(uint256 amount) external;
    function withdrawFees(bool _max, uint256 _amount, address _to) external;
    function getCollateralAsset() external view returns (address);
}