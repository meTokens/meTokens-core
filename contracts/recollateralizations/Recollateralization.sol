pragma solidity ^0.8.0;


contract Recollateralization {

    uint256 fromHub;
    uint256 toHub;

    address collateralTokenStart;
    address collateralTokenIntra;
    address collateralTokenEnd;

    constructor() {}

    function finish() public virtual {
        // send ending to new hub
    }

}