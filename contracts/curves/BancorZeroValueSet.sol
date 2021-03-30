// example of a contract `curves.libraryParameterSet` that can be registered in CurveRegistry.sol
// specifically paired with BancorFormulaFromZero.sol

import "./BancorZeroFormula.sol";


contract BancorZeroFormulaValues is BancorZeroFormula, CurveBase {

    event Updated(uint256 indexed hubId);

    // NOTE: keys will be the hubId
	mapping (uint256 => ValueSet) valueSets;
	mapping (uint256 => TargetValueSet) targetValueSets;

	function registerValueSet(
        uint256 _hubId, uint256 _base_x, uint256 _base_y, uint256 _reserveWeight
    ) public {
       require(_base_x > 0 && _base_y > 0, "_base_x and _base_y cannot be 0");
       require(_reserveWeight <= MAX_WEIGHT, "_reserveWeight cannot exceed MAX_WEIGHT");
       ValueSet storage valueSet = ValueSet(_base_x, _base_y, _reserveWeight, false, 0);
       valueSets[_hubId] = valueSet;
    }

    function deactivateValueSet(uint256 _hubId) public returns(uint256) {}
    
    // TODO: is this needed
    // function reactivateValueSet() {}

	function registerTargetValueSet() {}

    /**
     * if updating == true, then reference the curve's updater.sol to linearly calculate the new rate between startBlock & targetBlock
     * if updating == true and targetReached == true, then set updating == false
     * needs to reference hub.vault.balancePooled
     * needs to return both burnForOwner and burnForEveryoneElse values
    **/
    // TODO: fix calculateMintReturn arguments
    function calculateMintReturn(
        uint256 _hubId,
        uint256 _supply,
        uint256 _balancePooled,
        uint256 _depositAmount
    ) external view override returns (uint256 amount) {

        ValueSet memory v = valueSet[_hubId];
        if (_supply > 0) {
            amount = _calculateMintReturn(_supply, _balancePooled, _depositAmount, v.reserveWeight);
        } else {
            amount = _calculateMintReturnFromZero(v.base_x, v.base_y, _depositAmount, v.reserveWeight);
        }

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
        uint256 _hubId,
        uint256 _supply,
        uint256 _balancePooled,
        uint256 _sellAmount
    ) external view override returns (uint256 amount) {

        ValueSet memory v = valueSet[_hubId];
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
        TargetValueSet _t
    ) private returns (uint256 weightedAmount) {
        uint256 targetWeight;

       // Finish update if complete
        if (_t.blockTarget <= block.number) { 
            _finishUpdate(t);
            targetWeight = PRECISION;
        } else {
            uint256 targetProgress = block.number - _t.blockStart;
            uint256 targetLength = _t.blockTarget - _t.blockStart;
            // TODO: is this calculation right?
            targetWeight = PRECISION * targetProgress / targetLength;
        }

        // TODO: validate these calculations
        uint256 weighted_v = _amount * (PRECISION - targetWeight);
        uint256 weighted_t = _targetAmount * targetWeight;
        weightedAmount = weighted_v + weighted_t;
    }

    function _finishUpdate(uint256 _hubId) private {
        require(msg.sender == address(this));

        TargetValueSet memory t = targetValueSets[_hubId];
        ValueSet memory v = valueSets[_hubId];

        v.base_x = t.base_x;
        v.base_y = t.base_y;
        v.reserveWeight = t.reserveWeight;
        v.updating = false;

        emit Updated(v.hubId);
    }

}