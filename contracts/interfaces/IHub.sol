// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IHub {

    function startUpdate(uint256 _hubId) external;
    function finishUpdate(
        uint256 _hubId,
        address _migrating,
        address _recollateralizing,
        uint256 _shifting
    ) external;
    
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

    /// @notice TODO
    /// @param _meToken TODO
    /// @param _collateralDeposited TODO
    function mint(address _meToken, uint256 _collateralDeposited) external;

    /// @notice TODO
    /// @param _meToken TODO
    /// @param _meTokensBurned TODO
    function burn(address _meToken, uint256 _meTokensBurned) external;

    /// @notice TODO
    /// @param _hubId TODO
    function deactivateHub(uint256 _hubId) external;

    /// @notice TODO
    /// @param _hubId TODO
    /// @return Status TODO
    // TODO: import Status struct 
    function getStatus(uint256 _hubId) external view returns (uint256);

    // TODO
    function getOwner(uint256 _hubId) external view returns (address);

    // TODO
    function getRefundRatio(uint256 _hubid) external view returns (uint256);

    // TODO
    function getDetails(uint256 _hubId) external view returns (
        string calldata name,
        address owner,
        address vault,
        address curve_,
        uint256 refundRatio,
        uint256 status
    );

    /// @notice TODO
    /// @param _hubId TODO
    /// @return TODO
    function getVault(uint256 _hubId) external view returns (address);

    /// @notice TODO
    /// @param _hubId TODO
    /// @return TODO
    function getCurve(uint256 _hubId) external view returns (address);
    
}