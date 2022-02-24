// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {IVault} from "./IVault.sol";
import {ICurve} from "./ICurve.sol";
import {HubInfo} from "../libs/LibHub.sol";

/// @title MeTokens hub interface
/// @author Carter Carlson (@cartercarlson)
interface IHub {
    /// @notice Event of registering a hub
    /// @param id                  Unique hub identifer
    /// @param owner               Address to own hub
    /// @param asset               Address of underlying asset
    /// @param vault               Address of vault
    /// @param curve               Address of curve
    /// @param refundRatio         Rate to refund burners
    /// @param encodedCurveDetails Additional encoded curve details
    /// @param encodedVaultArgs    Additional encoded vault arguments
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
    /// @param id  Unique hub identifier
    event Deactivate(uint256 id);

    /// @notice Event of initializing a hub update
    /// @param id                     Unique hub identifier
    /// @param targetCurve            Address of target curve
    /// @param targetRefundRatio      Target rate to refund burners
    /// @param encodedCurveDetails    Additional encoded curve details
    /// @param reconfigure            Boolean to show if we're changing the
    ///                                 curveDetails but not the curve address
    /// @param startTime              Timestamp to start updating
    /// @param endTime                Timestamp to end updating
    /// @param endCooldown            Timestamp to allow another update
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
    /// @param owner               Address to own hub
    /// @param asset               Address of vault asset
    /// @param vault               Address of vault
    /// @param curve               Address of curve
    /// @param refundRatio         rate to refund burners
    /// @param encodedCurveDetails Additional encoded curve details
    /// @param encodedVaultArgs    Additional encoded vault arguments
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
    /// @param id                  Unique hub identifier
    /// @param targetCurve         Address of target curve
    /// @param targetRefundRatio   Target rate to refund burners
    /// @param encodedCurveDetails Additional encoded curve details
    function initUpdate(
        uint256 id,
        address targetCurve,
        uint256 targetRefundRatio,
        bytes memory encodedCurveDetails
    ) external;

    /// @notice Cancel a hub update
    /// @dev Can only be called before startTime
    /// @param id Unique hub identifier
    function cancelUpdate(uint256 id) external;

    /// @notice Finish updating a hub
    /// @param id  Unique hub identifier
    /// @return    Details of hub
    function finishUpdate(uint256 id) external returns (HubInfo memory);

    /// @notice Get the details of a hub
    /// @param id   Unique hub identifier
    /// @return     Details of hub
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
