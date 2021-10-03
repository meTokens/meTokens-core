// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IMigration {
    function hasFinished() external view returns (bool);

    function getRatio() external view returns (uint256);
}
