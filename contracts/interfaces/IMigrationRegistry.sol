// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IMigrationRegistry {

    event Register(address recollateralization);
    event Approve(address factory);
    event Unapprove(address factory);

    function register(
        address _recollateralization,
        address _targetVault,
        address _collateralTokenStart,
        address _collateralTokenIntra
    ) external;
    function unapprove(address _factory) external;
    function approve(address _factory) external;
    function isApproved(address factory) external view returns (bool);
    function getCount() external view returns (uint256);
}