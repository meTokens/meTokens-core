// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

/// @title MeTokens foundry interface
/// @author Carter Carlson (@cartercarlson), Parv Garg (@parv3213)
interface IFoundryFacet {
    /// @notice Event of minting a meToken
    /// @param meToken         Address of meToken minted
    /// @param asset           Address of asset deposited
    /// @param depositor       Address to deposit asset
    /// @param recipient       Address to receive minted meTokens
    /// @param assetsDeposited Amount of assets deposited
    /// @param meTokensMinted  Amount of meTokens minted
    event Mint(
        address meToken,
        address asset,
        address depositor,
        address recipient,
        uint256 assetsDeposited,
        uint256 meTokensMinted
    );

    /// @notice Event of burning a meToken
    /// @param meToken         Address of meToken burned
    /// @param asset           Address of asset returned
    /// @param burner          Address to burn meTokens
    /// @param recipient       Address to receive underlying asset
    /// @param meTokensBurned  Amount of meTokens to burn
    /// @param assetsReturned  Amount of assets
    event Burn(
        address meToken,
        address asset,
        address burner,
        address recipient,
        uint256 meTokensBurned,
        uint256 assetsReturned
    );

    /// @notice Event of donating to meToken owner
    /// @param meToken         Address of meToken burned
    /// @param asset           Address of asset returned
    /// @param donor           Address donating the asset
    /// @param assetsDeposited Amount of asset to donate
    event Donate(
        address meToken,
        address asset,
        address donor,
        uint256 assetsDeposited
    );

    /// @notice Mint a meToken by depositing the underlying asset
    /// @param meToken          Address of meToken to mint
    /// @param assetsDeposited  Amount of assets to deposit
    /// @param recipient        Address to receive minted meTokens
    function mint(
        address meToken,
        uint256 assetsDeposited,
        address recipient
    ) external;

    /// @notice Mint a meToken by depositing a EIP compliant asset
    /// @param meToken          Address of meToken to mint
    /// @param assetsDeposited  Amount of assets to deposit
    /// @param recipient        Address to receive minted meTokens
    /// @param deadline  The time at which this expires (unix time)
    /// @param v         v of the signature
    /// @param r         r of the signature
    /// @param s         s of the signature
    function mintWithPermit(
        address meToken,
        uint256 assetsDeposited,
        address recipient,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    /// @notice Burn a meToken to receive the underlying asset
    /// @param meToken          Address of meToken to burn
    /// @param meTokensBurned   Amount of meTokens to burn
    /// @param recipient        Address to receive the underlying assets
    function burn(
        address meToken,
        uint256 meTokensBurned,
        address recipient
    ) external;

    /// @notice Donate a meToken's underlying asset to its owner
    /// @param meToken          Address of meToken to burn
    /// @param assetsDeposited  Amount of asset to donate
    function donate(address meToken, uint256 assetsDeposited) external;
}
