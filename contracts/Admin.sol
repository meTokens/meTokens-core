pragma solidity ^0.8.0;

contract Admin {
    
    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    event SetMintFee(uint256 amount);
    event SetTransferFee(uint256 amount);
    event SetBurnFee(uint256 amount);
    event SetYieldFee(uint256 amount);
    event SetEarnFee(uint256 amount);

    uint256 private TRANSFERFEE_MIN = 0;
    uint256 private TRANSFERFEE_MAX = 10;
    uint256 private BURNFEE_MIN = 0;
    uint256 private BURNFEE_MAX = 10;
    uint256 private MINTFEE_MIN = 0;
    uint256 private MINTFEE_MAX = 10;
    uint256 private YIELDFEE_MIN = 0;
    uint256 private YIELDFEE_MAX = 10;

    /// @dev for when a meToken is transferred
    uint256 private _transferFee;
    /// @dev for when a meToken is burned by non-owner
    uint256 private _burnFee;
    /// @dev for when a meToken is burned by owner
    uint256 private _earnFee;
    /// @dev for when a meToken is minted
    uint256 private _mintFee;
    /// @dev for when a meToken is first created
    uint256 private _initializeFee;
    /// @dev for when balanceLocked/balancePooled earns interest from other protocols
    uint256 private _yieldFee;

    uint256 public owner;

    constructor() {}

    function setMintFee(uint256 amount) external onlyOwner returns (uint256) {
        require(amount >= MINTFEE_MIN && amount <= MINTFEE_MAX, "out of range");
        _mintFee = amount;
        emit SetMintFee(amount);
        return amount;
    }

    function setTransferFee(uint256 amount) external onlyOwner returns (uint256) {
        require(amount >= TRANSFERFEE_MIN && amount <= TRANSFERFEE_MAX, "out of range");
        _transferFee = amount;
        emit SetTransferFee(amount);
        return amount;
    }

    function setBurnFee(uint256 amount) external onlyOwner returns (uint256) {
        require(amount >= BURNFEE_MIN && amount <= BURNFEE_MAX, "out of range");
        _burnFee = amount;
        emit SetBurnFee(amount);
        return amount;
    }

    function setInitializeFee(uint256 amount) external onlyOwner returns (uint256) {
        require(amount >= INITIALIZEFEE_MIN && amount <= INITIALIZEFEE_MAX, "out of range");
        _initializeFee = amount;
        emit SetInitializeFee(amount);
        return amount;
    }

    function setYieldFee(uint256 amount) external onlyOwner returns (uint256) {
        require(amount >= YIELDFEE_MIN && amount <= YIELDFEE_MAX, "out of range");
        _yieldFee = amount;
        emit SetYieldFee(amount);
        return amount;
    }

    function setEarnFee(uint256 amount) external onlyOwner returns (uint256) {
        require(amount >= EARNFEE_MIN && amount <= EARNFEE_MAX, "out of range");
        _earnFee = amount;
        emit SetEarnFee(amount);
        return amount;
    }

    /// @dev for when a meToken is transferred
    function transferFee() external view returns (uint256) {
        return _transferFee;
    }
    /// @dev for when a meToken is burned by non-owner
    function burnFee() external view returns (uint256) {
        return _burnFee;
    }
    /// @dev for when a meToken is burned by owner
    function earnFee() external view returns (uint256) {
        return _earnFee;
    }
    /// @dev for when a meToken is minted
    function mintFee() external view returns (uint256) {
        return _mintFee;
    }
    /// @dev for when a meToken is first created
    function initializeFee() external view returns (uint256) {
        return _initializeFee;
    }
    /// @dev for when balanceLocked/balancePooled earns interest from other protocols
    function yieldFee() external view returns (uint256) {
        return _yieldFee;
    }

}