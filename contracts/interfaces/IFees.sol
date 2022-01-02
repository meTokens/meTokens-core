// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

/// @title MeTokens protocol fee interface
/// @author Carl Farterson (@carlfarterson)
interface IFees {
    /// @notice Set meToken protocol BurnBuyer fee
    /// @param _fee new fee
    function setBurnBuyerFee(uint256 _fee) external;

    /// @notice Set meToken protocol BurnOwner fee
    /// @param _fee new fee
    function setBurnOwnerFee(uint256 _fee) external;

    /// @notice Set meToken protocol Transfer fee
    /// @param _fee new fee
    function setTransferFee(uint256 _fee) external;

    /// @notice Set meToken protocol Interest fee
    /// @param _fee new fee
    function setInterestFee(uint256 _fee) external;

    /// @notice Set meToken protocol Yield fee
    /// @param _fee new fee
    function setYieldFee(uint256 _fee) external;

    /// @notice Get mint fee
    /// @return uint256 _mintFee
    function mintFee() external view returns (uint256);

    /// @notice Get burnBuyer fee
    /// @return uint256 _burnBuyerFee
    function burnBuyerFee() external view returns (uint256);

    /// @notice Get burnOwner fee
    /// @return uint256 _burnOwnerFee
    function burnOwnerFee() external view returns (uint256);

    /// @notice Get transfer fee
    /// @return uint256 _transferFee
    function transferFee() external view returns (uint256);

    /// @notice Get interest fee
    /// @return uint256 _interestFee
    function interestFee() external view returns (uint256);

    /// @notice Get yield fee
    /// @return uint256 _yieldFee
    function yieldFee() external view returns (uint256);
}
