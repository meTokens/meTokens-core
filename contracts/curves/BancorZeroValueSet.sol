pragma solidity ^0.8.0;

import "./BancorZeroFormula.sol";


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

    /// @notice Given a hub, base_x, base_y and connector weight, add the configuration to the
    ///      BancorZero ValueSet registry
    /// @param _hub                 Identifier of hubs
    /// @param _encodedValueSet     connector weight, represented in ppm, 1 - 1,000,000
	function registerValueSet(
        uint256 _hub,
        bytes32 _encodedValueSet
    ) external override {
        // TODO: access control
        uint256 base_x;
        uint256 base_y;
        uint256 reserveWeight;

        // NOTE: this validates parameters are within the bounds before setting to value set
        // This is needed to register future value sets of different curves, as they may have different
        // arguments within Hub.registerValueSet()
        (base_x, base_y, reserveWeight) = abi.decode(_encodedValueSet, (uint256, uint256, uint256));

        require(base_x > 0 && base_x <= PRECISION, "base_x not in range");
        require(base_y > 0 && base_y <= PRECISION, "base_y not in range");
        require(reserveWeight > 0 && reserveWeight <= MAX_WEIGHT, "reserveWeight not in range");

        ValueSet memory valueSet = ValueSet(base_x, base_y, reserveWeight, false, 0);
        valueSets[_hub] = valueSet;
    }


    // TODO: if updating == true, then reference the curve's updater.sol to linearly calculate the new rate between startBlock & targetBlock
    // TODO: if updating == true and targetReached == true, then set updating == false
    /// @notice given a deposit amount (in the collateral token), return the amount of meTokens minted
    /// @param _depositAmount   amount of collateral tokens to deposit
    /// @param _hub             unique hub identifier
    /// @param _supply          current meToken supply
    /// @param _balancePooled   total connector balance
    /// @return meTokenAmount   amount of meTokens minted
    function calculateMintReturn(
        uint256 _depositAmount,
        uint256 _hub,
        uint256 _supply,
        uint256 _balancePooled
    ) external view override returns (uint256 meTokenAmount) {

        ValueSet memory v = valueSets[_hub];
        if (_supply > 0) {
            // TODO: can _supply > 0 and _balancePooled = 0? If so would break
            meTokenAmount = _calculateMintReturn(
                _depositAmount,
                v.reserveWeight,
                _supply,
                _balancePooled
            );
        } else {
            meTokenAmount = _calculateMintReturnFromZero(
                _depositAmount,
                v.reserveWeight,
                v.base_x,
                v.base_y
            );
        }

        // TODO: Since updating was moved to hub, need to bring this o
        if (v.updating) {
            // Calculate return using weights
            TargetValueSet memory t = targetValueSets[v.targetValueSetId];
            if (_supply > 0) {
                uint256 targetAmount = _calculateMintReturn(
                    _depositAmount,
                    t.reserveWeight,
                    _supply,
                    _balancePooled
                );
            } else {
                uint256 targetAmount = _calculateMintReturnFromZero(
                    _depositAmount,
                    t.reserveWeight,
                    t.base_x,
                    t.base_y
                );
            }
            meTokenAmount = _calculateWeightedAmount(amount, targetAmount, t);
        }
    }


    // TODO: natspec
    function calculateBurnReturn(
        uint256 _burnAmount,
        uint256 _hub,
        uint256 _supply,
        uint256 _balancePooled
    ) external view override returns (uint256 reserveTokenAmount) {

        ValueSet memory v = valueSets[_hub];
        reserveTokenAmount = _calculateBurnReturn(
            _burnAmount,
            v.reserveWeight,
            _supply,
            _balancePooled
        );
        
        if (v.updating) {
            // Calculate return using weights
            TargetValueSet memory t = targetValueSets[v.targetValueSetId];
            uint256 targetAmount = _calculateBurnReturn(
                _burnAmount,
                t.reserveWeight,
                _supply,
                _balancePooled
            );
            reserveTokenAmount = _calculateWeightedAmount(reserveTokenAmount, targetAmount, t);
        }
    }


    // TODO: natspec
    function _calculateWeightedAmount(
        uint256 _amount,
        uint256 _targetAmount,
        Curve curve // TODO
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


    // TODO: natspec
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