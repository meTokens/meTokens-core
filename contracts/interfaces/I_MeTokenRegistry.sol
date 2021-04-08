pragma solidity ^0.8.0;

interface I_MeTokenRegistry {
    function registerMeToken(
        string calldata name,
        address owner,
        string calldata symbol,
        address hubId,
        address[] calldata collateralAssets
    ) external;
    function isMeTokenOwner(address owner) external view returns (bool);
}