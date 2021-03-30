pragma solidity ^0.8.0;

// TODO: make virtual
abstract contract CurveBase {

    // TODO: figure out best way to store / import structs

    // NOTE: each valueSet is for a hub
    struct ValueSet {
        // TODO: should `hubId` be included?
		// address hubId; // the hub that uses this parameter set
		uint256 base_x;
		uint256 base_y;
		uint256 reserveWeight;

		bool updating;
        uint256 targetValueSetId;
	}

        // NOTE: for updating a hub
	struct TargetValueSet {
		uint base_x;
		uint base_y;
		uint256 reserveWeight;

		uint256 blockStart;
        uint256 blockTarget;
        bool targetReached;
	}

    // TODO: is `bytes32` right?
    function calculateMintReturn(bytes32 encodedArgs) virtual public;
    function calculateBurnReturn(bytes32 encodedArgs) virtual public;
}