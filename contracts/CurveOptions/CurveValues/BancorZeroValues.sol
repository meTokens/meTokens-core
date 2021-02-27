// example of a contract `CurveOption.libraryParameterSet` that can be registered in CurveRegistry.sol
// specifically paired with BancorFormulaFromZero.sol

import "../CurveFormulas/BancorZeroFormula.sol";

contract BancorZeroFormulaValues is BancorZeroFormula {

    event Updated(uint256 indexed hubId);

    modifier isUpdating(address meToken) {
        // TODO
    }

	mapping (uint => ValueSet) valueSets;
	
	struct ValueSet {
		address hub; // the hub that uses this parameter set
		uint base_x;
		uint base_y;
		uint256 reserveWeight;
		uint256 refundRatio;
		bool updating;
	}

	function registerValueSet() returns(uint256) {}
    function deactivateValueSet() returns(uint256) {}
    function reactivateValueSet() returns(uint256) {}

	mapping (uint => TargetValueSet) targetValueSets;

	struct TargetValueSet {
		uint base_x;
		uint base_y;
		uint256 reserveWeight;
		uint256 refundRatio;
		uint256 blockStart;
        uint256 blockTarget;
        bool targetReached;
	}

	function registerTargetValueSet() returns(uint256) {}
    function deactivateTargetValueSet() returns(uint256) {}
    function reactivateTargetValueSet() returns(uint256) {}

    /**
     * this class of functions are only updated after targetReached == true
    **/
    // function updateBaseX() internal returns () {}
    function updateBaseY() returns () {} // not sure if Y would ever actualy need to be updated
    function updateReserveWeight() internal returns () {
    	updateBaseY();
    }
    function updateRefundRatio() internal returns () {}

    function _finishUpdate(uint256 _valueSetId) internal {
        require(msg.sender == address(this));

        TargetValueSet memory t = targetValueSets[_valueSetId];
        ValueSet memory v = valueSets[_valueSetId];

        v.base_x = t.base_x;
        v.base_y = t.base_y;
        v.reserveWeight = t.reserveWeight;
        v.refundRatio = t.refundRatio;
        v.updating = false;
    }

    /**
     * if updating == true, then reference the curve's updater.sol to linearly calculate the new rate between startBlock & targetBlock
     * if updating == true and targetReached == true, then set updating == false
     * needs to reference hub.vault.balancePooled
     * needs to return both burnForOwner and burnForEveryoneElse values
    **/
	
    // TODO: update calculation returned if meToken is changing hubs
    function calculateMintReturn(uint256 _valueSetId, uint256 _depositAmount) updated view returns (uint256) {
        ValueSet memory v = valueSets[_valueSetId];

        if (supply > 0) {
            // TODO - passing in supply and other args
            // supply comes from vault
            _calculateMintReturn(param);
        } else {
            _calculateMintReturnFromZero(v.base_x, v.base_y, v.reserveWeight, _depositAmount);
        }
    }

    // TODO: update calculations returned if meToken is changing hubs
    function calculateBurnReturn(uint256 _valueSetId) updated returns (uint256) {
        ValueSet memory v = valueSets[_valueSetId];
    }

    /// @notice calculateFee is used to calculate the fee earned by the StakeOnMe Development Team whenever a MeToken Purchase or sale occurs throught contract
    function calculateFee(uint256 amountEth) returns (uint256) {
        return amountEth * percent / PRECISION;
    }

    /// @notice calculateLockedReturn is used to calculate the amount of locked Eth returned to the owner during a burn/spend
    function calculateLockedReturn(uint256 amountToken, uint256 lockedBalance, uint256 supply) returns (uint256) {
        return amountToken * lockedBalance / supply;
    }
}