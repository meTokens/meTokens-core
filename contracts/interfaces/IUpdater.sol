// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IUpdater {

    event FinishUpdate(uint256 hubId);
    event SetMinSecondsUntilStart(uint256 amount);
    event SetMaxSecondsUntilStart(uint256 amount);
    event SetMinDuration(uint256 amount);
    event SetMaxDuration(uint256 amount);

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

    function startUpdate(uint256 _hubId) external;

    function finishUpdate(uint256 _hubId) external;

    function getDetails(uint256 _hubId) external view returns (
        bool reconfiguring,
        address migrating,
        address recollateralizing,
        uint256 shifting,
        uint256 startTime,
        uint256 endTime
    );
    function getUpdateTimes(uint256 _hubId) external view returns (
        uint256 startTime,
        uint256 endTime
    );
    function getTargetCurve(uint256 _hubId) external view returns (address);
    function getTargetRefundRatio(uint256 _hubId) external view returns (uint256);

    function getTargetVault(uint256 _hubId) external view returns (address);

    function setMinSecondsUntilStart(uint256 amount) external;
    function setMaxSecondsUntilStart(uint256 amount) external;
    function setMinDuration(uint256 amount) external;
    function setMaxDuration(uint256 amount) external;

    function minSecondsUntilStart() external view returns (uint256);
    function maxSecondsUntilStart() external view returns (uint256);
    function minDuration() external view returns (uint256);
    function maxDuration() external view returns (uint256);

}