pragma solidity ^0.8.0;

import "./Power.sol";
import "./MeToken.sol";


contract Curve is Power {

    uint256 public MAX_WEIGHT = 1000000;

    constructor() {}

    /*
    @notice calculates how many tokens can be minted when current token supply = 0
    a = y / (x ^ (1/r - 1))   *   Collateral ^ (1/r - 1)
    */

    function calculateMintReturnFromZero(
        uint256 base_X,
        uint256 base_Y,
        uint256 reserveWeight,
        uint256 amountEth
    ) public view returns (uint256 amountMinted) {
        
    }

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
}