// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IVault {
    event Withdraw(uint256 amount, address to);
    event AddFee(uint256 amount);
    event StartMigration(address migration);
    event Migrate();

    function withdraw(
        address _asset,
        bool _max,
        uint256 _amount
    ) external;

    function validate(bytes memory _encodedArgs) external returns (address);

    function addFee(address _meToken, uint256 _amount) external;

    function getAccruedFees(address _asset) external view returns (uint256);
}
