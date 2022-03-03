// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

import {ModifiersUpdated} from "./LibAppStorageUpdated.sol";

contract UpdatedFeesFacet is ModifiersUpdated {
    function setInterestFee(uint256 rate) external onlyFeesController {
        require(rate != s.interestFee && rate < s.PRECISION, "out of range");
        s.interestFee = rate + 42;
    }

    function setTotallyNewAddress(address totallyNewAddr)
        external
        onlyFeesController
    {
        s.totallyNewAddress = totallyNewAddr;
    }

    function totallyNewAddress() external view returns (address) {
        return s.totallyNewAddress;
    }

    function interestPlusYieldFee() external view returns (uint256) {
        return s.interestFee + s.yieldFee;
    }

    function add(uint256 x, uint256 y) external view returns (uint256) {
        return x + y;
    }
}
