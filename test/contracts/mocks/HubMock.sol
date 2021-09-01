// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

contract HubMock {
    function isActive(uint256 _hub) external pure returns (bool) {
        return true;
    }
    function getVault(uint256 _hub) external pure returns (address) {
        return address(0);
    }
    function getCurve(uint256 _hub, address curve) external pure returns (address) {return curve;}
}