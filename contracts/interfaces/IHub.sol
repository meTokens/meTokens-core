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
    function finishUpdate(uint256 id) external returns (Details.Hub memory);

    function initUpdate(
        uint256 _id,
        address _migration,
        address _targetVault,
        address _targetCurve,
        bool _reconfiguring,
        uint256 _targetRefundRatio,
        uint256 _startTime,
        uint256 _duration
    ) external;

    /// @notice TODO
    /// @param id Unique hub identifier
    /// @return hub_ Details of hub
    function getDetails(uint256 id)
        external
        view
        returns (Details.Hub memory hub_);

    /// @notice TODO
    /// @return count of hubs created
    function count() external view returns (uint256);
}
