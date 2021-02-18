// example of a contract `CurveOption.libraryParameterSet` that can be registered in CurveRegistry.sol
// specifically paired with BancorFormulaFromZero.sol
contract BancorZeroForumlaValues {

	mapping (uint => ValueSet) valueSets;
	
	struct ValueSet{
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

	struct TargetValueSet{
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
    	updateBaseY()
    }
    function updateRefundRatio() internal returns () {}

    /**
     * if updating == true, then reference the curve's updater.sol to linearly calculate the new rate between startBlock & targetBlock
     * if updating == true and targetReached == true, then set updating == false
     * needs to reference hub.vault.balancePooled
     * needs to return both burnForOwner and burnForEveryoneElse values
    **/
	modifier updated;
    function calculateMintReturn(uint256 _valueSet) updated returns () {
        if (supply > 0 ) {
            _calculatePurchaseReturn(param)
        } else {
            _calculatePurcahseReturnFromZero(param)
        }
    }
    function calculateBurnReturn(uint256 _valueSet) updated returns () {}
}