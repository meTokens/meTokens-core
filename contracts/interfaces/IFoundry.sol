// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IFoundry {

    function mint(address _meToken, uint256 _collateralDeposited, address _recipient) external;
    function burn(address _meToken, uint256 _meTokensBurned, address _recipient) external;
}