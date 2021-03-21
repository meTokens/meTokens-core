pragma solidity ^0.8.0;

interface I_CurveRegistry {
    function registerCurve(string calldata name, address formula, address valueSet) external;
    function registerFormula(address formula);
    function registerValueSet(address valueSet);
    function deactivateCurve(); // TODO
    function deactivateFormula(address formula) public;
    function deactivateValueSet(address valueSet) public;
    function isApprovedFormula(address formula) public view returns (bool);
    function isApprovedValueSet(address valueSet) public view returns (bool);
    function getCurveCount() public view returns (uint256);
}