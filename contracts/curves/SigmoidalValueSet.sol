// example of a contract `curves.libraryParameterSet` that can be registered in CurveRegistry.sol
// specifically paired with BancorFormulaFromZero.sol

import "./SigmoidalFormula.sol";

contract SigmoidalValues is SigmoidalFormula {

    struct ValueSet{

    }

    struct TargetValueSet{

    }

    uint256 private PRECISION = 10**18;

    event Updated(uint256 indexed hubId);

    // NOTE: keys will be the hubId
	mapping (uint256 => HubValueSet) hubValueSets;

	function registerValueSet(
        // TODO: arguments
    ) external virtual override {
        // TODO
    }

    function deactivateValueSet() returns(uint256) {}

    
    function reactivateValueSet() returns(uint256) {}

	mapping (uint256 => TargetValueSet) targetHubValueSets;

	function registerTargetValueSet() returns(uint256) {}

    function calculateMintReturn(
        uint256 _hubId,
        uint256 _supply,
        uint256 _balancePooled,
        uint256 _depositAmount
    ) external view override returns (uint256 amount) {
        // TODO
    };

    function calculateBurnReturn(
        uint256 _hubId,
        uint256 _supply,
        uint256 _balancePooled,
        uint256 _sellAmount
    ) returns (uint256 amount) {
        // TODO
    };
}