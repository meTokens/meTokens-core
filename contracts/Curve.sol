pragma solidity ^0.8.0;

import "./Power.sol";

contract Curve {

    uint256 public PRECISION = 10**18;
    uint256 public MAX_RATIO = 1000000;
    address public owner;
    uint256 public percent;

    constructor(address _owner, uint256 _percent) {
        owner = _owner;
        percent = percent;
    }

    function calculateMintReturn(
        uint256 supply,
        uint256 balancePool,
        uint256 balanceLocked,
        uint32 reserveRatio,
        uint256 amountEth
    ) returns (uint256) {
        // Bancor.calculatePurchaseReturn(supply, balancePool, reserveRatio, amountEthAfterFees)
        // require(reserveRatio > 0);
        uint256 fee = calculateFee(amountEth);
        uint256 amountEthAfterFee = amountEth - fee;

        if (supply > 0) {

        } else {
            // supply = 0, special case 
        }
    }

    function calculateBurnReturn(
        uint256 supply,
        uint256 balancePool,
        uint256 balanceLocked,
        uint32 reserveRatio,
        uint256 amountToken
    ) returns (uint256) {

    }

    /// @notice calculateFee is used to calculate the fee earned by the StakeOnMe Development Team whenever a MeToken Purchase or sale occurs throught contract
    function calculateFee(uint256 amountEth) returns (uint256) {
        return amountEth * percent / PRECISION;
    }

    /// @notice calculateLockedReturn is used to calculate the amount of locked Eth returned to the owner during a burn/spend
    function calculateLockedReturn(uint256 amountToken, uint256 lockedBalance, uint256 supply) returns (uint256) {
        return amountToken * lockedBalance / supply
    }

    function calculatePrice(
        uint32 reserveRatio
    ) {

    }

    // https://billyrennekamp.medium.com/converting-between-bancor-and-bonding-curve-price-formulas-9c11309062f5
    function calculateSlope(
        uint256 supply,
        uint256 balancePool
    ) {
        // Exponent parameter (n) = 1 / reserveRatio - 1
        // Slope (m) = (balancePool * (n + 1)) / (totalSupply ^ (n + 1))
        n = 1 / reserveRatio - 1;
        num = balancePool * (n + 1);
        // denom = supply;

        // slope = collateral / (CW * tokenSupply ^ (1 / CW))
        // CW = connecter weight aka reserveRatio
    }

    function updatePercent(uint256 _percent) {
        require(msg.sender == owner);
        percent = _percent;
    }

}