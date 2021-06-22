// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface I_CurveRegistry {
    
    /// @notice TODO
    /// @param _name TODO
    /// @param _formula TODO
    /// @param _valueSet TODO
    function registerCurve(
        string calldata _name,
        address _formula,
        address _valueSet
    ) external;

    /// @notice TODO
    /// @param _curveId TODO
    function deactivateCurve(uint256 _curveId) external;
    
    /// @notice TODO
    /// @param _formula TODO
    function approveFormula(address _formula) external;
    
    /// @notice TODO
    /// @param _valueSet TODO
    function approveValueSet(address _valueSet) external;
    
    /// @notice TODO
    /// @param _formula TODO
    function unapproveFormula(address _formula) external;
    
    /// @notice TODO
    /// @param _valueSet TODO
    function unapproveValueSet(address _valueSet) external;
    
    /// @notice TODO
    /// @param _curveId TODO
    /// @return TODO
    function isActiveCurve(uint256 _curveId) external view returns (bool);

    /// @notice TODO
    /// @param _formula TODO
    /// @return TODO
    function isApprovedFormula(address _formula) external view returns (bool);
    
    /// @notice TODO
    /// @param _valueSet TODO
    /// @return TODO
    function isApprovedValueSet(address _valueSet) external view returns (bool);


    /// @notice TODO
    /// @return TODO
    function getCurveCount() external view returns (uint256);

    // / @notice TODO
    // / @param _curveId TODO
    // / @return TODO
    // / @return TODO
    // / @return TODO
    // / @return TODO
    function getDetails(
        uint256 _curveId
    ) external view returns (
        string memory name,
        address formula,
        address valueSet,
        bool active
    );
}