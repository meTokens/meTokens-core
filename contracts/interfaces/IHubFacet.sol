// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

import {IVault} from "./IVault.sol";
import {ICurve} from "./ICurve.sol";
import {HubInfo} from "../libs/LibHub.sol";

/// @title MeTokens hub interface
/// @author Carter Carlson (@cartercarlson)
interface IHubFacet {
    /// @notice Event of registering a hub
    /// @param id               Unique hub identifer
    /// @param owner            Address to own hub
    /// @param asset            Address of underlying asset
    /// @param vault            Address of vault
    /// @param curve            Address of curve
    /// @param refundRatio      Rate to refund burners
    /// @param encodedCurveInfo Additional encoded curve details
    /// @param encodedVaultArgs Additional encoded vault arguments
    event Register(
        uint256 id,
        address owner,
        address asset,
        address vault,
        address curve,
        uint256 refundRatio,
        bytes encodedCurveInfo,
        bytes encodedVaultArgs
    );

    /// @notice Event of making a hub inactive, preventing new subscriptions to the hub
    /// @param id  Unique hub identifier
    event Deactivate(uint256 id);

    /// @notice Event of initializing a hub update
    /// @param id                   Unique hub identifier
    /// @param targetCurve          Address of target curve
    /// @param targetRefundRatio    Target rate to refund burners
    /// @param encodedCurveInfo     Additional encoded curve details
    /// @param reconfigure          Boolean to show if we're changing the
    ///                               curveInfo but not the curve address
    /// @param startTime            Timestamp to start updating
    /// @param endTime              Timestamp to end updating
    /// @param endCooldown          Timestamp to allow another update
    event InitUpdate(
        uint256 id,
        address targetCurve,
        uint256 targetRefundRatio,
        bytes encodedCurveInfo,
        bool reconfigure,
        uint256 startTime,
        uint256 endTime,
        uint256 endCooldown
    );

    /// @notice Event of canceling a hub update
    /// @param id Unique hub identifier
    event CancelUpdate(uint256 id);

    /// @notice Event of transfering hub ownership
    /// @param id          Unique hub identifier
    /// @param newOwner    Address to own the hub
    event TransferHubOwnership(uint256 id, address newOwner);

    /// @notice Event of finishing a hub update
    /// @param id Unique hub identifier
    event FinishUpdate(uint256 id);

    /// @notice Register a new hub
    /// @param owner                Address to own hub
    /// @param asset                Address of vault asset
    /// @param vault                Address of vault
    /// @param curve                Address of curve
    /// @param refundRatio          Rate to refund burners
    /// @param encodedCurveInfo     Additional encoded curve details
    /// @param encodedVaultArgs     Additional encoded vault arguments
    function register(
        address owner,
        address asset,
        IVault vault,
        ICurve curve,
        uint256 refundRatio,
        bytes memory encodedCurveInfo,
        bytes memory encodedVaultArgs
    ) external;

    /// @notice Deactivate a hub, which prevents a meToken from subscribing
    ///     to it
    /// @param id Unique hub identifier
    function deactivate(uint256 id) external;

    /// @notice Intialize a hub update
    /// @param id                   Unique hub identifier
    /// @param targetCurve          Address of target curve
    /// @param targetRefundRatio    Target rate to refund burners
    /// @param encodedCurveInfo     Additional encoded curve details
    function initUpdate(
        uint256 id,
        address targetCurve,
        uint256 targetRefundRatio,
        bytes memory encodedCurveInfo
    ) external;

    /// @notice Cancel a hub update
    /// @dev Can only be called before startTime
    /// @param id Unique hub identifier
    function cancelUpdate(uint256 id) external;

    /// @notice Finish updating a hub
    /// @param id  Unique hub identifier
    function finishUpdate(uint256 id) external;

    /// @notice Transfer the ownership of a hub
    /// @param id       Unique hub identifier
    /// @param newOwner Address to own the hub
    function transferHubOwnership(uint256 id, address newOwner) external;

    /// @notice Get the time period for a hub to warm up, which is the time
    ///     difference between initUpdate() is called and when the update
    ///     is live
    /// @param amount   Amount of time, in seconds
    function setHubWarmup(uint256 amount) external;

    /// @notice Set the time period for a hub to update, which is the time
    ///     difference etween when the update is live and when finishUpdate()
    ///     is called
    /// @param amount   Amount of time, in seconds
    function setHubDuration(uint256 amount) external;

    /// @notice Set the time period for a hub to cooldown, which is the time
    ///     difference between when finishUpdate() is called and when initUpdate()
    ///     can be called again
    /// @param amount   Amount of time, in seconds
    function setHubCooldown(uint256 amount) external;

    /// @notice View to get information for a hub
    /// @param id Unique hub identifier
    /// @return Information of hub
    function getHubInfo(uint256 id) external view returns (HubInfo memory);

    /// @notice Counter of hubs registered
    /// @return uint256 Unique hub count
    function count() external view returns (uint256);

    /// @notice Get the hub warmup period
    /// @return Period of hub warmup, in seconds
    function hubWarmup() external view returns (uint256);

    /// @notice Get the hub duration period
    /// @return Period of hub duration, in seconds
    function hubDuration() external view returns (uint256);

    /// @notice Get the hub cooldown period
    /// @return Period of hub cooldown, in seconds
    function hubCooldown() external view returns (uint256);
}
