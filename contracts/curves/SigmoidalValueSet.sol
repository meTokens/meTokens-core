pragma solidity ^0.8.0;

import "./SigmoidalFormula.sol";

/// @title Sigmoidal curve registry and calculator
/// @author Carl Farterson (@carlfarterson)
/// @notice Uses SigmoidalFormula.sol for private methods
contract SigmoidalValues is SigmoidalFormula {

    struct ValueSet{

    }

    struct TargetValueSet{

    }

    uint256 private PRECISION = 10**18;

    event Updated(uint256 indexed hubId);

    // NOTE: keys will be the hub
	mapping (uint256 => HubValueSet) hubValueSets;

	function registerValueSet(
        // TODO: arguments
    ) external virtual override {
        // TODO
    }

    function deactivateValueSet() returns (uint256) {}

    
    function reactivateValueSet() returns (uint256) {}

	mapping (uint256 => TargetValueSet) targetHubValueSets;

	function registerTargetValueSet() returns (uint256) {}

    function calculateMintReturn(
        uint256 _hubId,
        uint256 _supply,
        uint256 _balancePooled,
        uint256 _depositAmount
    ) external view override returns (uint256 amount) {
        // TODO
    }

    function calculateBurnReturn(
        uint256 _hubId,
        uint256 _supply,
        uint256 _balancePooled,
        uint256 _sellAmount
    ) returns (uint256 amount) {
        // TODO
    }
}