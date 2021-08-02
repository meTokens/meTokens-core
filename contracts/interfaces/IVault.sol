// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IVault {

    event Withdraw(uint256 amount, address to);
    event AddFee(uint256 amount);
    
    function addFee(uint256 amount) external;
    function withdraw(bool _max, uint256 _amount, address _to) external;
    function getCollateralAsset() external view returns (address);
}