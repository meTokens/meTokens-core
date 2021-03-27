pragma solidity ^0.8.0;

interface I_CurveValueSet {
    function calculateMintReturn(
        uint256 hubId,
        uint256 supply,
        uint256 balancePooled,
        uint256 depositAmount
    ) external view returns (uint256 amount);

    function calculateBurnReturn(
        uint256 hubId,
        uint256 supply,
        uint256 balancePooled,
        uint256 sellAmount
    ) external view returns (uint256 amount);
}