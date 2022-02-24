// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

/// @title Generic Curve interface
/// @author Carter Carlson (@cartercarlson), @zgorizzo69
/// @dev Required for all Curves
interface ICurve {
    /// @notice Event when curveDetails are updated from target values to actual values
    event Updated(uint256 indexed hubId);

    /// @notice Given a hub, baseX, baseY and connector weight, add the configuration to the
    /// BancorZero Curve registry
    /// @dev Curve need to be encoded as the Hub may register Curves for different curves
    ///      that may contain different Curve arguments
    /// @param hubId           Unique hub identifier
    /// @param encodedDetails  Encoded Curve arguments
    function register(uint256 hubId, bytes calldata encodedDetails) external;

    /// @notice Initialize reconfiguring curveDetails for a hub
    /// @param hubId           Unique hub identifier
    /// @param encodedDetails  Encoded target Curve arguments
    function initReconfigure(uint256 hubId, bytes calldata encodedDetails)
        external;

    /// @notice Finish reconfiguring curveDetails for a hub
    /// @param hubId Unique hub identifier
    function finishReconfigure(uint256 hubId) external;

    /// @notice Get curveDetails for a hub
    /// @return curveDetails (TODO: curve w/ more than 4 curveDetails)
    function getCurveDetails(uint256 hubId)
        external
        view
        returns (uint256[4] memory);

    /// @notice Calculate meTokens minted based on a curve's active details
    /// @param assetsDeposited  Amount of assets deposited to the hub
    /// @param hubId            Unique hub identifier
    /// @param supply           Current meToken supply
    /// @param balancePooled    Area under curve
    /// @return meTokensMinted  Amount of MeTokens minted
    function viewMeTokensMinted(
        uint256 assetsDeposited,
        uint256 hubId,
        uint256 supply,
        uint256 balancePooled
    ) external view returns (uint256 meTokensMinted);

    /// @notice Calculate assets returned based on a curve's active details
    /// @param meTokensBurned   Amount of assets deposited to the hub
    /// @param hubId            Unique hub identifier
    /// @param supply           Current meToken supply
    /// @param balancePooled    Area under curve
    /// @return assetsReturned  Amount of assets returned
    function viewAssetsReturned(
        uint256 meTokensBurned,
        uint256 hubId,
        uint256 supply,
        uint256 balancePooled
    ) external view returns (uint256 assetsReturned);

    /// @notice Calculate meTokens minted based on a curve's target details
    /// @param assetsDeposited  Amount of assets deposited to the hub
    /// @param hubId            Unique hub identifier
    /// @param supply           Current meToken supply
    /// @param balancePooled    Area under curve
    /// @return meTokensMinted  Amount of MeTokens minted
    function viewTargetMeTokensMinted(
        uint256 assetsDeposited,
        uint256 hubId,
        uint256 supply,
        uint256 balancePooled
    ) external view returns (uint256 meTokensMinted);

    /// @notice Calculate assets returned based on a curve's target details
    /// @param meTokensBurned   Amount of assets deposited to the hub
    /// @param hubId            Unique hub identifier
    /// @param supply           Current meToken supply
    /// @param balancePooled    Area under curve
    /// @return assetsReturned  Amount of assets returned
    function viewTargetAssetsReturned(
        uint256 meTokensBurned,
        uint256 hubId,
        uint256 supply,
        uint256 balancePooled
    ) external view returns (uint256 assetsReturned);
}
