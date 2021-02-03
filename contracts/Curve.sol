pragma solidity ^0.8.0;

import "./Power.sol";

contract Curve {

    uint256 public PRECISION = 10**18;
    uint256 public MAX_RATIO = 1000000;
    // TODO: make percent / divisor upgradeable
    uint256 public PERCENT = 25;
    uint256 public DIVISOR = 1000;

    // NOTE: 

    function calculateMintReturn(
        uint256 supply,
        uint256 balancePool,
        uint256 balanceLocked,
        uint32 reserveRatio,
        uint256 amountEth
    ) returns (uint256) {
        // Bancor.calculatePurchaseReturn()
        require(reserveRatio > 0);
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
        return amountEth * PERCENT / DIVISOR;
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
        uint256 poolBalance
    ) {
        // Exponent parameter (n) = 1 / reserveRatio - 1
        // Slope (m) = (poolBalance * (n + 1)) / (totalSupply ^ (n + 1))
        n = 1 / reserveRatio - 1;
        num = poolBalance * (n + 1);
        denom = supply 


        // slope = collateral / (CW * tokenSupply ^ (1 / CW))
        // CW = connecter weight aka reserveRatio
    }
}