pragma solidity ^0.8.0;

interface I_ValueSet {

    function registerValueSet(
        uint256 _hub,
        bytes32 _encodedValueSet
    ) external;

    function calculateMintReturn(
        uint256 _depositAmount,
        uint256 _hub,
        uint256 _supply,
        uint256 _balancePooled
    ) external view returns (uint256 amount);

    function calculateBurnReturn(
        uint256 _sellAmount,
        uint256 _hub,
        uint256 _supply,
        uint256 _balancePooled
    ) external view returns (uint256 amount);

}
