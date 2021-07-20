// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "./interfaces/IHub.sol";
import "./interfaces/IVaultFactory.sol";
import "./interfaces/IVaultRegistry.sol";
import "./interfaces/ICurveRegistry.sol";
import "./interfaces/ICurveValueSet.sol";
import "./interfaces/IUpdater.sol";


/// @title meToken hub
/// @author Carl Farterson (@carlfarterson)
/// @notice This contract tracks all combinations of vaults and curves,
///     and their respective subscribed meTokens 
abstract contract Hub is IHub {

    event Register(string name, address indexed vault);  // TODO: decide on arguments
    event SetStatus(uint256 hubId, uint256 status);
    event DeactivateHub(uint256 hubId);

    modifier hubExists(uint256 _hubId) {
        require(_hubId <= hubCount, "_hubId exceeds hubCount");
        _;
    }

    uint256 private immutable PRECISION = 10**18;

    uint256 private hubCount;
    address public gov;
    address public foundry;
    IVaultRegistry public vaultRegistry;
    ICurveRegistry public curveRegistry;
    IUpdater public updater;

    struct Details {
        string name;
        address owner;
        address vault;
        address curve;
        uint256 refundRatio;
        Status status;
    }

    mapping(uint256 => Details) private hubs;

    // TODO: ensure this is properly checked
    enum Status { INACTIVE, ACTIVE, QUEUED, UPDATING}

    constructor() {}

    function setLaterVariables(
        address _gov,
        address _foundry,
        address _updater,
        address _vaultRegistry,
        address _curveRegistry
    ) public {
        gov = _gov;
        foundry = _foundry;
        updater = IUpdater(_updater);
        vaultRegistry = IVaultRegistry(_vaultRegistry);
        curveRegistry = ICurveRegistry(_curveRegistry);
    }

    /// @inheritdoc IHub
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
    ) external override {
        // TODO: access control
        require(vaultRegistry.isApprovedVaultFactory(_vaultFactory), "_vaultFactory not approved");
        require(curveRegistry.isApprovedValueSet(_curve), "_curve not approved");
        require(_refundRatio < PRECISION, "_refundRatio > PRECISION");

        // Store value set base paramaters to `{CurveName}ValueSet.sol`
        // TODO: validate encoding with an additional parameter in function call (ie. hubCount)
        // https://docs.soliditylang.org/en/v0.8.0/units-and-global-variables.html#abi-encoding-and-decoding-functions
        // abi.encodePacked();
        ICurveValueSet(_curve).register(hubCount, _encodedValueSetArgs);
        
        // Create new vault
        // ALl new hubs will create a vault
        // TODO: way to group encoding of function arguments?
        address vault = IVaultFactory(_vaultFactory).create(_vaultName, _vaultOwner, _collateralAsset, _encodedVaultAdditionalArgs);
        
        // Save the hub to the registry
        hubs[hubCount++] = Details(
            _name,
            _owner,
            vault,
            _curve,
            _refundRatio,
            Status.ACTIVE
        );
    }
    

    /// @inheritdoc IHub
    function deactivateHub(uint256 _hubId) external override hubExists(_hubId) {
        // TODO: access control
        Details storage Details = hubs[_hubId];

        require(Details.status == Status.ACTIVE, "Hub not active");
        Details.status = Status.INACTIVE;
        emit DeactivateHub(_hubId);
    }

    // TODO: is this needed?
    // function reactivateHub() returns (uint256) {}

    
    function startUpdate(uint256 _hubId) external override {
        require(msg.sender == address(updater), "!updater");
        Details storage Details = hubs[_hubId];
        Details.status = Status.QUEUED;
    }

    function setStatus(uint256 _hubId, uint256 status) public {
        // TODO: access control
        // Can only be from Foundry when setting to QUEUED > UPDATING,
        // Or from Updater when setting a curve to QUEUED
        require(
            msg.sender == address(updater) || msg.sender == foundry,
            "!updater && !foundry"
        );

        Details storage Details = hubs[_hubId];
        require(uint256(Details.status) != status, "Cannot set to same status");
        Details.status = Status(status);
        emit SetStatus(_hubId, status);
    }

    function finishUpdate(
        uint256 _hubId,
        address _migrating,
        address _recollateralizing,
        uint256 _shifting
    ) external override {
        require(msg.sender == address(updater), "!updater");
        Details storage Details = hubs[_hubId];
        
        if (_migrating != address(0)) {
            Details.curve = _migrating;
        }

        if (_recollateralizing != address(0)) {
            Details.vault = _recollateralizing;
        }

        if (_shifting != 0) {
            Details.refundRatio = _shifting;
        }
        Details.status = Status.ACTIVE;
    }


    // TODO: natspec
    function getOwner(uint256 _hubId) public view override hubExists(_hubId) returns (address) {
        Details memory Details = hubs[_hubId];
        return Details.owner;
    }


    /// @inheritdoc IHub
    function getStatus(uint256 _hubId) public view override returns (uint256) {
        Details memory Details = hubs[_hubId];
        return uint256(Details.status);
    }


    /// @inheritdoc IHub
    function getRefundRatio(uint256 _hubId) public view override returns (uint256) {
        Details memory Details = hubs[_hubId];
        return Details.refundRatio;
    }


    /// @inheritdoc IHub
    function getDetails(
        uint256 _hubId
    ) external view override hubExists(_hubId) returns (
        string memory name,
        address owner,
        address vault,
        address curve_,
        uint256 refundRatio,
        uint256 status
    ) {
        Details memory Details = hubs[_hubId];
        name = Details.name;
        owner = Details.owner;
        vault = Details.vault;
        curve_ = Details.curve;
        refundRatio = Details.refundRatio;
        status = uint256(Details.status);
    }

    /// @inheritdoc IHub
    function getCurve(uint256 _hubId) external view override returns (address) {
        require(_hubId < hubCount, "_hubId > hubCount");
        Details memory Details = hubs[_hubId];
        return Details.curve;
    }

    /// @inheritdoc IHub
    function getVault(uint256 _hubId) external view override returns (address) {
        require(_hubId < hubCount, "_hubId > hubCount");
        Details memory Details = hubs[_hubId];
        return Details.vault;
    }

}