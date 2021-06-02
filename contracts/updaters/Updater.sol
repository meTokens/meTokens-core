pragma solidity ^0.8.0;

contract Updater {

    struct UpdateDetails {
        bool reconfiguring;
        bool migrating;
        bool shifting;
        bool recollateralizing;
        uint256 startTime;
        uint256 endTime;
    }

    function getUpdateDetails(uint256 _hubId) external view returns (address) {}

    function getUpdateTimes(uint256 _hubId) external view returns (uint256, uint256) {}

    function getTargetCurve(uint256 _hubId) external view returns (address) {
        // TODO
    }

    function getTargetRefundRatio(uint256 _hubId) external view returns (uint256) {
        // TODO
    }



    // TODO: natspec
    function _calculateWeightedAmount(
        uint256 _amount,
        uint256 _targetAmount,
        uint256 _hubId,
        uint256 _startTime,
        uint256 _endTime
    ) private returns (uint256 weightedAmount) {
        uint256 targetWeight;

        if (block.timestamp > _endTime) { 
            // Finish update if complete
            _finishUpdate(_hubId);
            targetWeight = PRECISION;
        } else {
            uint256 targetProgress = block.timestamp - _startTime;
            uint256 targetLength = _endTime - _startTime;
            // TODO: is this calculation right?
            targetWeight = PRECISION * targetProgress / targetLength;
        }

        // TODO: validate these calculations
        uint256 weighted_v = _amount * (PRECISION - targetWeight);
        uint256 weighted_t = _targetAmount * targetWeight;
        weightedAmount = weighted_v + weighted_t;
    }

}