// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface I_RecollateralizationRegistry {
    function registerRecollateralization(
        address _recollateralization,
        address _targetVault,
        address _collateralTokenStart,
        address _collateralTokenIntra
    ) external;
    function unapproveRecollateralizationFactory(address _factory) external;
    function approveRecollateralizationFactory(address _factory) external;
    function isApprovedRecollateralizationFactory(address factory) external view returns (bool);
    function recollateralizationCount() external view returns (uint256);
}