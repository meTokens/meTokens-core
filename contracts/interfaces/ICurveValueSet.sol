// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;


/// @title Curve ValueSet Interface
/// @author Carl Farterson (@carlfarterson)
/// @dev Required for all Curve ValueSets
interface ICurveValueSet {

    /// @notice Update a ValueSet to new parameters
    /// @param _hubId                   unique hub identifier
    /// @param _encodedTargetValueSet   encoded parameters for the new ValueSet
    /// @param _blockStart              block to start updating the ValueSet
    /// @param _blockTarget             block to end updating the ValueSet
    function updateValueSet(
        uint256 _hubId,
        bytes32 _encodedTargetValueSet,
        uint256 _blockStart,
        uint256 _blockTarget
    ) external;

    /// @notice Given a hub, baseX, baseY and connector weight, add the configuration to the
    /// BancorZero ValueSet registry
    /// @dev ValueSet need to be encoded as the Hub may register ValueSets for different curves
    ///      that may contain different ValueSet arguments
    /// @param _hubId               unique hub identifier
    /// @param _encodedValueSet     encoded ValueSet arguments
    function register(
        uint256 _hubId,
        bytes calldata _encodedValueSet
    ) external;

    /// @notice TODO
    /// @param _hubId               unique hub identifier
    /// @param _encodedValueSet     encoded target ValueSet arguments
    function registerTarget(
        uint256 _hubId,
        bytes calldata _encodedValueSet
    ) external;


    function calculateMintReturn(
        uint256 _depositAmount,
        uint256 _hubId,
        uint256 _supply,
        uint256 _balancePooled
    ) external view returns (uint256 meTokenAmount);

    function calculateBurnReturn(
        uint256 _burnAmount,
        uint256 _hubId,
        uint256 _supply,
        uint256 _balancePooled
    ) external view returns (uint256 collateralTokenAmount);


    function finishUpdate(uint256 _hubId) external;
}