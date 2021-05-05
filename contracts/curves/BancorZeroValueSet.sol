pragma solidity ^0.8.0;

import "./BancorZeroFormula.sol";

// example of a contract `curves.libraryParameterSet` that can be registered in CurveRegistry.sol
// specifically paired with BancorFormulaFromZero.sol

/// @title Bancor curve registry and calculator
/// @author Carl Farterson (@carlfarterson)
/// @notice Uses BancorZeroFormula.sol for private methods
contract BancorZeroFormulaValues is BancorZeroFormula {

    bytes4 private encodedFunction = bytes(keccak256("_registerValueSet(uint256,uint256,uin256)"));

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

    /// @notice Given a hubId, base_x, base_y and connector weight, add the configuration to the
    //      BancorZero ValueSet registry
    /// @param _encodedValueSet   connector weight, represented in ppm, 1 - 1,000,000
	function registerValueSet(
        uint256 _hubId,
        bytes32 _encodedValueSet
    ) external virtual override {
        // TODO: access control

        require(this.call(encodedFunction, _encodedValueSet), "Encoding failed");

       ValueSet storage valueSet = _registerValueSet(_encodedValueSet);
       valueSets[_hubId] = valueSet;
    }


    // TODO: double-check returning structs from functions
    function _registerValueSet(
        uint256 _base_x,
        uint256 _base_y,
        uint256 _reserveweight
    ) private returns (ValueSet) {
        require(_base_x > 0 && _base_y > 0, "_base_x and _base_y cannot be 0");
        require(0 < _reserveWeight && _reserveWeight <= MAX_WEIGHT, "_reserveWeight not in range");
        ValueSet memory valueSet = ValueSet(_base_x, _base_y, _reserveWeight, false, 0);
        return valueSet;
    }


    // TODO: if updating == true, then reference the curve's updater.sol to linearly calculate the new rate between startBlock & targetBlock
    // TODO: if updating == true and targetReached == true, then set updating == false
    // TODO: fix calculateMintReturn arguments
    /// @notice given a deposit amount (in the collateral token), return the amount of meTokens minted
    /// @param _depositAmount   amount of collateral tokens to deposit
    /// @param _hub             unique hub identifier
    /// @param _supply          current meToken supply
    /// @param _balancePooled   total connector balance
    /// @return amount 
    function calculateMintReturn(
        uint256 _depositAmount,
        uint256 _hub,
        uint256 _supply,
        uint256 _balancePooled
    ) external view override returns (uint256 amount) {

        ValueSet memory v = valueSets[_hub];
        if (_supply > 0) {
            // TODO: can _supply > 0 and _balancePooled = 0? If so would break
            amount = _calculateMintReturn(_depositAmount, v.reserveWeight, _supply, _balancePooled);
        } else {
            amount = _calculateMintReturnFromZero(_depositAmount, v.reserveWeight, v.base_x, v.base_y);
        }

        // TODO: Since updating was moved to hub, need to bring this o
        if (v.updating) {
            // Calculate return using weights
            TargetValueSet memory t = targetValueSets[v.targetValueSetId];
            if (_supply > 0) {
                uint256 targetAmount = _calculateMintReturn(_depositAmount, t.reserveWeight, _supply, _balancePooled);
            } else {
                uint256 targetAmount = _calculateMintReturnFromZero(_depositAmount, t.reserveWeight, t.base_x, t.base_y);
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
        amount = _calculateBurnReturn(_sellAmount,v.reserveWeight, _supply, _balancePooled);
        
        if (v.updating) {
            // Calculate return using weights
            TargetValueSet memory t = targetValueSets[v.targetValueSetId];
            uint256 targetAmount = _calculateBurnReturn(_sellAmount, t.reserveWeight, _supply, _balancePooled);
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