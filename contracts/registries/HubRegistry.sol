pragma solidity ^0.8.0;

import "../interfaces/I_VaultFactory.sol";
import "../interfaces/I_VaultRegistry.sol";
import "../interfaces/I_CurveRegistry.sol";
import "../interfaces/I_Curve.sol";


contract HubRegistry {

    event RegisterHub(string name, address indexed vault);  // TODO: decide on arguments
    event DeactivateHub(uint256 hubId);
    event ReactivateHub(uint256 hubId);

    address public gov;
    I_Curve public curve;
    I_VaultFactory public vaultFactory;
    I_VaultRegistry public vaultRegistry;

    // Hub[] public hubs;
    mapping(uint256 => Hub) private hubs;
    uint256 private hubCount;

    enum Status { INACTIVE, ACTIVE, UPDATING, MIGRATING }
    struct Hub {    
        string name;
        address owner;
        address[] subscribedMeTokens;
        address vault;
        address curve;
        uint256 valueSet;
        Status status;
    }


    constructor(address _gov, address _vaultRegistry, address _curveRegistry) public {
        gov = _gov;
        vaultRegistry = I_VaultRegistry(_vaultRegistry);
        curveRegistry = I_CurveRegistry(_curveRegistry);
    }

    function registerHub(
        string calldata _name,
        address _owner,
        string calldata _vaultName,
        address _vaultOwner,
        address _vaultFactory,
        address _curve,
        bytes4 _encodedValueSetArgs,
        bytes4 _encodedVaultAdditionalArgs
    ) external {
        // TODO: access control
        require(vaultRegistry.isApprovedVaultFactory(_vaultFactory), "_vaultFactory not approved");
        require(curveRegistry.isApprovedValueSet(_curve), "_curve not approved");        

        // Store value set base paramaters to `{CurveName}ValueSet.sol`
        // TODO: validate encoding with an additional parameter in function call (ie. hubCount)
        I_Curve(_curve).registerValueSet(_encodedValueSetArgs);
        
        // Create new vault
        // ALl new hubs will create a vault
        // TODO: way to group encoding of function arguments?
        vault = I_VaultFactory(_vaultFactory).createVault(_vaultName, _vaultOwner, hubCount, _curve, _encodedVaultAdditionalArgs);
        
        // Save the hub to the registry
        Hub storage hub = Hub(
            _name,
            _owner,
            vault,
            _curve,
            true
        );  // TODO: args
        hubs[hubCount] = Hub;
        hubCount++;
    }


    function deactivateHub(uint256 _hubId) external {
        // TODO: access control
        require(_hubId <= hubCount, "_hubId exceeds hubCount");
        HubDetails storage hubDetails = hubs[_hubId];

        require(hubDetails.active, "Hub not active");
        hubDetails.active = false;
        emit DeactivateHub(_hubId);
    }

    /// @notice subscribe a newly instantiated meToken to a current hub
    function suscribeMeToken(address _meToken, uint256 _hubId) external {
        // TODO: access control - 
        HubDetails storage hubDetails = hubs[hubId];

        require(hubDetails)

    }


    function mint() {}
    function burn() {}    

    // TODO: is this needed?
    // function reactivateHub() returns (uint256) {}

    function getHubCount() public view returns (uint256) {
        return hubCount;
    }

    function isActiveHub(uint256 _hubId) public view returns (bool) {
        require(_hubId < hubCount, "_hubId exceeds hubCount");
        HubDetails memory hubDetails = hubs[_hubId];
        return hubDetails.active;
    }

    function getHubDetails(uint256 _hubId) external view returns (HubDetails calldata) {
        require(_hubId < hubCount, "_hubId exceeds hubCount");
        HubDetails memory hubDetails = hubs[_hubId];
        return hubDetails;
    }

    function getHubVault(uint256 _hubId) external view returns (address) {
        // TODO: is this excessive require from MeTokenRegistry already using this.isActiveHub()?
        require(_hubId < hubCount, "_hubId exceeds hubCount");
        HubDetails memory hubDetails = hubs[_hubId];
        return hubDetails.vault;
    }

    function getHubValueSet(uint256 _hubId) external view returns (address) {
        require(_hubId < hubCount, "_hubId exceeds hubCount");
        HubDetails memory hubDetails = hubs[_hubId];
        return hubDetails.valueSet;
    }
}