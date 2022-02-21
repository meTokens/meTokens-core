// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "./IVault.sol";
import "./ICurve.sol";
import "../libs/Details.sol";

/// @title MeTokens hub interface
/// @author Carl Farterson (@carlfarterson)
interface IHub {
    /// @notice Event of registering a hub
    /// @param id                  unique hub identifer
    /// @param owner               address to own hub
    /// @param asset               address of underlying asset
    /// @param vault               address of vault
    /// @param curve               address of curve
    /// @param refundRatio         rate to refund burners
    /// @param encodedCurveDetails additional encoded curve details
    /// @param encodedVaultArgs    additional encoded vault arguments
    event Register(
        uint256 id,
        address owner,
        address asset,
        address vault,
        address curve,
        uint256 refundRatio,
        bytes encodedCurveDetails,
        bytes encodedVaultArgs
    );

    /// @notice Event of making a hub inactive, preventing new subscriptions to the hub
    /// @param id  unique hub identifier
    event Deactivate(uint256 id);

    /// @notice Event of initializing a hub update
    /// @param id                     unique hub identifier
    /// @param targetCurve            address of target curve
    /// @param targetRefundRatio      target rate to refund burners
    /// @param encodedCurveDetails    additional encoded curve details
    /// @param reconfigure            boolean to show if we're changing the
    ///                                 curveDetails but not the curve address
    /// @param startTime              timestamp to start updating
    /// @param endTime                timestamp to end updating
    /// @param endCooldown            timestamp to allow another update
    event InitUpdate(
        uint256 id,
        address targetCurve,
        uint256 targetRefundRatio,
        bytes encodedCurveDetails,
        bool reconfigure,
        uint256 startTime,
        uint256 endTime,
        uint256 endCooldown
    );

    /// @notice Event of canceling a hub update
    /// @param id unique hub identifier
    event CancelUpdate(uint256 id);

    /// @notice Event of transfering hub ownership
    /// @param id          unique hub identifier
    /// @param newOwner    address to own the hub
    event TransferHubOwnership(uint256 id, address newOwner);

    /// @notice Event of finishing a hub update
    /// @param id unique hub identifier
    event FinishUpdate(uint256 id);

    /// @notice Register a new hub
    /// @param owner               address to own hub
    /// @param asset               address of vault asset
    /// @param vault               address of vault
    /// @param curve               address of curve
    /// @param refundRatio         rate to refund burners
    /// @param encodedCurveDetails additional encoded curve details
    /// @param encodedVaultArgs    additional encoded vault arguments
    function register(
        address owner,
        address asset,
        IVault vault,
        ICurve curve,
        uint256 refundRatio,
        bytes memory encodedCurveDetails,
        bytes memory encodedVaultArgs
    ) external;

    function deactivate(uint256 id) external;

    /// @notice Intialize a hub update
    /// @param id                  unique hub identifier
    /// @param targetCurve         address of target curve
    /// @param targetRefundRatio   target rate to refund burners
    /// @param encodedCurveDetails additional encoded curve details
    function initUpdate(
        uint256 id,
        address targetCurve,
        uint256 targetRefundRatio,
        bytes memory encodedCurveDetails
    ) external;

    /// @notice Cancel a hub update
    /// @dev Can only be called before startTime
    /// @param id unique hub identifier
    function cancelUpdate(uint256 id) external;

    /// @notice Finish updating a hub
    /// @param id  unique hub identifier
    /// @return     details of hub
    function finishUpdate(uint256 id) external returns (HubInfo memory);

    /// @notice Get the details of a hub
    /// @param id  unique hub identifier
    /// @return     details of hub
    function getHubDetails(uint256 id) external view returns (HubInfo memory);

    /// @notice Counter of hubs registered
    /// @return uint256
    function count() external view returns (uint256);

    function warmup() external view returns (uint256);

    function setWarmup(uint256 warmup) external;

    function duration() external view returns (uint256);

    function setDuration(uint256 duration) external;

    function cooldown() external view returns (uint256);

    function setCooldown(uint256 cooldown) external;
}
