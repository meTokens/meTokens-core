// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;


/// @title Curve ValueSet Interface
/// @author Carl Farterson (@carlfarterson)
/// @dev Required for all Curve ValueSets
interface ICurveValueSet {

    event Updated(uint indexed id);

    /// @notice Given a hub, baseX, baseY and connector weight, add the configuration to the
    /// BancorZero ValueSet registry
    /// @dev ValueSet need to be encoded as the Hub may register ValueSets for different curves
    ///      that may contain different ValueSet arguments
    /// @param id                   unique hub identifier
    /// @param _encodedValueSet     encoded ValueSet arguments
    function register(
        uint id,
        bytes calldata _encodedValueSet
    ) external;

    /// @notice TODO
    /// @param id                   unique hub identifier
    /// @param _encodedValueSet     encoded target ValueSet arguments
    function registerTarget(
        uint id,
        bytes calldata _encodedValueSet
    ) external;


    function calculateMintReturn(
        uint _depositAmount,
        uint id,
        uint _supply,
        uint _balancePooled
    ) external view returns (uint meTokenAmount);

    function calculateBurnReturn(
        uint _burnAmount,
        uint id,
        uint _supply,
        uint _balancePooled
    ) external view returns (uint collateralTokenAmount);


    function finishUpdate(uint id) external;
}