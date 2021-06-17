pragma solidity ^0.8.0;

library WeightedAverage {

    uint256 constant PRECISION = 10**18;

    function calculate(
        uint256 amount,
        uint256 targetAmount,
        uint256 startTime,
        uint256 currentTime,
        uint256 endTime
    ) external pure returns (uint256)
    {
        uint256 targetWeight;

        if (currentTime < startTime) {
            targetWeight = 0;
        } else if (currentTime > endTime) {
            targetWeight = PRECISION;
        } else {
            uint256 targetProgress = currentTime - startTime;
            uint256 targetLength = endTime - startTime;
            targetWeight = PRECISION * targetProgress / targetLength;
        }
        uint256 amountWeighted = amount * (PRECISION - targetWeight);
        uint256 targetAmountWeighted = targetAmount * targetWeight;
        return amountWeighted + targetAmountWeighted;
    } 
}