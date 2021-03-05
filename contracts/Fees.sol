pragma solidity ^0.8.0;

contract Fees {

	modifier onlyOwner() {
		require(msg.sender == owner);
		_;
	}

	event NewFee(string feeName, uint256 feeId, uint256 rate);
	event DeactivateFee(string feeName, uint256 feeId);
	event ReactivateFee(string feeName, uint256 feeId);
	event SetMintFee(uint256 rate);
	event SetBurnFee(uint256 rate);
	event SetEarnFee(uint256 rate);
	event SetOtherFee(string feeName, uint256 feeId, uint256 rate);

	/// @dev for when a meToken is minted
	uint256 private _mintFee;
	/// @dev for when a meToken is burned by non-owner
	uint256 private _burnFee;
	/// @dev for when a meToken is burned by owner
	uint256 private _earnFee;

	uint256 private MINTFEE_MIN = 0;
	uint256 private MINTFEE_MAX = 10;
	uint256 private BURNFEE_MIN = 0;
	uint256 private BURNFEE_MAX = 10;
	uint256 private EARNFEE_MIN = 0;
	uint256 private EARNFEE_MAX = 10;

	address public owner;

	uint256 feeCount;
	mapping (uint256 => Fee) fees;
	
	struct Fee {
		string feeName;
		uint256 rate;
		uint256 min;
		uint256 max;
		bool active;
	}

	constructor(){}

	/// @dev to create a new type of fee for future vaults
	function registerFee(string _feeName, uint256 _rate, uint256 _min, uint256 _max){
		Fee memory f = fees[feeCount];
		f.feeName = _feeName;
		f.rate = _rate;
		f.min = _min;
		f.max = _max;
		f.active = true;
		emit NewFee (_feeName, feeCount _rate);
		feeCount++;
	}

	function deactivateFee(uint256 _feeId){
		Fee memory f = fees[_feeId];
		f.active = false;
		emit DeactivateFee(_feeName _feeId)
	}

	function reactivateFee(uint256 _feeId){
		Fee memory f = fees[_feeId];
		f.active = true;
		emit ReactivateFee(_feeName _feeId)
	}

	function setMintFee(uint256 amount) external onlyOwner returns (uint256) {
		require(amount >= MINTFEE_MIN && amount <= MINTFEE_MAX, "out of range");
		_mintFee = amount;
		emit SetMintFee(amount);
		return amount;
	}

	function setBurnFee(uint256 amount) external onlyOwner returns (uint256) {
		require(amount >= BURNFEE_MIN && amount <= BURNFEE_MAX, "out of range");
		_burnFee = amount;
		emit SetBurnFee(amount);
		return amount;
	}

	function setEarnFee(uint256 amount) external onlyOwner returns (uint256) {
		require(amount >= EARNFEE_MIN && amount <= EARNFEE_MAX, "out of range");
		_transferFee = amount;
		emit SetTransferFee(amount);
		return amount;
	}

	// TODO: complete logic
	function setOtherFee(uint256 amount) {

		emit setOtherFee(amount);
	}

	/// @dev for when a meToken is minted
	function mintFee() external view returns (uint256) {
		return _mintFee;
	}
	/// @dev for when a meToken is burned by non-owner
	function burnFee() external view returns (uint256) {
		return _burnFee;
	}
	/// @dev for when a meToken is burned by owner
	function earnFee() external view returns (uint256) {
		return _earnFee;
	}
	function otherFee(uint256 _feeId) external view returns (uint256) {
		Fee memory f = fees[_feeId];
		require(f.active);
		return f.rate;
	}
}
