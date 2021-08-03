// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IHub {

    event Register(string name, address indexed vault);  // TODO: decide on arguments
    event SetStatus(uint id, uint status);
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
    /// @return name TODO
    /// @return owner TODO
    /// @return vault TODO
    /// @return curve TODO
    /// @return refundRatio TODO
    /// @return status TODO
    function getDetails(uint id) external view returns (
        string calldata name,
        address owner,
        address vault,
        address curve,
        uint refundRatio,
        uint status
    );

    /// @notice TODO
    /// @param id Unique hub identifier
    /// @return TODO
    function getOwner(uint id) external view returns (address);

    /// @notice TODO
    /// @param id Unique hub identifier
    /// @return TODO
    function getVault(uint id) external view returns (address);


    /// @notice TODO
    /// @param id Unique hub identifier
    /// @return TODO
    function getCurve(uint id) external view returns (address);

    /// @notice TODO
    /// @param id Unique hub identifier
    /// @return uint TODO
    function getRefundRatio(uint id) external view returns (uint);

    /// @notice TODO
    /// @param id Unique hub identifier
    /// @return uint TODO
    function getStatus(uint id) external view returns (uint);

    /// @notice Function to modify a hubs' Status 
    /// @param id Unique hub identifier
    /// @param status TODO
    function setStatus(uint id, uint status) external returns (bool);
}