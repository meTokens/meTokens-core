pragma solidity ^0.8.0;

contract I_Curve {
    function calculateMintReturn(
        uint256 supply,
        uint256 balancePool,
        uint256 reserveWeight,
        uint256 amountEth
    ) public view returns (uint256);

    function calculateBurnReturn(
        uint256 supply,
        uint256 balancePool,
        uint256 reserveWeight,
        uint256 amountToken
    ) public view returns (uint256);
}