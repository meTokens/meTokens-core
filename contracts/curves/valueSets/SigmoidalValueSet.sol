// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../../interfaces/ICurveValueSet.sol";
import "../formulas/SigmoidalFormula.sol";

/// @title Sigmoidal curve registry and calculator
/// @author Carl Farterson (@carlfarterson)
/// @notice Uses SigmoidalFormula.sol for private methods
abstract contract SigmoidalValueSet is ICurveValueSet, SigmoidalFormula {

    /*
    struct ValueSet{

    }

    struct TargetValueSet{

    }
    */

    uint256 private PRECISION = 10**18;

    // NOTE: keys will be the hub
	// mapping (uint256 => HubValueSet) hubValueSets;

}