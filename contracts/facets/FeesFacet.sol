// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

import {Modifiers} from "../libs/LibAppStorage.sol";
import {IFeesFacet} from "../interfaces/IFeesFacet.sol";

contract FeesFacet is Modifiers, IFeesFacet {
    /// @inheritdoc IFeesFacet
    function setMintFee(uint256 rate) external override onlyFeesController {
        require(rate != s.mintFee && rate < s.PRECISION, "out of range");
        s.mintFee = rate;
        emit SetMintFee(rate);
    }

    /// @inheritdoc IFeesFacet
    function setBurnBuyerFee(uint256 rate)
        external
        override
        onlyFeesController
    {
        require(rate != s.burnBuyerFee && rate < s.PRECISION, "out of range");
        s.burnBuyerFee = rate;
        emit SetBurnBuyerFee(rate);
    }

    /// @inheritdoc IFeesFacet
    function setBurnOwnerFee(uint256 rate)
        external
        override
        onlyFeesController
    {
        require(rate != s.burnOwnerFee && rate < s.PRECISION, "out of range");
        s.burnOwnerFee = rate;
        emit SetBurnOwnerFee(rate);
    }

    /// @inheritdoc IFeesFacet
    function setTransferFee(uint256 rate) external override onlyFeesController {
        require(rate != s.transferFee && rate < s.PRECISION, "out of range");
        s.transferFee = rate;
        emit SetTransferFee(rate);
    }

    /// @inheritdoc IFeesFacet
    function setInterestFee(uint256 rate) external override onlyFeesController {
        require(rate != s.interestFee && rate < s.PRECISION, "out of range");
        s.interestFee = rate;
        emit SetInterestFee(rate);
    }

    /// @inheritdoc IFeesFacet
    function setYieldFee(uint256 rate) external override onlyFeesController {
        require(rate != s.yieldFee && rate < s.PRECISION, "out of range");
        s.yieldFee = rate;
        emit SetYieldFee(rate);
    }

    /// @inheritdoc IFeesFacet
    function mintFee() external view override returns (uint256) {
        return s.mintFee;
    }

    /// @inheritdoc IFeesFacet
    function burnBuyerFee() external view override returns (uint256) {
        return s.burnBuyerFee;
    }

    /// @inheritdoc IFeesFacet
    function burnOwnerFee() external view override returns (uint256) {
        return s.burnOwnerFee;
    }

    /// @inheritdoc IFeesFacet
    function transferFee() external view override returns (uint256) {
        return s.transferFee;
    }

    /// @inheritdoc IFeesFacet
    function interestFee() external view override returns (uint256) {
        return s.interestFee;
    }

    /// @inheritdoc IFeesFacet
    function yieldFee() external view override returns (uint256) {
        return s.yieldFee;
    }
}
