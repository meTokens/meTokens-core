// example of a contract `CurveOption.libraryParameterSet` that can be registered in CurveRegistry.sol
// specifically paired with BancorFormulaFromZero.sol

import "../CurveFormulas/BancorZeroFormula.sol";

contract BancorZeroFormulaValues is BancorZeroFormula {

    uint256 private PRECISION = 10**18;

    event Updated(uint256 indexed hubId);

	mapping (uint => ValueSet) valueSets;
	
    // NOTE: each valueSet is for a hub
	struct ValueSet {
		address hubId; // the hub that uses this parameter set
		uint base_x;
		uint base_y;
		uint256 refundRatio;
		uint256 reserveWeight;

		bool updating;
        uint256 targetValueSetId;
	}

	function registerValueSet() returns(uint256) {}
    function deactivateValueSet() returns(uint256) {}
    function reactivateValueSet() returns(uint256) {}

	mapping (uint => TargetValueSet) targetValueSets;

    // NOTE: for updating a hub
	struct TargetValueSet {
		uint base_x;
		uint base_y;
		uint256 refundRatio;
		uint256 reserveWeight;

		uint256 blockStart;
        uint256 blockTarget;
        bool targetReached;
	}

	function registerTargetValueSet() returns(uint256) {}

    /**
     * if updating == true, then reference the curve's updater.sol to linearly calculate the new rate between startBlock & targetBlock
     * if updating == true and targetReached == true, then set updating == false
     * needs to reference hub.vault.balancePooled
     * needs to return both burnForOwner and burnForEveryoneElse values
    **/
    // TODO: fix calculateMintReturn arguments
    function calculateMintReturn(
        uint256 _valueSetId,
        uint256 _supply,
        uint256 _balancePooled,
        uint256 _depositAmount
    ) view returns (uint256 amount) {

        ValueSet memory v = valueSet[_valueSetId];
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
        uint256 _valueSetId,
        uint256 _supply,
        uint256 _balancePooled,
        uint256 _sellAmount
    ) returns (uint256 amount) {

        ValueSet memory v = valueSet[_valueSetId];
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
        uint256 weighted_t = _targetAmount * (targetWeight);
        weightedAmount = weighted_v + weighted_t;
    }

    function _finishUpdate(uint256 _valueSetId) internal {
        require(msg.sender == address(this));

        TargetValueSet memory t = targetValueSets[_valueSetId];
        ValueSet memory v = valueSets[_valueSetId];

        v.base_x = t.base_x;
        v.base_y = t.base_y;
        v.reserveWeight = t.reserveWeight;
        v.refundRatio = t.refundRatio;
        v.updating = false;

        emit Updated(v.hubId);
    }

}