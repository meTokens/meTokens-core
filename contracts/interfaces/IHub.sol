// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "./IVault.sol";
import "./ICurve.sol";
import "../libs/Details.sol";

/// @title MeTokens hub interface
/// @author Carl Farterson (@carlfarterson)
interface IHub {
    /// @notice Event of registering a hub
    /// @param _id                  unique hub identifer
    /// @param _owner               address to own hub
    /// @param _asset               address of underlying asset
    /// @param _vault               address of vault
    /// @param _curve               address of curve
    /// @param _refundRatio         rate to refund burners
    /// @param _encodedCurveDetails additional encoded curve details
    /// @param _encodedVaultArgs    additional encoded vault arguments
    event Register(
        uint256 _id,
        address _owner,
        address _asset,
        address _vault,
        address _curve,
        uint256 _refundRatio,
        bytes _encodedCurveDetails,
        bytes _encodedVaultArgs
    );

    /// @notice Event of making a hub inactive, preventing new subscriptions to the hub
    /// @param _id  unique hub identifier
    event Deactivate(uint256 _id);

    /// @notice Event of initializing a hub update
    /// @param _id                     unique hub identifier
    /// @param _targetCurve            address of target curve
    /// @param _targetRefundRatio      target rate to refund burners
    /// @param _encodedCurveDetails    additional encoded curve details
    /// @param _reconfigure            boolean to show if we're changing the
    ///                                 curveDetails but not the curve address
    /// @param _startTime              timestamp to start updating
    /// @param _endTime                timestamp to end updating
    /// @param _endCooldown            timestamp to allow another update
    event InitUpdate(
        uint256 _id,
        address _targetCurve,
        uint256 _targetRefundRatio,
        bytes _encodedCurveDetails,
        bool _reconfigure,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _endCooldown
    );

    /// @notice Event of canceling a hub update
    /// @param _id unique hub identifier
    event CancelUpdate(uint256 _id);

    /// @notice Event of transfering hub ownership
    /// @param _id          unique hub identifier
    /// @param _newOwner    address to own the hub
    event TransferHubOwnership(uint256 _id, address _newOwner);

    /// @notice Event of finishing a hub update
    /// @param _id unique hub identifier
    event FinishUpdate(uint256 _id);

    /// @notice Register a new hub
    /// @param _owner               address to own hub
    /// @param _asset               address of vault asset
    /// @param _vault               address of vault
    /// @param _curve               address of curve
    /// @param _refundRatio         rate to refund burners
    /// @param _encodedCurveDetails additional encoded curve details
    /// @param _encodedVaultArgs    additional encoded vault arguments
    function register(
        address _owner,
        address _asset,
        IVault _vault,
        ICurve _curve,
        uint256 _refundRatio,
        bytes memory _encodedCurveDetails,
        bytes memory _encodedVaultArgs
    ) external;

    function deactivate(uint256 _id) external;

    /// @notice Intialize a hub update
    /// @param _id                  unique hub identifier
    /// @param _targetCurve         address of target curve
    /// @param _targetRefundRatio   target rate to refund burners
    /// @param _encodedCurveDetails additional encoded curve details
    function initUpdate(
        uint256 _id,
        address _targetCurve,
        uint256 _targetRefundRatio,
        bytes memory _encodedCurveDetails
    ) external;

    /// @notice Cancel a hub update
    /// @dev Can only be called before _startTime
    /// @param _id unique hub identifier
    function cancelUpdate(uint256 _id) external;

    /// @notice Finish updating a hub
    /// @param _id  unique hub identifier
    /// @return     details of hub
    function finishUpdate(uint256 _id) external returns (HubInfo memory);

    /// @notice Get the details of a hub
    /// @param _id  unique hub identifier
    /// @return     details of hub
    function getHubDetails(uint256 _id) external view returns (HubInfo memory);

    /// @notice Counter of hubs registered
    /// @return uint256
    function count() external view returns (uint256);

    function warmup() external view returns (uint256);

    function setWarmup(uint256 warmup_) external;

    function duration() external view returns (uint256);

    function setDuration(uint256 duration_) external;

    function cooldown() external view returns (uint256);

    function setCooldown(uint256 cooldown_) external;
}
