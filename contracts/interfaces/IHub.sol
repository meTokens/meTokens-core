// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {HubDetails} from "../libs/Details.sol"; 

interface IHub {

    event Register(string name, address indexed vault);  // TODO: decide on arguments
    event Deactivate(uint id);

    function subscribeMeToken(uint _id, address _meToken) external;

    function getSubscribedMeTokenCount(uint _id) external view returns (uint);

    function getSubscribedMeTokens(uint _id) external view returns (address[] memory);
    
    /// @notice Function to modify a hubs' status to INACTIVE
    /// @param id Unique hub identifier
    function deactivate(uint id) external;

    /// @notice Function to modify a hubs' status to QUEUED
    /// @param id Unique hub identifier
    function startUpdate(uint id) external;

    /// @notice Function to end the update, setting the target values of the hub,
    ///         as well as modifying a hubs' status to ACTIVE
    /// @param id Unique hub identifier
    function finishUpdate(
        uint    id
    ) external;

    function initUpdate(
        uint256 _id,
        address _migrationVault,
        address _targetVault,
        address _targetCurve,
        bool _curveDetails,
        uint256 _targetRefundRatio,
        uint256 _startTime,
        uint256 _duration
    ) external;

    /// @notice TODO
    /// @param id Unique hub identifier
    /// @return hubDetails Details of hub
    function getDetails(uint id) external view returns (
        HubDetails memory hubDetails
    );

    /// @notice Helper to fetch only owner of hubDetails
    /// @param id Unique hub identifier
    /// @return Address of owner
    function getOwner(uint id) external view returns (address);

    /// @notice Helper to fetch only vault of hubDetails
    /// @param id Unique hub identifier
    /// @return Address of vault
    function getVault(uint id) external view returns (address);


    /// @notice Helper to fetch only curve of hubDetails
    /// @param id Unique hub identifier
    /// @return Address of curve
    function getCurve(uint id) external view returns (address);

    /// @notice Helper to fetch only refundRatio of hubDetails
    /// @param id Unique hub identifier
    /// @return uint Return refundRatio
    function getRefundRatio(uint id) external view returns (uint);

    /// @notice TODO
    /// @param id Unique hub identifier
    /// @return bool is the hub active?
    function isActive(uint id) external view returns (bool);
}