pragma solidity ^0.8.0;

contract Fees {

    // NOTE: this will be the DAO
	modifier onlyOwner() {
		require(msg.sender == owner);
		_;
	}

	event SetMintFee(uint256 rate);
	event SetBurnBuyerFee(uint256 rate);
	event SetBurnOwnerFee(uint256 rate);
    event SetTransferFee(uint256 rate);
    event SetInterestFee(uint256 rate);
    event SetYieldFee(uint256 rate);
    event SetOwner(address owner);
	event SetFeeRecipient(address recipient);

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

    address public owner;
	address public feeRecipient;

	constructor(
        address owner_,
        uint256 mintFee_
        uint256 burnBuyerFee_
        uint256 burnOwnerFee_
        uint256 transferFee_
        uint256 interestFee_
        uint256 yieldFee_
    ) public {
        owner = owner_;
        _mintFee = mintFee_;
        _burnBuyerFee = burnBuyerFee_;
        _burnOwnerFee = burnOwnerFee_;
        _transferFee = transferFee_;
        _interestFee = interestFee_;
        _yieldFee = yieldFee_;
    }

	function setMintFee(uint256 amount) external onlyOwner {
        require(amount != _mintFee && amount < FEE_MAX, "out of range");
		_mintFee = amount;
		emit SetMintFee(amount);
	}

	function setBurnBuyerFee(uint256 amount) external onlyOwner {
        require(amount != _burnBuyerFee && amount < FEE_MAX, "out of range");
		_burnBuyerFee = amount;
		emit SetBurnBuyerFee(amount);
	}

	function setBurnOwnerFee(uint256 amount) external onlyOwner {
        require(amount != _burnOwnerFee && amount < FEE_MAX, "out of range");
		_burnOwnerFee = amount;
		emit SetBurnOwnerFee(amount);
	}

    function setTransferFee(uint256 amount) external onlyOwner {
        require(amount != _burnOwnerFee && amount < FEE_MAX, "out of range");
		_transferFee = amount;
		emit SetTransferFee(amount);
	}

    function setInterestFee(uint256 amount) external onlyOwner {
        require(amount != _interestFee && amount < FEE_MAX, "out of range");
		_interestFee = amount;
		emit SetInterestFee(amount);
	}

    function setYieldFee(uint256 amount) external onlyOwner {
        require(amount != _yieldFee && amount < FEE_MAX, "out of range");
		_yieldFee = amount;
		emit SetYieldFee(amount);
	}

    function setOwner(address _owner) external onlyOwner {
        require(_owner != owner, "_owner == owner");
        owner = _owner;
        emit SetOwner(_owner);
    }

	function setFeeRecipient(address _recipient) onlyOwner {
        require(feeRecipient != _recipient, "feeRecipient == _recipient");
		feeRecipient = _recipient;
		emit SetFeeRecipient(_recipient);
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
