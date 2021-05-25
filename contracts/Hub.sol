pragma solidity ^0.8.0;

import "./interfaces/I_Hub.sol";
import "./interfaces/I_VaultFactory.sol";
import "./interfaces/I_VaultRegistry.sol";
import "./interfaces/I_CurveRegistry.sol";
import "./interfaces/I_CurveValueSet.sol";


/// @title meToken hub
/// @author Carl Farterson (@carlfarterson)
/// @notice This contract tracks all combinations of vaults and curves,
///     and their respective subscribed meTokens 
contract Hub is I_Hub {

    event RegisterHub(string name, address indexed vault);  // TODO: decide on arguments
    event DeactivateHub(uint256 hub);

    modifier hubExists(uint256 _hubId) {
        require(_hubId <= hubCount, "_hubId exceeds hubCount");
        _;
    }

    uint256 private immutable PRECISION = 10**18;
    address public gov;
    I_Curve public curve;
    I_VaultRegistry public vaultRegistry;
    I_CurveRegistry public curveRegistry;

    mapping(uint256 => HubDetails) private hubs;
    uint256 private hubCount;

    enum Status { INACTIVE, ACTIVE, UPDATING, MIGRATING }
    struct HubDetails {
        string name;
        address owner;
        address vault;
        address curve;
        uint256 valueSet;
        uint256 refundRatio;
        Status status;
    }

    constructor(
        address _gov,
        address _vaultRegistry,
        address _curveRegistry
    ) public {
        gov = _gov;
        vaultRegistry = I_VaultRegistry(_vaultRegistry);
        curveRegistry = I_CurveRegistry(_curveRegistry);
    }


    /// @inheritdoc I_Hub
    function registerHub(
        string calldata _name,
        address _owner,
        string calldata _vaultName,
        address _vaultOwner,
        address _vaultFactory,
        address _curve,
        address _collateralAsset,
        uint256 _refundRatio,
        bytes _encodedValueSetArgs,
        bytes _encodedVaultAdditionalArgs
    ) external override {
        // TODO: access control
        require(vaultRegistry.isApprovedVaultFactory(_vaultFactory), "_vaultFactory not approved");
        require(curveRegistry.isApprovedValueSet(_curve), "_curve not approved");
        require(_refundRatio <= PRECISION, "_refundRatio > PRECISION");

        // Store value set base paramaters to `{CurveName}ValueSet.sol`
        // TODO: validate encoding with an additional parameter in function call (ie. hubCount)
        // https://docs.soliditylang.org/en/v0.8.0/units-and-global-variables.html#abi-encoding-and-decoding-functions
        // abi.encodePacked();
        I_CurveValueSet(_curve).registerValueSet(hubCount, _encodedValueSetArgs);
        
        // Create new vault
        // ALl new hubs will create a vault
        // TODO: way to group encoding of function arguments?
        vault = I_VaultFactory(_vaultFactory).createVault(_vaultName, _vaultOwner, _collateralAsset, _encodedVaultAdditionalArgs);
        
        // Save the hub to the registry
        HubDetails memory hubDetails = HubDetails(
            _name,
            _owner,
            vault,
            _curve,
            _refundRatio,
            ACTIVE
        );
        hubs[hubCount++] = hubDetails;
    }
    

    /// @inheritdoc I_Hub
    function deactivateHub(uint256 _hubId) external override hubExists(_hubId) {
        // TODO: access control
        HubDetails storage hubDetails = hubs[_hubId];

        require(hubDetails.active, "Hub not active");
        hubDetails.active = false;
        emit DeactivateHub(_hubId);
    }

    function setRefundRatio(uint256 _hubId, uint256 _refundRatio) external {

    }

    function setCurve(uint256 _hubId, address _curve, bytes _encodedValueSetArgs) external hubExists(_hubId) {
        // TODO: access control
        require(curveRegistry.isApprovedValueSet(_curve), "_curve not approved");

        HubDetails memory hubDetails = hubs[_hubId];
        require(_curve != hubDetails.curve, "Cannot set curve to the same curve");

        I_CurveValueSet(_curve).registerValueSet(hubCount, _encodedValueSetArgs);
    }

    function 

    // TODO: is this needed?
    // function reactivateHub() returns (uint256) {}


    // TODO: natspec
    function getHubOwner(uint256 _hubId) public view override returns (address) hubExists(_hubId) {
        HubDetails memory hubDetails = hubs[_hubId];
        return hubDetails.owner;
    }


    /// @inheritdoc I_Hub
    function getHubStatus(uint256 _hubId) public view override returns (Status) {
        HubDetails memory hubDetails = hubs[_hubId];
        return hubDetails.status;
    }


    /// @inheritdoc I_Hub
    function getHubDetails(
        uint256 _hubId
    ) external view override hubExists(_hubd) returns (
        string name,
        address owner,
        address vault,
        address curve,
        uint256 valueSet,
        uint256 refundRatio,
        Status status
    ) {
        HubDetails memory hubDetails = hubs[_hubId];
        name = hubDetails.name;
        owner = hubDetails.owner;
        vault = hubDetails.vault;
        curve = hubDetails.curve;
        valueSet = hubDetails.valueSet;
        refundRatio = hubDetails.refundRatio;
        status = hubDetails.status;
    }

    /// @inheritdoc I_Hub
    function getHubCurve(uint256 _hubId) external view override returns (address) {
        require(_hubId < hubCount, "_hubId exceeds hubCount");
        HubDetails memory hubDetails = hubs[_hubId];
        return hubDetails.curve;
    }

    /// @inheritdoc I_Hub
    function getHubVault(uint256 _hubId) external view override returns (address) {
        require(_hubId < hubCount, "_hubId exceeds hubCount");
        HubDetails memory hubDetails = hubs[_hubId];
        return hubDetails.vault;
    }

}