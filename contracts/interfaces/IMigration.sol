// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IMigration {
    function poke(address _meToken) external;

    function initMigration(address _meToken, bytes memory _encodedArgs)
        external;

    function finishMigration(address _meToken) external returns (uint256);

    // function isReady() external view returns (bool);
    // function hasFinished() external view returns (bool);
}
