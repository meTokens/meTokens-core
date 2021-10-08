// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;
import "../utils/Power.sol";

/*
    BancorFormula test helper that exposes some BancorFormula functions
*/
contract PowerMock is Power {
    constructor() {}

    function generalExpTest(uint256 _x, uint8 _precision)
        public
        pure
        returns (uint256)
    {
        return generalExp(_x, _precision);
    }

    function findPositionInMaxExpArrayTest(uint256 _x)
        public
        view
        returns (uint8)
    {
        return findPositionInMaxExpArray(_x);
    }

    function floorLog2Test(uint256 _n) public pure returns (uint8) {
        return floorLog2(_n);
    }
}
