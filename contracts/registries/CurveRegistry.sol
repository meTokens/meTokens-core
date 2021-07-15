// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../interfaces/ICurveRegistry.sol";

/// @title Curve registry
/// @author Carl Farterson (@carlfarterson)
/// @notice This contract keeps track of active curve types and their base values
abstract contract CurveRegistry is ICurveRegistry {

    event RegisterCurve(uint256 id, string name, address formula, address values);
    event DeactivateCurve(uint256 curveId);

    address public dao = address(0x0); // TODO
    uint256 private curveCount;
    
    mapping (string => bool) private namedCurves;

    struct CurveDetails {
        string name; // BancorZero
        address formula; // see BancorZeroFormula.sol as an example of an address that could be registered
        address valueSet; // see BancorZeroValueSet.sol as an example of an address that could be registered (needs to be paired with the above library)
        bool active;
    }
    mapping (uint256 => CurveDetails) private curves;

    /// @inheritdoc ICurveRegistry
    function registerCurve(
        string calldata _name,
        address _formula,
        address _valueSet
    ) external override returns (uint256) {
        // require(msg.sender == dao, "!dao");
        require(!namedCurves[_name], "Curve name already chosen");

        // Add curve details to storage
        CurveDetails memory curveDetails = CurveDetails(_name, _formula, _valueSet, true);
        curves[++curveCount] = curveDetails;
        namedCurves[_name] = true;
    
        emit RegisterCurve(curveCount, _name, _formula, _valueSet);
        return curveCount;
    }


    /// @inheritdoc ICurveRegistry
    function deactivateCurve(uint256 _curveId) external override {
        // TODO: access control
        require(_curveId <= curveCount, "_curveId cannot exceed curveCount");
        // TODO: is this memory or storage?
        CurveDetails storage curveDetails = curves[_curveId];
        require(curveDetails.active, "curve not active");
        curveDetails.active = false;
        emit DeactivateCurve(_curveId);
    }


    function isRegisteredCurve(address curve) external view returns (bool) {
        
    }

    /// @inheritdoc ICurveRegistry
    function getCurveCount() external view override returns (uint256) {
        return curveCount;
    }


    /// @inheritdoc ICurveRegistry
    function getDetails(uint256 _curveId) external view override returns (
        string memory name,
        address formula,
        address valueSet,
        bool active
    ) {
        require(_curveId <= curveCount, "_curveId cannot exceed curveCount");
        CurveDetails memory curveDetails = curves[_curveId];
        
        name = curveDetails.name; // BancorZero
        formula = curveDetails.formula; // see BancorZeroFormula.sol as an example of an address that could be registered
        valueSet = curveDetails.valueSet; // see BancorZeroValueSet.sol as an example of an address that could be registered (needs to be paired with the above library)
        active = curveDetails.active;
    }
}