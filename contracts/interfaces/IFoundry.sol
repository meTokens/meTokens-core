// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

/// @title MeTokens foundry interface
/// @author Carl Farterson (@carlfarterson)
interface IFoundry {
    /// @notice Event of minting a meToken
    /// @param meToken         address of meToken minted
    /// @param asset           address of asset deposited
    /// @param depositor       address to deposit asset
    /// @param recipient       address to receive minted meTokens
    /// @param assetsDeposited amount of assets deposited
    /// @param meTokensMinted  amount of meTokens minted
    event Mint(
        address meToken,
        address asset,
        address depositor,
        address recipient,
        uint256 assetsDeposited,
        uint256 meTokensMinted
    );

    /// @notice Event of burning a meToken
    /// @param meToken         address of meToken burned
    /// @param asset           address of asset returned
    /// @param burner          address to burn meTokens
    /// @param recipient       address to receive underlying asset
    /// @param meTokensBurned  amount of meTokens to burn
    /// @param assetsReturned  amount of assets
    event Burn(
        address meToken,
        address asset,
        address burner,
        address recipient,
        uint256 meTokensBurned,
        uint256 assetsReturned
    );

    /// @notice Event of donating to meToken owner
    /// @param meToken         address of meToken burned
    /// @param asset           address of asset returned
    /// @param donor           address donating the asset
    /// @param assetsDeposited amount of assets to c
    event Donate(
        address meToken,
        address asset,
        address donor,
        uint256 assetsDeposited
    );

    /// @notice Mint a meToken by depositing the underlying asset
    /// @param meToken         address of meToken to mint
    /// @param assetsDeposited amount of assets to deposit
    /// @param recipient       address to receive minted meTokens
    function mint(
        address meToken,
        uint256 assetsDeposited,
        address recipient
    ) external;

    /// @notice Burn a meToken to receive the underlying asset
    /// @param meToken         address of meToken to burn
    /// @param meTokensBurned  amount of meTokens to burn
    /// @param recipient       address to receive the underlying assets
    function burn(
        address meToken,
        uint256 meTokensBurned,
        address recipient
    ) external;

    /// @notice Donate a meToken's underlying asset to its owner
    /// @param meToken         address of meToken to burn
    /// @param assetsDeposited amount of asset to donate
    function donate(address meToken, uint256 assetsDeposited) external;
}
