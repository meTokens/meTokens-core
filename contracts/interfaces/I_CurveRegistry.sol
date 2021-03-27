pragma solidity ^0.8.0;

interface I_CurveRegistry {
    function registerCurve(string calldata name, address formula, address valueSet) external;
    function registerFormula(address formula) external;
    function registerValueSet(address valueSet) external;
    function deactivateCurve(uint256 curveId) external; // TODO
    function deactivateFormula(address formula) external;
    function deactivateValueSet(address valueSet) external;
    function isApprovedFormula(address formula) external view returns (bool);
    function isApprovedValueSet(address valueSet) external view returns (bool);
    function getCurveCount() external view returns (uint256);
    // TODO: figure out how to import CurveDetails
    function getCurveDetails(uint256 curveId) external view returns (CurveDetails memory);
}