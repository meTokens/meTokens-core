// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {CurveDetails} from "../libs/Details.sol";

interface ICurveRegistry {

    event Register(uint256 count, address curve);
    event Deactivate(uint256 curveId);

    /// @notice TODO
    /// @param curve TODO
    function register(
        address curve
    ) external returns (uint);

    /// @notice TODO
    /// @param hubId TODO
    function deactivate(uint hubId) external;
    
    function isActive(uint hubId) external view returns (bool);

    /// @notice TODO
    /// @return TODO
    function getCount() external view returns (uint);

    // / @notice TODO
    // / @param hubId TODO
    // / @return curveDetails TODO
    function getDetails(
        uint hubId
    ) external view returns (
        CurveDetails memory curveDetails
    );
}