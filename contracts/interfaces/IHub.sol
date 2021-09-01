// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IHub {

    event Register(string name, address indexed vault);  // TODO: decide on arguments
    event Deactivate(uint id);

    /*
    /// @notice TODO
    /// @param _name TODO
    /// @param _owner TODO
    /// @param _vaultName TODO
    /// @param _vaultOwner TODO
    /// @param _vaultFactory TODO
    /// @param _curve TODO
    /// @param _collateralAsset TODO
    /// @param _refundRatio TODO
    /// @param _encodedValueSetArgs TODO
    /// @param _encodedVaultAdditionalArgs TODO
    function register(
        string calldata _name,
        address _owner,
        string calldata _vaultName,
        address _vaultOwner,
        address _vaultFactory,
        address _curve,
        address _collateralAsset,
        uint _refundRatio,
        bytes memory _encodedValueSetArgs,
        bytes memory _encodedVaultAdditionalArgs
    ) external;
    */

    /// @notice Function to modify a hubs' status to INACTIVE
    /// @param id Unique hub identifier
    function deactivate(uint id) external;

    /// @notice Function to modify a hubs' status to QUEUED
    /// @param id Unique hub identifier
    function startUpdate(uint id) external;

    /// @notice Function to end the update, setting the target values of the hub,
    ///         as well as modifying a hubs' status to ACTIVE
    /// @param id Unique hub identifier
    /// @param migrating Target migration contract
    /// @param recollateralizing Target recollateralization contract
    /// @param shifting Target refundRatio
    function finishUpdate(
        uint    id,
        address migrating,
        address recollateralizing,
        uint    shifting
    ) external;

    /// @notice TODO
    /// @param id Unique hub identifier
    /// @return name Name of hub
    /// @return owner Owner of hub
    /// @return vault Vault of hub
    /// @return curve Curve of hub
    /// @return refundRatio refundRatio of hub
    /// @return status Status of hub
    function getDetails(uint id) external view returns (
        string calldata name,
        address owner,
        address vault,
        address curve,
        uint refundRatio,
    );

    /// @notice Helper to fetch only owner of hubDetails
    /// @param id Unique hub identifier
    /// @return Address of owner
    function getOwner(uint id) external view returns (address);

    /// @notice Helper to fetch only vault of hubDetails
    /// @param id Unique hub identifier
    /// @return Address of vault
    function getVault(uint id) external view returns (address);


    /// @notice Helper to fetch only curve of hubDetails
    /// @param id Unique hub identifier
    /// @return Address of curve
    function getCurve(uint id) external view returns (address);

    /// @notice Helper to fetch only refundRatio of hubDetails
    /// @param id Unique hub identifier
    /// @return uint Return refundRatio
    function getRefundRatio(uint id) external view returns (uint);

    /// @notice TODO
    /// @param id Unique hub identifier
    /// @return bool is the hub active?
    function isActive(uint id) external view returns (bool);
}