// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IMeTokenRegistry {

    event Register(
        address indexed meToken,
        address indexed owner,
        string name,
        string symbol,
        uint256 hubId
    );
    event TransferOwnership(address from, address to, address meToken);
    event IncrementBalancePooled(bool add, address meToken, uint256 amount);
    event IncrementBalanceLocked(bool add, address meToken, uint256 amount);

    /// @notice TODO
    /// @param _name TODO
    /// @param _symbol TODO
    /// @param _hubId TODO
    /// @param _collateralDeposited TODO
    function register(
        string calldata _name,
        string calldata _symbol,
        uint256 _hubId,
        uint256 _collateralDeposited
    ) external;

    // /// @notice TODO
    // /// @return TODO
    // function toggleUpdating() external returns (bool);

    /// @notice TODO
    /// @param _owner TODO
    /// @return TODO
    function isOwner(address _owner) external view returns (bool);

    /// @notice TODO
    /// @param _owner TODO
    /// @return TODO
    function getOwnerMeToken(address _owner) external view returns (address);

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

    function transferOwnership(address _meToken, address _newOwner) external;
    function incrementBalancePooled(bool add, address _meToken, uint256 _amount) external;
    function incrementBalanceLocked(bool add, address _meToken, uint256 _amount) external;
}