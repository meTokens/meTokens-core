// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IMeTokenRegistry {

    /// @notice TODO
    /// @param _name TODO
    /// @param _symbol TODO
    /// @param _hubId TODO
    /// @param _collateralDeposited TODO
    function registerMeToken(
        string calldata _name,
        string calldata _symbol,
        uint256 _hubId,
        uint256 _collateralDeposited
    ) external;

    /// @notice TODO
    /// @return TODO
    function toggleUpdating() external returns (bool);

    /// @notice TODO
    /// @param _owner TODO
    /// @return TODO
    function isMeTokenOwner(address _owner) external view returns (bool);

    /// @notice TODO
    /// @param _owner TODO
    /// @return TODO
    function getMeTokenByOwner(address _owner) external view returns (address);

    /// @notice TODO
    /// @param meToken Address of meToken queried
    /// @return owner Owner of MeToken
    /// @return hubId Hub to which the meToken is subscribed
    /// @return balancePooled Units of collateral pooled
    /// @return balanceLocked Units of collateral locked
    /// @return resubscribing Is meToken changing hubs? 
    function getDetails(
        address meToken
    ) external view returns (
        address owner,
        uint256 hubId,
        uint256 balancePooled,
        uint256 balanceLocked,
        bool resubscribing 
    );

    function transferMeTokenOwnership(address _meToken, address _newOwner) external;
    function incrementBalancePooled(bool add, address _meToken, uint256 _amount) external;
    function incrementBalanceLocked(bool add, address _meToken, uint256 _amount) external;
}