// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IMigration {
    function swap() external;

    function finishMigration(address _meToken) external;

    function isReady() external view returns (bool);

    function hasFinished() external view returns (bool);

    function getMultiplier() external view returns (uint256);
}
