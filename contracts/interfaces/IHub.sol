// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IHub {

    event Register(string name, address indexed vault);  // TODO: decide on arguments
    event SetStatus(uint256 hubId, uint256 status);
    event DeactivateHub(uint256 hubId);

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
        uint256 _refundRatio,
        bytes memory _encodedValueSetArgs,
        bytes memory _encodedVaultAdditionalArgs
    ) external;
    */

    /// @notice TODO
    /// @param _hubId TODO
    function deactivateHub(uint256 _hubId) external;

    /// @notice TODO
    /// @param _hubId TODO
    function startUpdate(uint256 _hubId) external;

    function finishUpdate(
        uint256 _hubId,
        address _migrating,
        address _recollateralizing,
        uint256 _shifting
    ) external;

    /// @notice TODO
    /// @param _hubId TODO
    /// @param status TODO
    function setStatus(uint256 _hubId, uint256 status) external returns (bool);

    /// @notice TODO
    /// @param _hubId TODO
    /// @return TODO
    function getOwner(uint256 _hubId) external view returns (address);

    /// @notice TODO
    /// @param _hubId TODO
    /// @return uint256 TODO
    function getStatus(uint256 _hubId) external view returns (uint256);


    /// @notice TODO
    /// @param _hubId TODO
    /// @return uint256 TODO
    function getRefundRatio(uint256 _hubId) external view returns (uint256);

    /// @notice TODO
    /// @param _hubId TODO
    /// @return name TODO
    /// @return owner TODO
    /// @return vault TODO
    /// @return curve TODO
    /// @return refundRatio TODO
    /// @return status TODO
    function getDetails(uint256 _hubId) external view returns (
        string calldata name,
        address owner,
        address vault,
        address curve,
        uint256 refundRatio,
        uint256 status
    );

    /// @notice TODO
    /// @param _hubId TODO
    /// @return TODO
    function getCurve(uint256 _hubId) external view returns (address);

    /// @notice TODO
    /// @param _hubId TODO
    /// @return TODO
    function getVault(uint256 _hubId) external view returns (address);
   
}