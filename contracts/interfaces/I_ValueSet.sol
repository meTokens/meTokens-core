pragma solidity ^0.8.0;

interface I_ValueSet {

    function updateValueSet(
        uint256 _hubId,
        bytes32 _encodedTargetValueSet,
        uint256 _blockStart,
        uint256 _blockTarget
    ) external;


    /// @notice Given a hub, base_x, base_y and connector weight, add the configuration to the
    ///         BancorZero ValueSet registry
    /// @dev ValueSet need to be encoded as the Hub may register ValueSets for different curves
    ///      that may contain different ValueSet arguments
    /// @param _hubId               Identifier of hubs
    /// @param _encodedValueSet     Encoded ValueSet arguments
    function registerValueSet(
        uint256 _hubId,
        bytes32 _encodedValueSet
    ) external;

    /// @notice calculate the amount of meTokens minted when depositing collateral
    /// @notice given a deposit amount (in the collateral token), calculate the amount of meTokens minted
    /// @param _depositAmount   amount of collateral tokens to deposit
    /// @param _hubId           unique hub identifier
    /// @param _supply          current meToken supply
    /// @param _balancePooled   total connector balance
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
    /// @param _balancePooled           total connector balance
    /// @return collateralTokenAmount   amount of collateral returned
    function calculateBurnReturn(
        uint256 _burnAmount,
        uint256 _hubId,
        uint256 _supply,
        uint256 _balancePooled
    ) external view returns (uint256 collateralTokenAmount);

}
