// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";


/// @title meToken Fees
/// @author Carl Farterson (@carlfarterson)
/// @notice contract to manage all meToken fees
contract Fees is Ownable {

	event SetMintFee(uint256 rate);
	event SetBurnBuyerFee(uint256 rate);
	event SetBurnOwnerFee(uint256 rate);
    event SetTransferFee(uint256 rate);
    event SetInterestFee(uint256 rate);
    event SetYieldFee(uint256 rate);

    uint256 private FEE_MAX = 10**18;
	/// @dev for when a meToken is minted
	uint256 private _mintFee;
	/// @dev for when a meToken is burned by non-owner
	uint256 private _burnBuyerFee;
	/// @dev for when a meToken is burned by owner
	uint256 private _burnOwnerFee;
    /// @dev for when a meToken is transferred
	uint256 private _transferFee;
    /// @dev Generated from interest on collateral
    uint256 private _interestFee;
    /// @dev Generated from liquidity mining
	uint256 private _yieldFee;

	constructor() {}

    function init(
        uint256 mintFee_,
        uint256 burnBuyerFee_,
        uint256 burnOwnerFee_,
        uint256 transferFee_,
        uint256 interestFee_,
        uint256 yieldFee_
    ) external onlyOwner {
        _mintFee = mintFee_;
        _burnBuyerFee = burnBuyerFee_;
        _burnOwnerFee = burnOwnerFee_;
        _transferFee = transferFee_;
        _interestFee = interestFee_;
        _yieldFee = yieldFee_;
    }

	function setMintFee(uint256 rate) external onlyOwner {
        require(rate != _mintFee && rate < FEE_MAX, "out of range");
		_mintFee = rate;
		emit SetMintFee(rate);
	}

	function setBurnBuyerFee(uint256 rate) external onlyOwner {
        require(rate != _burnBuyerFee && rate < FEE_MAX, "out of range");
		_burnBuyerFee = rate;
		emit SetBurnBuyerFee(rate);
	}

	function setBurnOwnerFee(uint256 rate) external onlyOwner {
        require(rate != _burnOwnerFee && rate < FEE_MAX, "out of range");
		_burnOwnerFee = rate;
		emit SetBurnOwnerFee(rate);
	}

    function setTransferFee(uint256 rate) external onlyOwner {
        require(rate != _burnOwnerFee && rate < FEE_MAX, "out of range");
		_transferFee = rate;
		emit SetTransferFee(rate);
	}

    function setInterestFee(uint256 rate) external onlyOwner {
        require(rate != _interestFee && rate < FEE_MAX, "out of range");
		_interestFee = rate;
		emit SetInterestFee(rate);
	}

    function setYieldFee(uint256 rate) external onlyOwner {
        require(rate != _yieldFee && rate < FEE_MAX, "out of range");
		_yieldFee = rate;
		emit SetYieldFee(rate);
	}

    function mintFee() public view returns (uint256) {
        return _mintFee;
    }

    function burnBuyerFee() public view returns (uint256) {
        return _burnBuyerFee;
    }

    function burnOwnerFee() public view returns (uint256) {
        return _burnOwnerFee;
    }

    function transferFee() public view returns (uint256) {
        return _transferFee;
    }

    function interestFee() public view returns (uint256) {
        return _interestFee;
    }

    function yieldFee() public view returns (uint256) {
        return _yieldFee;
    }

}