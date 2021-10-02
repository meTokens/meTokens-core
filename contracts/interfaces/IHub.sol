// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../libs/Details.sol";

interface IHub {
    event Register(string name, address indexed vault); // TODO: decide on arguments
    event Deactivate(uint256 id);

    function subscribeMeToken(uint256 _id, address _meToken) external;

    function getSubscribedMeTokenCount(uint256 _id)
        external
        view
        returns (uint256);

    function getSubscribedMeTokens(uint256 _id)
        external
        view
        returns (address[] memory);

    /// @notice Function to modify a hubs' status to INACTIVE
    /// @param id Unique hub identifier
    function deactivate(uint256 id) external;

    /// @notice Function to modify a hubs' status to QUEUED
    /// @param id Unique hub identifier
    function startUpdate(uint256 id) external;

    /// @notice Function to end the update, setting the target values of the hub,
    ///         as well as modifying a hubs' status to ACTIVE
    /// @param id Unique hub identifier
    function finishUpdate(uint256 id) external;

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
    function getDetails(uint256 id)
        external
        view
        returns (Details.HubDetails memory hubDetails);

    /// @notice Helper to fetch only owner of hubDetails
    /// @param id Unique hub identifier
    /// @return Address of owner
    function getOwner(uint256 id) external view returns (address);

    /// @notice Helper to fetch only vault of hubDetails
    /// @param id Unique hub identifier
    /// @return Address of vault
    function getVault(uint256 id) external view returns (address);

    /// @notice Helper to fetch only curve of hubDetails
    /// @param id Unique hub identifier
    /// @return Address of curve
    function getCurve(uint256 id) external view returns (address);

    /// @notice Helper to fetch only refundRatio of hubDetails
    /// @param id Unique hub identifier
    /// @return uint Return refundRatio
    function getRefundRatio(uint256 id) external view returns (uint256);

    /// @notice TODO
    /// @param id Unique hub identifier
    /// @return bool is the hub active?
    function isActive(uint256 id) external view returns (bool);
}
