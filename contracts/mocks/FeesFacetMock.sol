// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

import {ModifiersMock} from "./LibAppStorageMock.sol";

contract FeesFacetMock is ModifiersMock {
    function setMintFee(uint256 rate) external onlyFeesController {
        s.mintFee = rate + 42;
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

    function mintPlusBurnBuyerFee() external view returns (uint256) {
        return s.mintFee + s.burnBuyerFee;
    }

    function add(uint256 x, uint256 y) external pure returns (uint256) {
        return x + y;
    }
}
