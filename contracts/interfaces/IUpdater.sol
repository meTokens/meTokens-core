// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IUpdater {

    event FinishUpdate(uint256 hubId);
    event SetMinSecondsUntilStart(uint256 amount);
    event SetMaxSecondsUntilStart(uint256 amount);
    event SetMinDuration(uint256 amount);
    event SetMaxDuration(uint256 amount);

    /*
    /// @notice TODO
    /// @param _hubId TODO
    /// @param _targetCurveId TODO
    /// @param _targetVault TODO
    /// @param _recollateralizationFactory TODO
    /// @param _targetRefundRatio TODO
    /// @param _targetEncodedValueSet TODO
    /// @param _startTime TODO
    /// @param _duration TODO
    function initUpdate(
        uint256 _hubId,
        uint256 _targetCurveId,
        address _targetVault,
        address _recollateralizationFactory,
        uint256 _targetRefundRatio,
        bytes32 _targetEncodedValueSet,
        uint256 _startTime,
        uint256 _duration
    ) external;


    /// @notice TODO
    /// @param _hubId TODO
    function startUpdate(uint256 _hubId) external;

    /// @notice TODO
    /// @param _hubId TODO
    function finishUpdate(uint256 _hubId) external;

    /// @notice TODO
    /// @param _hubId TODO
    /// @return reconfiguring TODO
    /// @return migrating TODO
    /// @return recollateralizing TODO
    /// @return shifting TODO
    /// @return startTime TODO
    /// @return endTime TODO
    function getDetails(uint256 _hubId) external view returns (
        bool reconfiguring,
        address migrating,
        address recollateralizing,
        uint256 shifting,
        uint256 startTime,
        uint256 endTime
    );

    /// @notice TODO
    /// @param _hubId TODO
    /// @return startTime TODO
    /// @return endTime TODO
    function getUpdateTimes(uint256 _hubId) external view returns (
        uint256 startTime,
        uint256 endTime
    );

    /// @notice TODO
    /// @param _hubId TODO
    /// @return bool TODO
    function isReconfiguring(uint256 _hubId) external view returns (bool);

    /// @notice TODO
    /// @param _hubId TODO
    function getTargetCurve(uint256 _hubId) external view returns (address);
    /// @notice TODO
    /// @param _hubId TODO
    function getTargetRefundRatio(uint256 _hubId) external view returns (uint256);

    /// @notice TODO
    /// @param _hubId TODO
    function getTargetVault(uint256 _hubId) external view returns (address);

    /// @notice TODO
    /// @param amount TODO
    function setMinSecondsUntilStart(uint256 amount) external;
    /// @notice TODO
    /// @param amount TODO
    function setMaxSecondsUntilStart(uint256 amount) external;
    /// @notice TODO
    /// @param amount TODO
    function setMinDuration(uint256 amount) external;
    /// @notice TODO
    /// @param amount TODO
    function setMaxDuration(uint256 amount) external;

    /// @notice TODO
    /// @return uint256 TODO
    function minSecondsUntilStart() external view returns (uint256);
    /// @notice TODO
    /// @return uint256 TODO
    function maxSecondsUntilStart() external view returns (uint256);
    /// @notice TODO
    /// @return uint256 TODO
    function minDuration() external view returns (uint256);
    /// @notice TODO
    /// @return uint256 TODO
    function maxDuration() external view returns (uint256);

    */
}