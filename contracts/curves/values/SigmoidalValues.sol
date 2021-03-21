// example of a contract `curves.libraryParameterSet` that can be registered in CurveRegistry.sol
// specifically paired with BancorFormulaFromZero.sol

import "../formulas/BancorZeroFormula.sol";

contract BancorZeroFormulaValues is BancorZeroFormula {

    uint256 private PRECISION = 10**18;

    event Updated(uint256 indexed hubId);

    // NOTE: keys will be the hubId
	mapping (uint256 => HubValueSet) hubValueSets;

    // NOTE: each valueSet is for a hub
	struct HubValueSet {
		// address hubId; // the hub that uses this parameter set
		uint base_x;
		uint base_y;
		uint256 reserveWeight;

		bool updating;
        uint256 targetValueSetId;
	}

	function registerValueSet() returns(uint256) {}
    function deactivateValueSet() returns(uint256) {}
    function reactivateValueSet() returns(uint256) {}

	mapping (uint256 => TargetValueSet) targetHubValueSets;

    // NOTE: for updating a hub
	struct TargetHubValueSet {
		uint base_x;
		uint base_y;
		uint256 reserveWeight;

		uint256 blockStart;
        uint256 blockTarget;
        bool targetReached;
	}

	function registerTargetValueSet() returns(uint256) {}

    function calculateMintReturn(
        uint256 _hubId,
        uint256 _supply,
        uint256 _balancePooled,
        uint256 _depositAmount
    ) view returns (uint256 amount);    }

    // TODO: _calculateBurnReturn arguments
    function calculateBurnReturn(
        uint256 _hubId,
        uint256 _supply,
        uint256 _balancePooled,
        uint256 _sellAmount
    ) returns (uint256 amount);
}