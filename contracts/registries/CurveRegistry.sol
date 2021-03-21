pragma solidity ^0.8.0;

contract CurveRegistry {

    event RegisterCurve(string name, address formula, address values);

    mapping (uint256 => CurveDetails) curves;
    mapping (address => bool) private approvedFormulas;
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

    // TODO: access control
    function deactivateCurve() external returns(uint256) {}
    
    function reactivateCurve() external returns(uint256) {}

    function getCurveCount() public view returns (uint256) {
        return _curveCount;
    }

    function isApprovedFormula(address formula) public view returns (bool) {
        return approvedFormulas[formula];
    }

    function isApprovedValues(address Values) public view returns (bool) {
        return approvedValues[value];
    }
}