// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../interfaces/IRecollateralizationRegistry.sol";

/// @title Recollateralization registry
/// @author Carl Farterson (@carlfarterson)
/// @notice Keeps track of all used Recollateralization strategies 
abstract contract RecollateralizationRegistry is IRecollateralizationRegistry {

    event Register(address recollateralization);
    event ApproveFactory(address factory);
    event UnapproveFactory(address factory);

    uint256 private _recollateralizationCount;
	mapping (address => RecollaterlizationDetails) recollateralizations;
    mapping (address => bool) private approvedRecollateralizationFactories;

    struct RecollaterlizationDetails {
        address recollateralization;
        address targetVault;
        address collateralTokenStart;
        address collateralTokenIntra;
        bool active; // TODO: is this needed?
    }

    function Register(
        address _recollateralization,
        address _targetVault,
        address _collateralTokenStart,
        address _collateralTokenIntra
    ) external override {
        require(approvedRecollateralizationFactories[msg.sender], "!authorized");
        // Add recollateralization details to storage
        RecollaterlizationDetails memory r = RecollaterlizationDetails(
            _recollateralization,
            _targetVault,
            _collateralTokenStart,
            _collateralTokenIntra,
            true
        );
        recollateralizations[_recollateralization] = r;

        emit Register(_recollateralization);
    }

    function approveRecollateralizationFactory(address _factory) external override {
        // TODO: access control
        require(!approvedRecollateralizationFactories[_factory], "Already approved");
        approvedRecollateralizationFactories[_factory] = true;
        emit ApproveRecollateralizationFactory(_factory);
    }

    actory(address _factory) external override {
        // TODO: access control
        require(approvedRecollateralizationFactories[_factory], "!approved");
        approvenFactories[_factory] = false;
        emit UnapproveFactory(_factory);
    }

    function deactivateRecollateralization() external returns(uint256) {}
    function reactivateRecollateralization() external returns(uint256) {}

    // TODO: function isActiveRecollateralization ?

    function isApprovedRecollateralizationFactory(address _factory) external view override returns (bool) {
        return approvedRecollateralizationFactories[_factory];
    }

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