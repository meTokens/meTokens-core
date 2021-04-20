pragma solidity ^0.8.0;

/// @title Curve registry
/// @author Carl Farterson (@carlfarterson)
/// @notice This contract keeps track of active curve types and their base values
contract CurveRegistry {

    event RegisterCurve(string name, address formula, address values);
    event DeactivateCurve(uint256 curveId);
    event ApproveFormula(address formula);
    event ApproveValueSet(address valueSet);
    event UnapproveFormula(address formula);
    event UnapproveValueSet(address values);

    mapping (uint256 => CurveDetails) private curves;
    mapping (address => bool) private approvedFormulas;
    mapping (address => bool) private approvedValueSets;
    uint256 private curveCount;

    struct Curve{
        string name; // BancorZero
        address formula; // see BancorZeroFormula.sol as an example of an address that could be registered
        address valueSet; // see BancorZeroValueSet.sol as an example of an address that could be registered (needs to be paired with the above library)
        bool active;
    }

    /// @notice TODO
    /// @param _name TODO
    /// @param _formula TODO
    /// @param _valueSet TODO
    function registerCurve(
        string calldata _name,
        address _formula,
        address _valueSet
    ) external {
        require(approvedFormulas[_formula], "_formula not approved");
        require(approvedValueSets[_valueSet], "_valueSet not approved");
        // TODO: access control

        // Add curve details to storage
        // TODO: validate memory vs. storage usage
        CurveDetails memory curveDetails = CurveDetails(_name, _formula, _valueSet, true);
        curves[curveCount++] = curveDetails;

        emit RegisterCurve(_name, _formula, _valueSet);
    }


    /// @notice TODO
    /// @param _curveId TODO
    function deactivateCurve(uint256 _curveId) external {
        // TODO: access control
        require(_curveId <= curveCount, "_curveId cannot exceed curveCount");
        // TODO: is this memory or storage?
        CurveDetails storage curveDetails = curves[_curveId];
        require(curveDetails.active, "curve not active");
        curveDetails.active = false;
        emit DeactivateCurve(_curveId);
    }


    /// @notice TODO
    /// @param _formula TODO
    function approveFormula(address _formula) external {
        // TODO: access control
        require(!approvedFormulas[_formula], "Formula already approved");
        approvedFormulas[_formula] = true;
        emit ApproveFormula(_formula);
    }


    /// @notice TODO
    /// @param _valueSet TODO
    function approveValueSet(address _valueSet) external {
        // TODO: access control
        require(!approvedValueSets[_valueSet], "ValueSet already approved");
        approvedValueSets[_valueSet] = true;
        emit ApproveValueSet(_valueSet);
    }
    

    /// @notice TODO
    /// @param _formula TODO
    function unapproveFormula(address _formula) external {
        // TODO: access control
        require(approvedFormulas[_formula], "Formula not approved");
        approvedFormulas[_formula] = false;
        emit UnapproveFormula(_formula);
    }


    /// @notice TODO
    /// @param _valueSet TODO
    function unapproveValueSet(address _valueSet) external {
        // TODO: access control
        require(approvedValueSets[_valueSet], "ValueSet not approved");
        approvedValueSets[_valueSet] = false;
        emit UnapproveValueSet(_valueSet);
    }

    // TODO: are reactivate funcs needed for curve/formula/valueset?
    // function reactivateCurve(uint256 _curveId) external {}
    /// @notice TODO
    /// @param _curveId TODO
    /// @return TODO
    function isActiveCurve(uint256 _curveId) external view returns (bool) {
        require(_curveId < curveCount, "_curveId does not exist");
        CurveDetails memory curveDetails = curves[_curveId];
        return curveDetails.active;
    }


    /// @notice TODO
    /// @param _formula TODO
    /// @return TODO
    function isApprovedFormula(address _formula) external view returns (bool) {
        return approvedFormulas[_formula];
    }


    /// @notice TODO
    /// @param _valueSet TODO
    /// @return TODO
    function isApprovedValueSet(address _valueSet) external view returns (bool) {
        return approvedValueSets[_valueSet];
    }


    /// @notice TODO
    /// @return TODO
    function getCurveCount() external view returns (uint256) {
        return curveCount;
    }


    /// @notice TODO
    /// @param _curveId TODO
    /// @return TODO
    function getCurveDetails(uint256 _curveId) external view returns (CurveDetails memory) {
        require(_curveId <= curveCount, "_curveId cannot exceed curveCount");
        CurveDetails memory curveDetails = curves[_curveId];
        return curveDetails;
    }
}