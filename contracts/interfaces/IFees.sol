// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

/// @title MeTokens protocol fee interface
/// @author Carl Farterson (@carlfarterson)
interface IFees {
    /// @notice Set meToken protocol BurnBuyer fee
    /// @param fee new fee
    function setBurnBuyerFee(uint256 fee) external;

    /// @notice Set meToken protocol BurnOwner fee
    /// @param fee new fee
    function setBurnOwnerFee(uint256 fee) external;

    /// @notice Set meToken protocol Transfer fee
    /// @param fee new fee
    function setTransferFee(uint256 fee) external;

    /// @notice Set meToken protocol Interest fee
    /// @param fee new fee
    function setInterestFee(uint256 fee) external;

    /// @notice Set meToken protocol Yield fee
    /// @param fee new fee
    function setYieldFee(uint256 fee) external;

    /// @notice Get mint fee
    /// @return uint256 mintFee
    function mintFee() external view returns (uint256);

    /// @notice Get burnBuyer fee
    /// @return uint256 burnBuyerFee
    function burnBuyerFee() external view returns (uint256);

    /// @notice Get burnOwner fee
    /// @return uint256 burnOwnerFee
    function burnOwnerFee() external view returns (uint256);

    /// @notice Get transfer fee
    /// @return uint256 transferFee
    function transferFee() external view returns (uint256);

    /// @notice Get interest fee
    /// @return uint256 interestFee
    function interestFee() external view returns (uint256);

    /// @notice Get yield fee
    /// @return uint256 yieldFee
    function yieldFee() external view returns (uint256);
}
