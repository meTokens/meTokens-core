pragma solidity ^0.8.0;

import "../interfaces/I_CurveRegistry.sol";

/// @title Curve registry
/// @author Carl Farterson (@carlfarterson)
/// @notice This contract keeps track of active curve types and their base values
contract CurveRegistry is I_CurveRegistry {

    event RegisterCurve(string name, address formula, address values);
    event DeactivateCurve(uint256 curveId);
    event ApproveFormula(address formula);
    event ApproveValueSet(address valueSet);
    event UnapproveFormula(address formula);
    event UnapproveValueSet(address values);

    mapping (uint256 => CurveDetails) private curves;
    mapping (string => bool) private namedCurves;
    uint256 private curveCount;

    struct Curve{
        string name; // BancorZero
        address formula; // see BancorZeroFormula.sol as an example of an address that could be registered
        address valueSet; // see BancorZeroValueSet.sol as an example of an address that could be registered (needs to be paired with the above library)
        bool active;
    }

    /// @inheritdoc I_CurveRegistry
    function registerCurve(
        string calldata _name,
        address _formula,
        address _valueSet
    ) external override {
        // TODO: access control - only DAO can register
        require(!namedCurves[_name], "Curve name already chosen");

        // Add curve details to storage
        CurveDetails memory curveDetails = CurveDetails(_name, _formula, _valueSet, true);
        curves[curveCount++] = curveDetails;
        namedCurves[_name] = true;
    
        emit RegisterCurve(_name, _formula, _valueSet);
    }


    /// @inheritdoc I_CurveRegistry
    function deactivateCurve(uint256 _curveId) external override {
        // TODO: access control
        require(_curveId <= curveCount, "_curveId cannot exceed curveCount");
        // TODO: is this memory or storage?
        CurveDetails storage curveDetails = curves[_curveId];
        require(curveDetails.active, "curve not active");
        curveDetails.active = false;
        emit DeactivateCurve(_curveId);
    }


    /// @inheritdoc I_CurveRegistry
    function getCurveCount() external view override returns (uint256) {
        return curveCount;
    }


    /// @inheritdoc I_CurveRegistry
    function getCurveDetails(uint256 _curveId) external view override returns (CurveDetails memory) {
        require(_curveId <= curveCount, "_curveId cannot exceed curveCount");
        CurveDetails memory curveDetails = curves[_curveId];
        return curveDetails;
    }
}