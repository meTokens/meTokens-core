pragma solidity ^0.8.0;

import "./BancorZeroFormula.sol";
import "../interfaces/I_Hub.sol";


/// @title Bancor curve registry and calculator
/// @author Carl Farterson (@carlfarterson)
/// @notice Uses BancorZeroFormula.sol for private methods
contract BancorZeroFormulaValues is BancorZeroFormula {

    // NOTE: each valueSet is for a curve
    struct ValueSet {
		uint256 base_x;
		uint256 base_y;
		uint256 reserveWeight;
        bool updating;
	}

    struct TargetValueSet {
        uint base_x;
        uint base_y;
        uint256 reserveWeight;

        uint256 blockStart;
        uint256 blockTarget;
        bool targetReached;
    }

    event Updated(uint256 indexed hubId);

    I_Hub public hub = I_Hub(0x0);  // TODO: address

    // NOTE: keys will be the hub
	mapping (uint256 => ValueSet) private valueSets;
	mapping (uint256 => TargetValueSet) private targetValueSets;


    // TODO: natspec
    function updateValueSet(
        uint256 _hubId,
        uint256 _base_x,
        uint256 _base_y,
        uint256 _reserveWeight,
        uint256 _blockStart,
        uint256 _blockTarget
    ) external {
        require(msg.sender == hub.getHubOwner(_hubId), "msg.sender not hub owner");
        
        // TODO: validate hub is not updating

        ValueSet storage valueSet = valueSets[_hubId];
        require(!valueSet.updating, "ValueSet already updating");

        _validateValueSet(_base_x, _base_y, _reserveWeight);

        // TODO: determine where to put these variables
        uint256 minBlocksUntilStart = 50;
        uint256 minUpdateBlockDuration = 1000;

        require(_blockStart - minBlocksUntilStart >= block.number, "_blockStart too soon");
        require(_blockTarget - _blockStart >= minUpdateBlockDuration, "Update period too short");

        // Create target value set mapped to the hub
        TargetValueSet memory targetValueSet = TargetValueSet(
            _base_x,
            _base_y,
            _reserveWeight,
            _blockStart,
            _blockTarget,
            false
        );
        targetValueSets[_hubId] = targetValueSet;

        // Set valueSet updating to true
        valueSet.updating = true;
    }


    /// @notice Given a hub, base_x, base_y and connector weight, add the configuration to the
    ///      BancorZero ValueSet registry
    /// @param _hubId               Identifier of hubs
    /// @param _encodedValueSet     connector weight, represented in ppm, 1 - 1,000,000
	function registerValueSet(
        uint256 _hubId,
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
        _validateValueSet(base_x, base_y, reserveWeight);

        ValueSet memory valueSet = ValueSet(base_x, base_y, reserveWeight, false);
        valueSets[_hubId] = valueSet;
    }


    // TODO: if updating == true, then reference the curve's updater.sol to linearly calculate the new rate between blockStart & targetBlock
    // TODO: if updating == true and targetReached == true, then set updating == false
    /// @notice given a deposit amount (in the collateral token), return the amount of meTokens minted
    /// @param _depositAmount   amount of collateral tokens to deposit
    /// @param _hubId           unique hub identifier
    /// @param _supply          current meToken supply
    /// @param _balancePooled   total connector balance
    /// @return meTokenAmount   amount of meTokens minted
    function calculateMintReturn(
        uint256 _depositAmount,
        uint256 _hubId,
        uint256 _supply,
        uint256 _balancePooled
    ) external view override returns (uint256 meTokenAmount) {

        ValueSet memory v = valueSets[_hubId];
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

        if (v.updating) {
            // Calculate return using weights
            TargetValueSet memory t = targetValueSets[_hubId];

            // Only calculate weighted amount if update is live
            if (t.blockStart > block.number) {
                if (_supply > 0) {
                    uint256 targetAmount = _calculateMintReturn(
                        _depositAmount,
                        t.reserveWeight,
                        _supply,
                        _balancePooled
                    );
                } else {
                    // TODO: can supply == 0 when updating?
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
    }


    // TODO: natspec
    function calculateBurnReturn(
        uint256 _burnAmount,
        uint256 _hubId,
        uint256 _supply,
        uint256 _balancePooled
    ) external view override returns (uint256 reserveTokenAmount) {

        ValueSet memory v = valueSets[_hubId];
        reserveTokenAmount = _calculateBurnReturn(
            _burnAmount,
            v.reserveWeight,
            _supply,
            _balancePooled
        );
        
        if (v.updating) {
            // Calculate return using weights
            TargetValueSet memory t = targetValueSets[_hubId];
            uint256 targetAmount = _calculateBurnReturn(
                _burnAmount,
                t.reserveWeight,
                _supply,
                _balancePooled
            );
            reserveTokenAmount = _calculateWeightedAmount(
                reserveTokenAmount,
                targetAmount,
                _hubId,
                t.blockStart,
                t.blockTarget
            );
        }
    }


    // TODO: natspec
    function _calculateWeightedAmount(
        uint256 _amount,
        uint256 _targetAmount,
        uint256 _hubId,
        uint256 _blockStart,
        uint256 _blockTarget
    ) private returns (uint256 weightedAmount) {
        uint256 targetWeight;

        if (block.number <= _blockTarget) { 
       // Finish update if complete
            _finishUpdate(_hubId);
            targetWeight = PRECISION;
        } else {
            uint256 targetProgress = block.number - _blockStart;
            uint256 targetLength = _blockTarget - _blockStart;
            // TODO: is this calculation right?
            targetWeight = PRECISION * targetProgress / targetLength;
        }

        // TODO: validate these calculations
        uint256 weighted_v = _amount * (PRECISION - targetWeight);
        uint256 weighted_t = _targetAmount * targetWeight;
        weightedAmount = weighted_v + weighted_t;
    }


    function _validateValueSet(uint256 base_x, uint256 base_y, uint256 reserveWeight) private {
        require(base_x > 0 && base_x <= PRECISION, "base_x not in range");
        require(base_y > 0 && base_y <= PRECISION, "base_y not in range");
        require(reserveWeight > 0 && reserveWeight <= MAX_WEIGHT, "reserveWeight not in range");
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
