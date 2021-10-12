// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IVault {
    event Withdraw(uint256 amount, address to);
    event AddFee(uint256 amount);
    event StartMigration(address migration);
    event Migrate();

    function addFee(uint256 amount) external;

    function withdraw(bool max, uint256 amount) external;

    function getToken() external view returns (address);

    function getAccruedFees() external view returns (uint256);
}
