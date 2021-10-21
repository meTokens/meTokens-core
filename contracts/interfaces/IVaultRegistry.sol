// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IVaultRegistry {
    event Approve(address vault);
    event Unapprove(address vault);

    /// @notice Add a vault to the vault registry
    /// @param _vault TODO
    function approve(address _vault) external;

    /// @notice Remove a vault from the vault registry
    /// @param _vault TODO
    function unapprove(address _vault) external;

    /// @notice TODO
    /// @param _vault TODO
    /// @return TODO
    function isApproved(address _vault) external view returns (bool);
}
