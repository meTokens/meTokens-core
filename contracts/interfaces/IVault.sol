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

    function register(uint256 _hubId, bytes memory _encodedArgs) external;

    function addFee(address _meToken, uint256 _amount) external;

    function getAsset(uint256 _hubId) external view returns (address);

    function getAsset(address _meToken) external view returns (address);

    function getAccruedFees(address _asset) external view returns (uint256);
}
