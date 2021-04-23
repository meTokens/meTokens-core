pragma solidity ^0.8.0;

interface I_MeTokenRegistry {

    /// @notice TODO
    /// @param _name TODO
    /// @param _owner TODO
    /// @param _symbol TODO
    /// @param _hub TODO
    function registerMeToken(
        string calldata _name,
        address _owner,
        string calldata _symbol,
        uint256 _hub
    ) external;


    /// @notice subscribe a newly instantiated meToken to a current hub
    /// @param _meToken TODO
    /// @param _hub TODO
    function suscribeMeToken(address _meToken, uint256 _hub) external;


    /// @notice TODO
    /// @return TODO
    function toggleUpdating() external returns (bool);

    /// @notice TODO
    /// @param _owner TODO
    /// @return TODO
    function isMeTokenOwner(address _owner) external view returns (bool);


    /// @notice TODO
    /// @param _meToken TODO
    /// @return TODO
    function getMeTokenHub(address _meToken) external view returns (uint256);

    /// @notice TODO
    /// @param _meToken TODO
    /// @return TODO
    function getMeTokenDetails(address _meToken) external view returns (MeTokenDetails 


}