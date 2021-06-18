// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface I_Vault {
    function getCollateralAsset() external view returns (address);
}