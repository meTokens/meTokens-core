// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../libs/Details.sol";

interface IMeTokenRegistry {
    event Subscribe(
        address indexed _meToken,
        address indexed _owner,
        uint256 _minted,
        address _collateralToken,
        uint256 _collateralDeposited,
        string _name,
        string _symbol,
        uint256 _hubId
    );
    event InitResubscribe(
        address indexed _meToken,
        uint256 _targetHubId,
        address _migration,
        bytes _encodedMigrationArgs
    );
    event CancelResubscribe(address indexed _meToken);
    event FinishResubscribe(address indexed _meToken);
    event UpdateBalances(address _meToken, uint256 _newBalance);
    event TransferMeTokenOwnership(
        address _from,
        address _to,
        address _meToken
    );
    event UpdateBalancePooled(bool add, address _meToken, uint256 _amount);
    event UpdateBalanceLocked(bool add, address _meToken, uint256 _amount);

    /// @notice TODO
    /// @param _name TODO
    /// @param _symbol TODO
    /// @param _hubId TODO
    /// @param _assetsDeposited TODO
    function subscribe(
        string calldata _name,
        string calldata _symbol,
        uint256 _hubId,
        uint256 _assetsDeposited
    ) external;

    /// @notice TODO
    /// @param _meToken TODO
    /// @param _targetHubId TODO
    /// @param _migration TODO
    /// @param _encodedMigrationArgs TODO
    function initResubscribe(
        address _meToken,
        uint256 _targetHubId,
        address _migration,
        bytes memory _encodedMigrationArgs
    ) external;

    /// @notice TODO
    /// @param _meToken TODO
    function cancelResubscribe(address _meToken) external;

    /// @notice TODO
    /// @param _meToken TODO
    /// @return TODO
    function finishResubscribe(address _meToken)
        external
        returns (Details.MeToken memory);

    /// @notice TODO
    /// @param _meToken TODO
    /// @param _newBalance TODO
    function updateBalances(address _meToken, uint256 _newBalance) external;

    /// @notice TODO
    /// @param add TODO
    /// @param _meToken TODO
    /// @param _amount TODO
    function updateBalancePooled(
        bool add,
        address _meToken,
        uint256 _amount
    ) external;

    /// @notice TODO
    /// @param add TODO
    /// @param _meToken TODO
    /// @param _amount TODO
    function updateBalanceLocked(
        bool add,
        address _meToken,
        uint256 _amount
    ) external;

    /// @notice TODO
    /// @param _newOwner TODO
    function transferMeTokenOwnership(address _newOwner) external;

    /// @notice TODO
    /// @param _owner TODO
    /// @return TODO
    function getOwnerMeToken(address _owner) external view returns (address);

    /// @notice TODO
    /// @param meToken Address of meToken queried
    /// @return meToken_ details of the meToken
    function getDetails(address meToken)
        external
        view
        returns (Details.MeToken memory meToken_);

    /// @notice TODO
    /// @param _owner TODO
    /// @return TODO
    function isOwner(address _owner) external view returns (bool);
}
