// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

/// @title MeTokens fee interface
/// @author Carter Carlson (@cartercarlson)
interface IFeesFacet {
    /// @notice Event of setting the Mint fee for meTokens protocol
    /// @param rate New fee rate
    event SetMintFee(uint256 rate);

    /// @notice Event of setting the BurnBuyer fee for meTokens protocol
    /// @param rate New fee rate
    event SetBurnBuyerFee(uint256 rate);

    /// @notice Event of setting the BurnOwner fee for meTokens protocol
    /// @param rate New fee rate
    event SetBurnOwnerFee(uint256 rate);

    /// @notice Event of setting the Transfer fee for meTokens protocol
    /// @param rate New fee rate
    event SetTransferFee(uint256 rate);

    /// @notice Event of setting the Interest fee for meTokens protocol
    /// @param rate New fee rate
    event SetInterestFee(uint256 rate);

    /// @notice Event of setting the Yield fee for meTokens protocol
    /// @param rate New fee rate
    event SetYieldFee(uint256 rate);

    /// @notice Set Mint fee for meTokens protocol
    /// @param rate New fee rate
    function setMintFee(uint256 rate) external;

    /// @notice Set BurnBuyer fee for meTokens protocol
    /// @param rate New fee rate
    function setBurnBuyerFee(uint256 rate) external;

    /// @notice Set BurnOwner fee for meTokens protocol
    /// @param rate New fee rate
    function setBurnOwnerFee(uint256 rate) external;

    // /// @notice Set Transfer fee for meTokens protocol
    // /// @param rate New fee rate
    // function setTransferFee(uint256 rate) external;

    // /// @notice Set Interest fee for meTokens protocol
    // /// @param rate New fee rate
    // function setInterestFee(uint256 rate) external;

    // /// @notice Set Yield fee for meTokens protocol
    // /// @param rate New fee rate
    // function setYieldFee(uint256 rate) external;

    /// @notice Get Mint fee
    /// @return uint256 mintFee
    function mintFee() external view returns (uint256);

    /// @notice Get BurnBuyer fee
    /// @return uint256 burnBuyerFee
    function burnBuyerFee() external view returns (uint256);

    /// @notice Get BurnOwner fee
    /// @return uint256 burnOwnerFee
    function burnOwnerFee() external view returns (uint256);

    // /// @notice Get Transfer fee
    // /// @return uint256 transferFee
    // function transferFee() external view returns (uint256);

    // /// @notice Get Interest fee
    // /// @return uint256 interestFee
    // function interestFee() external view returns (uint256);

    // /// @notice Get Yield fee
    // /// @return uint256 yieldFee
    // function yieldFee() external view returns (uint256);
}
