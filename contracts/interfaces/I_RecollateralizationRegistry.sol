// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface I_RecollateralizationRegistry {
    function registerRecollateralization(string memory name, address recollateralization, address factory) external view;
    function isApprovedRecollateralizationFactory(address factory) external view returns (bool);
    function recollateralizationCount() external view returns (uint256);
}