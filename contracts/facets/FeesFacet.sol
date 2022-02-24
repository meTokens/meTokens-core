// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {Modifiers} from "../libs/Details.sol";
import {IFees} from "../interfaces/IFees.sol";

contract FeesFacet is Modifiers, IFees {
    /// @inheritdoc IFees
    function setMintFee(uint256 rate) external override onlyFeesController {
        require(rate != s.mintFee && rate < s.PRECISION, "out of range");
        s.mintFee = rate;
        emit SetMintFee(rate);
    }

    /// @inheritdoc IFees
    function setBurnBuyerFee(uint256 rate)
        external
        override
        onlyFeesController
    {
        require(rate != s.burnBuyerFee && rate < s.PRECISION, "out of range");
        s.burnBuyerFee = rate;
        emit SetBurnBuyerFee(rate);
    }

    /// @inheritdoc IFees
    function setBurnOwnerFee(uint256 rate)
        external
        override
        onlyFeesController
    {
        require(rate != s.burnOwnerFee && rate < s.PRECISION, "out of range");
        s.burnOwnerFee = rate;
        emit SetBurnOwnerFee(rate);
    }

    /// @inheritdoc IFees
    function setTransferFee(uint256 rate) external override onlyFeesController {
        require(rate != s.transferFee && rate < s.PRECISION, "out of range");
        s.transferFee = rate;
        emit SetTransferFee(rate);
    }

    /// @inheritdoc IFees
    function setInterestFee(uint256 rate) external override onlyFeesController {
        require(rate != s.interestFee && rate < s.PRECISION, "out of range");
        s.interestFee = rate;
        emit SetInterestFee(rate);
    }

    /// @inheritdoc IFees
    function setYieldFee(uint256 rate) external override onlyFeesController {
        require(rate != s.yieldFee && rate < s.PRECISION, "out of range");
        s.yieldFee = rate;
        emit SetYieldFee(rate);
    }

    /// @inheritdoc IFees
    function mintFee() external view override returns (uint256) {
        return s.mintFee;
    }

    /// @inheritdoc IFees
    function burnBuyerFee() external view override returns (uint256) {
        return s.burnBuyerFee;
    }

    /// @inheritdoc IFees
    function burnOwnerFee() external view override returns (uint256) {
        return s.burnOwnerFee;
    }

    /// @inheritdoc IFees
    function transferFee() external view override returns (uint256) {
        return s.transferFee;
    }

    /// @inheritdoc IFees
    function interestFee() external view override returns (uint256) {
        return s.interestFee;
    }

    /// @inheritdoc IFees
    function yieldFee() external view override returns (uint256) {
        return s.yieldFee;
    }
}
