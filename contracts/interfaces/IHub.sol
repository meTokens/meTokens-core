// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../libs/Details.sol";
import "./IVault.sol";
import "./ICurve.sol";

interface IHub {
    event Register(
        address _asset,
        address _vault,
        address _curve,
        uint256 _refundRatio,
        bytes _encodedCurveDetails,
        bytes _encodedVaultArgs
    );
    event InitUpdate(
        uint256 _id,
        address _targetCurve,
        uint256 _targetRefundRatio,
        bytes _encodedCurveDetails,
        bool reconfigure,
        uint256 startTime,
        uint256 endTime,
        uint256 endCooldown
    );
    event CancelUpdate(uint256 _id);

    event TransferHubOwnership(uint256 _id, address _newOwner);
    event FinishUpdate(uint256 _id);

    function register(
        address _asset,
        IVault _vault,
        ICurve _curve,
        uint256 _refundRatio,
        bytes memory _encodedCurveDetails,
        bytes memory _encodedVaultArgs
    ) external;

    function initUpdate(
        uint256 _id,
        address _targetCurve,
        uint256 _targetRefundRatio,
        bytes memory _encodedCurveDetails
    ) external;

    function cancelUpdate(uint256 _id) external;

    /// @notice Function to end the update, setting the target values of the hub,
    ///         as well as modifying a hubs' status to ACTIVE
    /// @param id Unique hub identifier
    function finishUpdate(uint256 id) external returns (Details.Hub memory);

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

    function getWarmup() external view returns (uint256);

    function setWarmup(uint256 warmup_) external;

    function getDuration() external view returns (uint256);

    function setDuration(uint256 duration_) external;

    function getCooldown() external view returns (uint256);

    function setCooldown(uint256 cooldown_) external;
}
