// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "./SigmoidalFormula.sol";

/// @title Sigmoidal curve registry and calculator
/// @author Carl Farterson (@carlfarterson)
/// @notice Uses SigmoidalFormula.sol for private methods
contract SigmoidalValues is SigmoidalFormula {

    /*
    struct ValueSet{

    }

    struct TargetValueSet{

    }
    */

    uint256 private PRECISION = 10**18;

    event Updated(uint256 indexed hubId);

    // NOTE: keys will be the hub
	// mapping (uint256 => HubValueSet) hubValueSets;

	function registerValueSet(
        // TODO: arguments
    ) external virtual override {
        // TODO
    }
}