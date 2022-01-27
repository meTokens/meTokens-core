// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

/// @title MeTokens foundry interface
/// @author Carl Farterson (@carlfarterson)
interface IFoundry {
    /// @notice Event of minting a meToken
    /// @param _meToken         address of meToken minted
    /// @param _asset           address of asset deposited
    /// @param _depositor       address to deposit asset
    /// @param _recipient       address to receive minted meTokens
    /// @param _assetsDeposited amount of assets deposited
    /// @param _meTokensMinted  amount of meTokens minted
    event Mint(
        address _meToken,
        address _asset,
        address _depositor,
        address _recipient,
        uint256 _assetsDeposited,
        uint256 _meTokensMinted
    );

    /// @notice Event of burning a meToken
    /// @param _meToken         address of meToken burned
    /// @param _asset           address of asset returned
    /// @param _burner          address to burn meTokens
    /// @param _recipient       address to receive underlying asset
    /// @param _meTokensBurned  amount of meTokens to burn
    /// @param _assetsReturned  amount of assets
    event Burn(
        address _meToken,
        address _asset,
        address _burner,
        address _recipient,
        uint256 _meTokensBurned,
        uint256 _assetsReturned
    );

    /// @notice Event of donating to meToken owner
    /// @param _meToken         address of meToken burned
    /// @param _asset           address of asset returned
    /// @param _donor           address donating the asset
    /// @param _assetsDeposited amount of assets to c
    event Donate(
        address _meToken,
        address _asset,
        address _donor,
        uint256 _assetsDeposited
    );

    /// @notice Mint a meToken by depositing the underlying asset
    /// @param _meToken         address of meToken to mint
    /// @param _assetsDeposited amount of assets to deposit
    /// @param _recipient       address to receive minted meTokens
    function mint(
        address _meToken,
        uint256 _assetsDeposited,
        address _recipient
    ) external;

    /// @notice Burn a meToken to receive the underlying asset
    /// @param _meToken         address of meToken to burn
    /// @param _meTokensBurned  amount of meTokens to burn
    /// @param _recipient       address to receive the underlying assets
    function burn(
        address _meToken,
        uint256 _meTokensBurned,
        address _recipient
    ) external;

    /// @notice Donate a meToken's underlying asset to its owner
    /// @param _meToken         address of meToken to burn
    /// @param _assetsDeposited amount of asset to donate
    function donate(address _meToken, uint256 _assetsDeposited) external;
}
