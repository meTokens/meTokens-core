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
contract Hub is IHub {

    modifier hubExists(uint256 id) {
        require(id <= count, "id exceeds count");
        _;
    }

    uint256 private immutable PRECISION = 10**18;

    uint256 private count;
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

    /*
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
        require(vaultRegistry.isApproved(_vaultFactory), "_vaultFactory not approved");
        // require(curveRegistry.isActive(_curve), "_curve not approved");  TODO
        require(_refundRatio < PRECISION, "_refundRatio > PRECISION");

        // Store value set base paramaters to `{CurveName}ValueSet.sol`
        // TODO: validate encoding with an additional parameter in function call (ie. count)
        // https://docs.soliditylang.org/en/v0.8.0/units-and-global-variables.html#abi-encoding-and-decoding-functions
        // abi.encodePacked();
        ICurveValueSet(_curve).register(count, _encodedValueSetArgs);
        
        // Create new vault
        // ALl new hubs will create a vault
        // TODO: way to group encoding of function arguments?
        address vault = IVaultFactory(_vaultFactory).create(_vaultName, _vaultOwner, _collateralAsset, _encodedVaultAdditionalArgs);
        
        // Save the hub to the registry
        hubs[count++] = Details(
            _name,
            _owner,
            address(0), // vault,
            _curve,
            _refundRatio,
            Status.ACTIVE
        );
    }
    */

    /// @inheritdoc IHub
    function deactivateHub(uint256 id) external override hubExists(id) {
        // TODO: access control
        Details storage details = hubs[id];

        require(details.status == Status.ACTIVE, "Hub not active");
        details.status = Status.INACTIVE;
        emit DeactivateHub(id);
    }

    // TODO: is this needed?
    // function reactivateHub() returns (uint256) {}

    /// @inheritdoc IHub
    function startUpdate(uint256 id) external override {
        require(msg.sender == address(updater), "!updater");
        Details storage details = hubs[id];
        details.status = Status.QUEUED;
    }


    /// @inheritdoc IHub
    function finishUpdate(
        uint256 id,
        address _migrating,
        address _recollateralizing,
        uint256 _shifting
    ) external override {
        require(msg.sender == address(updater), "!updater");
        Details storage details = hubs[id];
        
        if (_migrating != address(0)) {
            details.curve = _migrating;
        }

        if (_recollateralizing != address(0)) {
            details.vault = _recollateralizing;
        }

        if (_shifting != 0) {
            details.refundRatio = _shifting;
        }
        details.status = Status.ACTIVE;
    }


    /// @inheritdoc IHub
    function setStatus(
        uint256 id,
        uint256 status
    ) public override returns (bool) {
        // TODO: access control
        // Can only be from Foundry when setting to QUEUED > UPDATING,
        // Or from Updater when setting a curve to QUEUED
        require(
            msg.sender == address(updater) || msg.sender == foundry,
            "!updater && !foundry"
        );

        Details storage details = hubs[id];
        require(uint256(details.status) != status, "Cannot set to same status");
        details.status = Status(status);
        emit SetStatus(id, status);
        return true;
    }

    function getCount() external view returns (uint256) {return count;}

    /// @inheritdoc IHub
    function getOwner(uint256 id) public view override hubExists(id) returns (address) {
        Details memory details = hubs[id];
        return details.owner;
    }


    /// @inheritdoc IHub
    function getStatus(uint256 id) public view override returns (uint256) {
        Details memory details = hubs[id];
        return uint256(details.status);
    }


    /// @inheritdoc IHub
    function getRefundRatio(uint256 id) public view override returns (uint256) {
        Details memory details = hubs[id];
        return details.refundRatio;
    }


    /// @inheritdoc IHub
    function getDetails(
        uint256 id
    ) external view override hubExists(id) returns (
        string memory name,
        address owner,
        address vault,
        address curve_,
        uint256 refundRatio,
        uint256 status
    ) {
        Details memory details = hubs[id];
        name = details.name;
        owner = details.owner;
        vault = details.vault;
        curve_ = details.curve;
        refundRatio = details.refundRatio;
        status = uint256(details.status);
    }

    /// @inheritdoc IHub
    function getCurve(uint256 id) external view override returns (address) {
        require(id < count, "id > count");
        Details memory details = hubs[id];
        return details.curve;
    }

    /// @inheritdoc IHub
    function getVault(uint256 id) external view override returns (address) {
        require(id < count, "id > count");
        Details memory details = hubs[id];
        return details.vault;
    }

}