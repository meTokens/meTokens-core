// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface ICurveRegistry {
    
    /// @notice TODO
    /// @param _name TODO
    /// @param _formula TODO
    /// @param _valueSet TODO
    function register(
        string calldata _name,
        address _formula,
        address _valueSet
    ) external returns (uint);

    /// @notice TODO
    /// @param id TODO
    function deactivate(uint id) external;
    
    function isActive(uint id) external view returns (bool);

    /// @notice TODO
    /// @return TODO
    function getCount() external view returns (uint);

    // / @notice TODO
    // / @param id TODO
    // / @return name TODO
    // / @return formula TODO
    // / @return valueSet TODO
    // / @return active TODO
    function getDetails(
        uint id
    ) external view returns (
        string memory name,
        address formula,
        address valueSet,
        bool active
    );
}