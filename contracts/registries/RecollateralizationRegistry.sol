// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../interfaces/IRecollateralizationRegistry.sol";

/// @title Recollateralization registry
/// @author Carl Farterson (@carlfarterson)
/// @notice Keeps track of all used Recollateralization strategies 
abstract contract RecollateralizationRegistry is IRecollateralizationRegistry {

    event Register(address recollateralization);
    event Approve(address factory);
    event Unapprove(address factory);

    uint256 private _recollateralizationCount;
	mapping (address => Details) recollateralizations;
    mapping (address => bool) private approved;

    struct Details {
        address recollateralization;
        address targetVault;
        address collateralTokenStart;
        address collateralTokenIntra;
        bool active; // TODO: is this needed?
    }

    function register(
        address _recollateralization,
        address _targetVault,
        address _collateralTokenStart,
        address _collateralTokenIntra
    ) external override {
        require(approved[msg.sender], "!approved");
        // Add recollateralization details to storage
        Details memory r = Details(
            _recollateralization,
            _targetVault,
            _collateralTokenStart,
            _collateralTokenIntra,
            true
        );
        recollateralizations[_recollateralization] = r;

        emit Register(_recollateralization);
    }

    function approve(address _factory) external override {
        // TODO: access control
        require(!approved[_factory], "Already approved");
        approved[_factory] = true;
        emit Approve(_factory);
    }

    function unapprove(address _factory) external override {
        // TODO: access control
        require(approved[_factory], "!approved");
        approved[_factory] = false;
        emit Unapprove(_factory);
    }

    function isApproved(address _factory) external view override returns (bool) {
        return approved[_factory];
    }


    function deactivate() external returns(uint256) {}

    // TODO: function isActiveRecollateralization ?


    /// @inheritdoc IRecollateralizationRegistry
    function recollateralizationCount() external view override returns (uint256) {
        return _recollateralizationCount;
    }

    // function getDetails(address recollater) external view override returns (
    //     address recollateralization,
    //     address targetVault,
    //     address collateralTokenStart,
    //     address collateralTokenIntra,
    //     address collateralTokenEnd,
    //     bool active
    // )
}