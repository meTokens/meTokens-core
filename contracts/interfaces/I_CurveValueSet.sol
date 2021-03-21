pragma solidity ^0.8.0;

interface I_CurveValueSet {
    function calculateMintReturn(
        uint256 _hub,
        uint256 _supply,
        uint256 _balancePooled,
        uint256 _depositAmount
    ) public view returns (uint256 amount);

    function calculateBurnReturn(
        uint256 _hub,
        uint256 _supply,
        uint256 _balancePooled,
        uint256 _sellAmount
    ) public view returns (uint256 amount);
}