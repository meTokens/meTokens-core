// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;


/// @title Curve ValueSet Interface
/// @author Carl Farterson (@carlfarterson)
/// @dev Required for all Curve ValueSets
interface ICurveValueSet {

    event Updated(uint indexed hubId);

    /// @notice Given a hub, baseX, baseY and connector weight, add the configuration to the
    /// BancorZero ValueSet registry
    /// @dev ValueSet need to be encoded as the Hub may register ValueSets for different curves
    ///      that may contain different ValueSet arguments
    /// @param _hubId                   unique hub identifier
    /// @param _encodedValueSet     encoded ValueSet arguments
    function register(
        uint _hubId,
        bytes calldata _encodedValueSet
    ) external;

    /// @notice TODO
    /// @param _hubId                   unique hub identifier
    /// @param _encodedValueSet     encoded target ValueSet arguments
    function registerTarget(
        uint _hubId,
        bytes calldata _encodedValueSet
    ) external;


    function calculateMintReturn(
        uint _depositAmount,
        uint _hubId,
        uint _supply,
        uint _balancePooled
    ) external view returns (uint meTokenAmount);

    function calculateBurnReturn(
        uint _burnAmount,
        uint _hubId,
        uint _supply,
        uint _balancePooled
    ) external view returns (uint collateralTokenAmount);


    function finishUpdate(uint id) external;
}