pragma solidity ^0.8.0;

import "./Curve.sol";

contract Hub is Curve {

    event Donated(address indexed donor, uint256 indexed amount);

    uint256 private PERCENT = 25;
    uint256 private DIVISOR = 10000;
    uint256 private MAX_WEIGHT = 1000000;
    
    address public owner;
    uint256 public base_X;
    uint256 public base_Y;
    // TODO: What will these balances be on initialization?
    uint256 public balancePooled;
    uint256 public balanceLocked;
    uint256 public reserveWeight;
    uint256 public refundRatio;  
    bool private initialized;

    constructor() {}

    function initialize(
        address _owner,
        uint256 _base_X,
        uint256 _base_Y,
        uint256 _balancePooled,
        uint256 _balanceLocked,
        uint256 _reserveWeight,
        uint256 _refundRatio
    ) external {
        require(!initialized, "initialize: already initialized");
        require(_reserveWeight > 0 && _reserveWeight <= MAX_WEIGHT && _base_X > 0 && _base_Y > 0, "initialize: invalid param");
        owner = _owner;
        base_X = _base_X;
        base_Y = _base_Y;
        balancePooled = _balancePooled;
        balanceLocked = _balanceLocked;
        reserveWeight = _reserveWeight;
        refundRatio = _refundRatio;

        initialized = true;
    }

    function mintMeToken() public payable{
        uint256 totalEth = msg.value;
    }

    function burnMeToken(uint256 _amount) public payable {

    }

    function donate() public payable {
        lockedBalance = lockedBalance + msg.value;
        emit Donated(msg.sender, msg.value);
    }

    /// @notice calculateFee is used to calculate the fee earned by the StakeOnMe Development Team whenever a MeToken Purchase or sale occurs throught contract
    function calculateFee(uint256 amountEth) returns (uint256) {
        return amountEth * percent / PRECISION;
    }

    /// @notice calculateLockedReturn is used to calculate the amount of locked Eth returned to the owner during a burn/spend
    function calculateLockedReturn(uint256 amountToken, uint256 lockedBalance, uint256 supply) returns (uint256) {
        return amountToken * lockedBalance / supply;
    }

}