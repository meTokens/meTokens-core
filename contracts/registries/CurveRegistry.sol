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
    mapping (address => bool) private approvedValues;
    uint256 private _curveCount;

    struct CurveDetails{
        string name; // BancorZero
        address formula; // see BancorZeroFormula.sol as an example of an address that could be registered
        address values; // see BancorZeroValues.sol as an example of an address that could be registered (needs to be paired with the above library)
        bool active;
    }

    // TODO: access control
    function registerCurve(
        string calldata name,
        address _formula,
        address _values
    ) external {
        require(isApprovedFormula(_formula) && isApprovedValues(_values), "Not approved");

        // Add curve details to storage
        CurveDetails storage curveDetails = CurveDetails(name, _formula, _values, true);
        curves[++_curveCount] = curveDetails;

        emit RegisterCurve(name, _formula, _values);
    }

    function deactivateCurve() external returns(uint256) {}
    
    function reactivateCurve() external returns(uint256) {}

    function registerFormula(address _formula) public {
        // TODO: access control
        require(!isApprovedFormula(_formula), "Formula already approved");
        approvedFormula[_formula] = true;
        emit RegisterFormula(_formula);
    }
    function registerValues(address _values) public {
        // TODO: access control
        require(!isApprovedValues(_values), "Values already approved");
        approvedValues[_values] = true;
        emit RegisterValues(_values);
    }

    function deactivateFormula(address _formula) public {
        // TODO: access control
        require(approvedFormula[_formula], "Formula not approved");
        approvedFormula[_formula] = false;
        emit DeactivateFormula(_formula);
    }

    function deactivateValues(address _values) public {
        // TODO: access control
        require(approvedValues[_values], "Values not approved");
        approvedValues[_values] = false;
        emit DeactivateValues(_values);
    }

    function isApprovedFormula(address formula) public view returns (bool) {
        return approvedFormula[formula];
    }

    function isApprovedValues(address values) public view returns (bool) {
        return approvedValues[values];
    }

    function getCurveCount() public view returns (uint256) {
        return _curveCount;
    }
}