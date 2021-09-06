// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface ICurveRegistry {

    event Register(uint256 count, address curve);
    event Deactivate(uint256 curveId);

    /// @notice TODO
    /// @param curve TODO
    function register(
        address curve
    ) external;

    /// @notice TODO
    /// @param curve TODO
    function deactivate(address curve) external;
    
    /// @notice TODO
    /// @param curve TODO
    /// @return bool
    function isActive(address curve) external view returns (bool);

}