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

    event RegisterHub(string name, address indexed vault);  // TODO: decide on arguments
    event SetHubStatus(uint256 hubId, uint256 status);
    event DeactivateHub(uint256 hubId);

    modifier hubExists(uint256 _hubId) {
        require(_hubId <= hubCount, "_hubId exceeds hubCount");
        _;
    }

    uint256 private immutable PRECISION = 10**18;

    uint256 private hubCount;
    address public gov;
    IVaultRegistry public vaultRegistry;
    ICurveRegistry public curveRegistry;
    IUpdater public updater;

    struct HubDetails {
        string name;
        address owner;
        address vault;
        address curve;
        uint256 refundRatio;
        Status status;
    }
    mapping(uint256 => HubDetails) private hubs;

    // TODO: ensure this is properly checked
    // TODO: FINISHING (?)
    enum Status { INACTIVE, ACTIVE, QUEUED, UPDATING}

    constructor(
        address _gov,
        address _vaultRegistry,
        address _curveRegistry,
        address _updater
    ) {
        gov = _gov;
        vaultRegistry = IVaultRegistry(_vaultRegistry);
        curveRegistry = ICurveRegistry(_curveRegistry);
        updater = IUpdater(_updater);
    }


    /// @inheritdoc IHub
    function registerHub(
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
        ICurveValueSet(_curve).registerValueSet(hubCount, _encodedValueSetArgs);
        
        // Create new vault
        // ALl new hubs will create a vault
        // TODO: way to group encoding of function arguments?
        address vault = IVaultFactory(_vaultFactory).createVault(_vaultName, _vaultOwner, _collateralAsset, _encodedVaultAdditionalArgs);
        
        // Save the hub to the registry
        HubDetails memory hubDetails = HubDetails(
            _name,
            _owner,
            vault,
            _curve,
            _refundRatio,
            Status.ACTIVE
        );
        hubs[hubCount++] = hubDetails;
    }
    

    /// @inheritdoc IHub
    function deactivateHub(uint256 _hubId) external override hubExists(_hubId) {
        // TODO: access control
        HubDetails storage hubDetails = hubs[_hubId];

        require(hubDetails.status == Status.ACTIVE, "Hub not active");
        hubDetails.status = Status.INACTIVE;
        emit DeactivateHub(_hubId);
    }

    // TODO: is this needed?
    // function reactivateHub() returns (uint256) {}


    
    function startUpdate(uint256 _hubId) external {
        require(msg.sender == address(updater), "!updater");
        HubDetails storage hubDetails = hubs[_hubId];
        hubDetails.status = Status.QUEUED;
    }

    function setHubStatus(uint256 _hubId, uint256 status) public {
        // TODO: access control
        HubDetails storage hubDetails = hubs[_hubId];
        require(uint256(hubDetails.status) != status, "Cannot set to same status");
        hubDetails.status = Status(status);
        emit SetHubStatus(_hubId, status);
    }

    function finishUpdate(
        uint256 _hubId,
        address _migrating,
        address _recollateralizing,
        uint256 _shifting
    ) external {
        require(msg.sender == address(updater), "!updater");
        HubDetails storage hubDetails = hubs[_hubId];
        
        if (_migrating != address(0)) {
            hubDetails.curve = _migrating;
        }

        if (_recollateralizing != address(0)) {
            hubDetails.vault = _recollateralizing;
        }

        if (_shifting != 0) {
            hubDetails.refundRatio = _shifting;
        }
        hubDetails.status = Status.ACTIVE;
    }


    // TODO: natspec
    function getHubOwner(uint256 _hubId) public view override hubExists(_hubId) returns (address) {
        HubDetails memory hubDetails = hubs[_hubId];
        return hubDetails.owner;
    }


    /// @inheritdoc IHub
    function getHubStatus(uint256 _hubId) public view override returns (uint256) {
        HubDetails memory hubDetails = hubs[_hubId];
        return uint256(hubDetails.status);
    }


    /// @inheritdoc IHub
    function getHubRefundRatio(uint256 _hubId) public view override returns (uint256) {
        HubDetails memory hubDetails = hubs[_hubId];
        return hubDetails.refundRatio;
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
        HubDetails memory hubDetails = hubs[_hubId];
        name = hubDetails.name;
        owner = hubDetails.owner;
        vault = hubDetails.vault;
        curve_ = hubDetails.curve;
        refundRatio = hubDetails.refundRatio;
        status = uint256(hubDetails.status);
    }

    /// @inheritdoc IHub
    function getHubCurve(uint256 _hubId) external view override returns (address) {
        require(_hubId < hubCount, "_hubId > hubCount");
        HubDetails memory hubDetails = hubs[_hubId];
        return hubDetails.curve;
    }

    /// @inheritdoc IHub
    function getHubVault(uint256 _hubId) external view override returns (address) {
        require(_hubId < hubCount, "_hubId > hubCount");
        HubDetails memory hubDetails = hubs[_hubId];
        return hubDetails.vault;
    }

}