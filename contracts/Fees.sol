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
	uint256 public mintFee;
	/// @dev for when a meToken is burned by non-owner
	uint256 public burnBuyerFee;
	/// @dev for when a meToken is burned by owner
	uint256 public burnOwnerFee;
    /// @dev for when a meToken is transferred
	uint256 public transferFee;
    /// @dev Generated from interest on collateral
    uint256 public interestFee;
    /// @dev Generated from liquidity mining
	uint256 public yieldFee;

    address public owner;
	address public feeRecipient;

	constructor(
        address _owner,
        uint256 _mintFee
        uint256 _burnBuyerFee
        uint256 _burnOwnerFee
        uint256 _transferFee
        uint256 _interestFee
        uint256 _yieldFee
    ) public {
        owner = _owner;
        mintFee = _mintFee;
        burnBuyerFee = _burnBuyerFee;
        burnOwnerFee = _burnOwnerFee;
        transferFee = _transferFee;
        interestFee = _interestFee;
        yieldFee = _yieldFee;
    }

	function setMintFee(uint256 amount) external onlyOwner {
        require(amount != mintFee && amount < FEE_MAX, "out of range");
		mintFee = amount;
		emit SetMintFee(amount);
	}

	function setBurnBuyerFee(uint256 amount) external onlyOwner {
        require(amount != burnBuyerFee && amount < FEE_MAX, "out of range");
		burnBuyerFee = amount;
		emit SetBurnBuyerFee(amount);
	}

	function setBurnOwnerFee(uint256 amount) external onlyOwner {
        require(amount != burnOwnerFee && amount < FEE_MAX, "out of range");
		burnOwnerFee = amount;
		emit SetBurnOwnerFee(amount);
	}

    function setTransferFee(uint256 amount) external onlyOwner {
        require(amount != burnOwnerFee && amount < FEE_MAX, "out of range");
		transferFee = amount;
		emit SetTransferFee(amount);
	}

    function setInterestFee(uint256 amount) external onlyOwner {
        require(amount != interestFee && amount < FEE_MAX, "out of range");
		interestFee = amount;
		emit SetInterestFee(amount);
	}

    function setYieldFee(uint256 amount) external onlyOwner {
        require(amount != yieldFee && amount < FEE_MAX, "out of range");
		yieldFee = amount;
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

}
