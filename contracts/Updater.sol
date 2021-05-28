pragma solidity ^0.8.0;

contract Updater {

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


    // TODO: natspec
    function _finishUpdate(uint256 _hubId) private {

        ValueSet storage v = valueSets[_hubId];
        TargetValueSet storage t = targetValueSets[_hubId];

        v.base_x = t.base_x;
        v.base_y = t.base_y;
        v.reserveWeight = t.reserveWeight;
        v.updating = false;

        delete(t);

        emit Updated(_hubId);
    }

}