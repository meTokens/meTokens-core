// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IRegistry {
    event Approve(address _addr);
    event Unapprove(address _addr);

    function approve(address _addr) external;

    function unapprove(address _addr) external;

    function isApproved(address _addr) external view returns (bool);
}
