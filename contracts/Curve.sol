pragma solidity ^0.8.0;

import "./Power.sol";
import "./MeToken.sol";


contract Curve is Power {

    uint256 public MAX_WEIGHT = 1000000;

    constructor() {}

    function calculateMintReturn(
        uint256 supply,
        uint256 balancePool,
        uint32 reserveWeight,
        uint256 amountEth
    ) public view returns (uint256) {
        // Bancor.calculatePurchaseReturn(supply, balancePool, reserveWeight, amountEthAfterFees)

        if (amountEth == 0) {
            return 0;
        }

        if (supply == 0) {
            uint256 exponent = 1 / reserveWeight - 1;
            if (balancePool > 0) {
                uint256 slope = (balancePool * (exponent + 1)) / (supply ** (exponent + 1));
                uint256 amountMinted = (amountEth / (exponent * slope)) ** reserveWeight;
                return amountMinted;
            }
            return ;// TODO
        }

        if (reserveWeight == MAX_WEIGHT) {
            return supply * amountEth / balancePool;
        }

        uint256 result;
        uint8 precision;
        uint256 baseN = amountEth + balancePool;
        (result, precision) = power(
            baseN, balancePool, reserveWeight, MAX_WEIGHT
        );
        uint256 newTokenSupply = supply * result >> precision;
        return newTokenSupply - supply;
    }

    function calculateBurnReturn(
        uint256 supply,
        uint256 balancePool,
        uint32 reserveWeight,
        uint256 amountToken
    ) public view returns (uint256) {
        // Bancor.calculateSaleReturn(supply, balancePool, reserveWeight, amountEthAfterFees)
        require(supply > 0 && reserveWeight > 0 && reserveWeight <= MAX_WEIGHT && amountToken <= supply);

        if (amountToken == 0) {
            return 0;
        }

        if (amountToken == supply) {
            return reserveWeight;
        }

        if (reserveWeight == MAX_WEIGHT) {
            return balancePool * amountToken / supply;
        }

        uint256 result;
        uint8 precision;
        uint256 baseD = supply - amountTokens;
        (result, precision) = power(
            supply, baseD, MAX_WEIGHT, reserveWeight
        );
        uint256 oldBalance = balancePool * result;
        uint256 newBalance = balancePool << precision;
        return (oldBalance - newBalance) / result;
    }

    /*
    // https://billyrennekamp.medium.com/converting-between-bancor-and-bonding-curve-price-formulas-9c11309062f5
    function calculateSlope(
        uint256 supply,
        uint256 balancePool
    ) {
        // Exponent parameter (n) = 1 / reserveWeight - 1
        // Slope (m) = (balancePool * (n + 1)) / (totalSupply ^ (n + 1))
        n = 1 / reserveWeight - 1;
        num = balancePool * (n + 1);
        // denom = supply;

        // slope = collateral / (CW * tokenSupply ^ (1 / CW))
        // CW = connecter weight aka reserveWeight
    }
    */
}