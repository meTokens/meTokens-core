pragma solidity ^0.8.0;

import "./BancorZeroFormula.sol";

// example of a contract `curves.libraryParameterSet` that can be registered in CurveRegistry.sol
// specifically paired with BancorFormulaFromZero.sol

/// @title Bancor curve registry and calculator
/// @author Carl Farterson (@carlfarterson)
/// @notice Uses BancorZeroFormula.sol for private methods
contract BancorZeroFormulaValues is BancorZeroFormula {

    // NOTE: each valueSet is for a curve
    struct ValueSet {
		uint256 base_x;
		uint256 base_y;
		uint256 reserveWeight;
	}

    event Updated(uint256 indexed hub);

    // NOTE: keys will be the hub
	mapping (uint256 => ValueSet) private valueSets;
	mapping (uint256 => TargetValueSet) private targetValueSets;

	function registerValueSet(
        uint256 _hub,
        uint256 _base_x,
        uint256 _base_y,
        uint256 _reserveWeight
    ) external virtual override {
        
       require(_base_x > 0 && _base_y > 0, "_base_x and _base_y cannot be 0");
       require(_reserveWeight <= MAX_WEIGHT, "_reserveWeight cannot exceed MAX_WEIGHT");
       ValueSet storage valueSet = ValueSet(_base_x, _base_y, _reserveWeight, false, 0);
       valueSets[_hub] = valueSet;
    }

    function deactivateValueSet(uint256 _hub) public returns(uint256) {}
    
    // TODO: is this needed
    // function reactivateValueSet() {}


    /**
     * if updating == true, then reference the curve's updater.sol to linearly calculate the new rate between startBlock & targetBlock
     * if updating == true and targetReached == true, then set updating == false
     * needs to reference hub.vault.balancePooled
     * needs to return both burnForOwner and burnForEveryoneElse values
    **/
    // TODO: fix calculateMintReturn arguments
    function calculateMintReturn(
        uint256 _hub,
        uint256 _supply,
        uint256 _balancePooled,
        uint256 _depositAmount
    ) external view override returns (uint256 amount) {

        ValueSet memory v = valueSets[_hub];
        if (_supply > 0) {
            amount = _calculateMintReturn(_supply, _balancePooled, _depositAmount, v.reserveWeight);
        } else {
            amount = _calculateMintReturnFromZero(v.base_x, v.base_y, _depositAmount, v.reserveWeight);
        }

        // TODO: Since updating was moved to hub, need to bring this o
        if (v.updating) {
            // Calculate return using weights
            TargetValueSet memory t = targetValueSets[v.targetValueSetId];
            if (_supply > 0) {
                uint256 targetAmount = _calculateMintReturn(_supply, _balancePooled, _depositAmount, t.reserveWeight);
            } else {
                uint256 targetAmount = _calculateMintReturnFromZero(t.base_x, t.base_y, _depositAmount, t.reserveWeight);
            }
            amount = _calculateWeightedAmount(amount, targetAmount, t);
        }
    }

    // TODO: _calculateBurnReturn arguments
    function calculateBurnReturn(
        uint256 _hub,
        uint256 _supply,
        uint256 _balancePooled,
        uint256 _sellAmount
    ) external view override returns (uint256 amount) {

        ValueSet memory v = valueSets[_hub];
        amount = _calculateBurnReturn(_supply, _balancePooled, _sellAmount, v.reserveWeight);
        
        if (v.updating) {
            // Calculate return using weights
            TargetValueSet memory t = targetValueSets[v.targetValueSetId];
            uint256 targetAmount = _calculateBurnReturn(_supply, _balancePooled, _sellAmount, t.reserveWeight);
            amount = _calculateWeightedAmount(amount, targetAmount, t);
        }
    }

    function _calculateWeightedAmount(
        uint256 _amount,
        uint256 _targetAmount,
        Curve curve
    ) private returns (uint256 weightedAmount) {
        uint256 targetWeight;

       // Finish update if complete
        if (targetValueSet.blockTarget <= block.number) { 
            _finishUpdate(t);
            targetWeight = PRECISION;
        } else {
            uint256 targetProgress = block.number - targetValueSet.blockStart;
            uint256 targetLength = targetValueSet.blockTarget - targetValueSet.blockStart;
            // TODO: is this calculation right?
            targetWeight = PRECISION * targetProgress / targetLength;
        }

        // TODO: validate these calculations
        uint256 weighted_v = _amount * (PRECISION - targetWeight);
        uint256 weighted_t = _targetAmount * targetWeight;
        weightedAmount = weighted_v + weighted_t;
    }

    function _finishUpdate(uint256 _hub) private {
        require(msg.sender == address(this));

        TargetValueSet memory t = targetValueSets[_hub];
        ValueSet memory v = valueSets[_hub];

        v.base_x = t.base_x;
        v.base_y = t.base_y;
        v.reserveWeight = t.reserveWeight;
        v.updating = false;

        emit Updated(v.hub);
    }

    function getValueSetCount() external view returns (uint256) {
        return valueSetCount;
    }

}


/*
struct TargetValueSet {
    uint base_x;
    uint base_y;
    uint256 reserveWeight;

    uint256 blockStart;
    uint256 blockTarget;
    bool targetReached;
}
*/