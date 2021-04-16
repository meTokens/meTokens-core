pragma solidity ^0.8.0;

interface I_MeTokenRegistry {
    function registerMeToken(
        string calldata name,
        address owner,
        string calldata symbol,
        uint256 hub
    ) external;
    function isMeTokenOwner(address owner) external view returns (bool);
    function getMeTokenHub(address meToken) external view returns (uint256);
}