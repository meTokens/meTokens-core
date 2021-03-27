pragma solidity ^0.8.0;

contract CurveRegistry {

    event RegisterCurve(string name, address formula, address values);
    event RegisterFormula(address formula);
    event RegisterValueSet(address valueSet);
    event DeactivateCurve(uint256 curveId);
    event DeactivateFormula(address formula);
    event DeactivateValueSet(address values);

    mapping (uint256 => CurveDetails) private curves;
    mapping (address => bool) private approvedFormulas;
    mapping (address => bool) private approvedValueSets;
    uint256 private curveCount;

    struct CurveDetails{
        string name; // BancorZero
        address formula; // see BancorZeroFormula.sol as an example of an address that could be registered
        address valueSet; // see BancorZeroValueSet.sol as an example of an address that could be registered (needs to be paired with the above library)
        bool active;
    }

    // TODO: access control
    function registerCurve(
        string calldata name,
        address _formula,
        address _valueSet
    ) external {
        require(isApprovedFormula(_formula) && isApprovedValueSet(_valueSet), "Not approved");

        // Add curve details to storage
        CurveDetails storage curveDetails = CurveDetails(name, _formula, _valueSet, true);
        curves[++curveCount] = curveDetails;

        emit RegisterCurve(name, _formula, _valueSet);
    }

    function registerFormula(address _formula) external {
        // TODO: access control
        require(!isApprovedFormula(_formula), "Formula already approved");
        approvedFormulas[_formula] = true;
        emit RegisterFormula(_formula);
    }
    function registerValueSet(address _valueSet) external {
        // TODO: access control
        require(!isApprovedValueSet(_valueSet), "ValueSet already approved");
        approvedValueSets[_valueSet] = true;
        emit RegisterValueSet(_valueSet);
    }

    function deactivateCurve(uint256 _curveId) external {
        // TODO: access control
        require(_curveId < curveCount, "_curveId cannot exceed curveCount");
        // TODO: is this memory or storage?
        CurveDetails storage curveDetails = curves[_curveId];
        require(curveDetails.active, "curve not active");
        curveDetails.active = false;
    }
    
    function deactivateFormula(address _formula) external {
        // TODO: access control
        require(approvedFormulas[_formula], "Formula not approved");
        approvedFormulas[_formula] = false;
        emit DeactivateFormula(_formula);
    }

    function deactivateValueSet(address _valueSet) external {
        // TODO: access control
        require(approvedValueSets[_valueSet], "ValueSet not approved");
        approvedValueSets[_valueSet] = false;
        emit DeactivateValueSet(_valueSet);
    }

    // TODO: are reactivate funcs needed for curves/formulas/valuesets?
    function reactivateCurve(uint256 _curveId) external {}

    function isApprovedFormula(address _formula) public view returns (bool) {
        return approvedFormulas[_formula];
    }

    function isApprovedValueSet(address _valueSet) public view returns (bool) {
        return approvedValueSets[_valueSet];
    }

    function getCurveCount() external view returns (uint256) {
        return curveCount;
    }

    function getCurveDetails(uint256 _curveId) external view returns (CurveDetails memory) {
        require(_curveId < curveCount, "_curveId cannot exceed curveCount");
        CurveDetails memory curveDetails = curves[_curveId];
        return curveDetails;
    }
}