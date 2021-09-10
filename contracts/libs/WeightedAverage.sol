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
        uint256 targetWeight;

        if (block.timestamp < startTime) { // Update hasn't started, apply no weighting
            targetWeight = 0;
        } else if (block.timestamp > endTime) {  // Update is over
            targetWeight = PRECISION;
        } else {  // Currently in an update
            targetWeight = PRECISION * (block.timestamp - startTime) / (endTime - startTime);
        }
        // amountWeighted = amount * (PRECISION - targetWeight), targetAmountWeighted = targetAmount * targetWeight;
        return amount*(PRECISION - targetWeight) + targetAmount*targetWeight;
    } 
}
