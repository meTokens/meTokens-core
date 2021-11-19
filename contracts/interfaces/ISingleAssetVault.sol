// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface ISingleAssetVault {
    event StartMigration(address _meToken);

    function startMigration(address _meToken) external;
}
