pragma solidity ^0.8.0;

interface I_Vault {
    function getCollateralAsset() external view returns (address);
    function setCollateralAsset(address asset) external;
}