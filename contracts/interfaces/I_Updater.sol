// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface I_Updater {

    event StartUpdate(); // TODO
    event FinishUpdate(uint256 _hubId);

    function startUpdate(
        uint256 _hubId,
        address _targetCurve,
        address _targetVault,
        address _recollateralizationFactory,
        uint256 _targetRefundRatio,
        bytes32 _targetEncodedValueSet,
        uint256 _startTime,
        uint256 _endTime
    ) external;

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

    function getTargetVault(uint256 _hubId) external view returns (uint256);

}