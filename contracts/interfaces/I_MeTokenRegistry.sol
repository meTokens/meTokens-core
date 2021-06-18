// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface I_MeTokenRegistry {

    /// @notice TODO
    /// @param _name TODO
    /// @param _owner TODO
    /// @param _symbol TODO
    /// @param _hubId TODO
    function registerMeToken(
        string calldata _name,
        address _owner,
        string calldata _symbol,
        uint256 _hubId
    ) external;

    /// @notice TODO
    /// @return TODO
    function toggleUpdating() external returns (bool);

    /// @notice TODO
    /// @param _owner TODO
    /// @return TODO
    function isMeTokenOwner(address _owner) external view returns (bool);

    // TODO
    function getMeTokenDetails(
        address _meToken
    ) external view returns (
        address owner,
        uint256 hubId,
        uint256 balancePooled,
        uint256 balanceLocked,
        bool migrating
    );

}