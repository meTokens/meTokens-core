// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {AppStorage} from "../libs/Details.sol";

contract FeesFacet {
    event SetMintFee(uint256 rate);
    event SetBurnBuyerFee(uint256 rate);
    event SetBurnOwnerFee(uint256 rate);
    event SetTransferFee(uint256 rate);
    event SetInterestFee(uint256 rate);
    event SetYieldFee(uint256 rate);

    AppStorage internal s; // solhint-disable-line

    // TODO: access control on this shiz
    function setMintFee(uint256 rate) external {
        require(rate != s.mintFee && rate < s.PRECISION, "out of range");
        s.mintFee = rate;
        emit SetMintFee(rate);
    }

    function setBurnBuyerFee(uint256 rate) external {
        require(rate != s.burnBuyerFee && rate < s.PRECISION, "out of range");
        s.burnBuyerFee = rate;
        emit SetBurnBuyerFee(rate);
    }

    function setBurnOwnerFee(uint256 rate) external {
        require(rate != s.burnOwnerFee && rate < s.PRECISION, "out of range");
        s.burnOwnerFee = rate;
        emit SetBurnOwnerFee(rate);
    }

    function setTransferFee(uint256 rate) external {
        require(rate != s.transferFee && rate < s.PRECISION, "out of range");
        s.transferFee = rate;
        emit SetTransferFee(rate);
    }

    function setInterestFee(uint256 rate) external {
        require(rate != s.interestFee && rate < s.PRECISION, "out of range");
        s.interestFee = rate;
        emit SetInterestFee(rate);
    }

    function setYieldFee(uint256 rate) external {
        require(rate != s.yieldFee && rate < s.PRECISION, "out of range");
        s.yieldFee = rate;
        emit SetYieldFee(rate);
    }

    function mintFee() public view returns (uint256) {
        return s.mintFee;
    }

    function burnBuyerFee() public view returns (uint256) {
        return s.burnBuyerFee;
    }

    function burnOwnerFee() public view returns (uint256) {
        return s.burnOwnerFee;
    }

    function transferFee() public view returns (uint256) {
        return s.transferFee;
    }

    function interestFee() public view returns (uint256) {
        return s.interestFee;
    }

    function yieldFee() public view returns (uint256) {
        return s.yieldFee;
    }
}
