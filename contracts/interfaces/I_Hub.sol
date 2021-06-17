pragma solidity ^0.8.0;

interface I_Hub {

    /// @notice TODO
    /// @param _name TODO
    /// @param _owner TODO
    /// @param _vaultName TODO
    /// @param _vaultOwner TODO
    /// @param _vaultFactory TODO
    /// @param _curve TODO
    /// @param _encodedValueSetArgs TODO
    /// @param _encodedVaultAdditionalArgs TODO
    function registerHub(
        string calldata _name,
        address _owner,
        string calldata _vaultName,
        address _vaultOwner,
        address _vaultFactory,
        address _curve,
        bytes4 _encodedValueSetArgs,
        bytes4 _encodedVaultAdditionalArgs
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
    function getHubStatus(uint256 _hubId) external view returns (uint256);

    // TODO
    function getHubOwner(uint256 _hubId) external view returns (address);

    // TODO
    function getHubDetails(uint256 _hubId) external view returns (
        string calldata name,
        address owner,
        address vault,
        address curve_,
        uint256 valueSet,
        uint256 refundRatio,
        uint256 status
    );

    /// @notice TODO
    /// @param _hubId TODO
    /// @return TODO
    function getHubVault(uint256 _hubId) external view returns (address);

    /// @notice TODO
    /// @param _hubId TODO
    /// @return TODO
    function getHubCurve(uint256 _hubId) external view returns (address);
    
}