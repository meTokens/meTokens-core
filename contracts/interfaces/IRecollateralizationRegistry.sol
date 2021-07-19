// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IRecollateralizationRegistry {
    function register(
        address _recollateralization,
        address _targetVault,
        address _collateralTokenStart,
        address _collateralTokenIntra
    ) external;
    function unapprove(address _factory) external;
    function approve(address _factory) external;
    function isApproved(address factory) external view returns (bool);
    function recollateralizationCount() external view returns (uint256);
}