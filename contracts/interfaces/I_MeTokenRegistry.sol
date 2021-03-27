pragma solidity ^0.8.0;

interface I_MeTokenRegistry {
    function registerMeToken(
        string calldata name,
        address owner,
        string calldata symbol,
        address hubId,
        address[] calldata collateralAssets
    ) external;
    function approveCollateralAsset(address asset) external;
    function UnapproveCollateralAsset(address asset) external;
    function isApprovedCollateralAsset(address asset) external view returns (bool);
}