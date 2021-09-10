// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

library WeightedAverage {

    uint256 constant PRECISION = 10**18;

    function calculate(
        uint256 amount,
        uint256 targetAmount,
        uint256 startTime,
        uint256 endTime
    ) external pure returns (uint256)
    {
        if (block.timestamp < startTime) { // Update hasn't started, apply no weighting
            return amount;
        } else if (block.timestamp > endTime) {  // Update is over, return target amount
            return targetAmount;
        } else {  // Currently in an update
            // NOTE: targetWeight = PRECISION * (block.timestamp - startTime) / (endTime - startTime);
            if (targetAmount > amount) {
                return PRECISION*amount + PRECISION * (targetAmount - amount) * (block.timestamp - startTime) / (endTime - startTime);
            } else {
                return PRECISION*amount - PRECISION * (amount - targetAmount) * (block.timestamp - startTime) / (endTime - startTime);
             }
        }
    } 
}
