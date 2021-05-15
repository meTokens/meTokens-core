pragma solidity ^0.8.0;


/// @title Curve ValueSet Interface
/// @author Carl Farterson (@carlfarterson)
/// @dev Required for all Curve ValueSets
interface I_ValueSet {

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


    /// @notice Given a hub, base_x, base_y and connector weight, add the configuration to the
    /// BancorZero ValueSet registry
    /// @dev ValueSet need to be encoded as the Hub may register ValueSets for different curves
    ///      that may contain different ValueSet arguments
    /// @param _hubId               unique hub identifier
    /// @param _encodedValueSet     encoded ValueSet arguments
    function registerValueSet(
        uint256 _hubId,
        bytes32 _encodedValueSet
    ) external;


    /// @notice calculate the amount of meTokens minted when depositing collateral
    /// @notice given a deposit amount (in the collateral token), calculate the amount of meTokens minted
    /// @param _depositAmount   amount of collateral tokens to deposit
    /// @param _hubId           unique hub identifier
    /// @param _supply          current meToken supply
    /// @param _balancePooled   balance of collateral pooled
    /// @return meTokenAmount   amount of meTokens minted
    function calculateMintReturn(
        uint256 _depositAmount,
        uint256 _hubId,
        uint256 _supply,
        uint256 _balancePooled
    ) external view returns (uint256 meTokenAmount);


    /// @notice Calculate the amount of collateral returned when burning meTokens
    /// @param _burnAmount              amount of meTokens to burn
    /// @param _hubId                   unique hub identifier
    /// @param _supply                  current meToken supply
    /// @param _balancePooled           balance of collateral pooled
    /// @return collateralTokenAmount   amount of collateral returned
    function calculateBurnReturn(
        uint256 _burnAmount,
        uint256 _hubId,
        uint256 _supply,
        uint256 _balancePooled
    ) external view returns (uint256 collateralTokenAmount);

}
