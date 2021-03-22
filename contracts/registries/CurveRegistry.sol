pragma solidity ^0.8.0;

contract CurveRegistry {

    event RegisterCurve(string name, address formula, address values);
    event RegisterFormula(address formula);
    event RegisterValues(address values);
    event DeactivateCurve(uint256 curveId);
    event DeactivateFormula(address formula);
    event DeactivateValues(address values);

    mapping (uint256 => CurveDetails) curves;
    mapping (address => bool) private approvedFormula;
    mapping (address => bool) private approvedValueSet;
    uint256 private _curveCount;

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
        curves[++_curveCount] = curveDetails;

        emit RegisterCurve(name, _formula, _valueSet);
    }

    function deactivateCurve() external returns(uint256) {}
    
    function reactivateCurve() external returns(uint256) {}

    function registerFormula(address _formula) public {
        // TODO: access control
        require(!isApprovedFormula(_formula), "Formula already approved");
        approvedFormula[_formula] = true;
        emit RegisterFormula(_formula);
    }
    function registerValueSet(address _valueSet) public {
        // TODO: access control
        require(!isApprovedValueSet(_valueSet), "ValueSet already approved");
        approvedValueSet[_valueSet] = true;
        emit RegisterValueSet(_valueSet);
    }

    function deactivateFormula(address _formula) public {
        // TODO: access control
        require(approvedFormula[_formula], "Formula not approved");
        approvedFormula[_formula] = false;
        emit DeactivateFormula(_formula);
    }

    function deactivateValueSet(address _valueSet) public {
        // TODO: access control
        require(approvedValueSet[_valueSet], "ValueSet not approved");
        approvedValueSet[_valueSet] = false;
        emit DeactivateValueSet(_valueSet);
    }

    function isApprovedFormula(address formula) public view returns (bool) {
        return approvedFormula[formula];
    }

    function isApprovedValueSet(address valueSet) public view returns (bool) {
        return approvedValueSet[valueSet];
    }

    function getCurveCount() public view returns (uint256) {
        return _curveCount;
    }
}