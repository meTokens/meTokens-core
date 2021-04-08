pragma solidity ^0.8.0;

import "../interfaces/I_VaultFactory.sol";
import "../interfaces/I_VaultRegistry.sol";
import "../interfaces/I_CurveRegistry.sol";
import "../interfaces/I_Curve.sol";


contract HubRegistry {

    event RegisterHub(string name, address indexed vault);  // TODO: decide on arguments
    event DeactivateHub(uint256 hub);
    event ReactivateHub(uint256 hub);

    address public gov;
    I_Curve public curve;
    I_VaultFactory public vaultFactory;
    I_VaultRegistry public vaultRegistry;
    I_MeTokenRegistry public meTokenRegistry;

    mapping(uint256 => Hub) private hubs;
    uint256 private hubCount;

    enum Status { INACTIVE, ACTIVE, UPDATING, MIGRATING }
    struct Hub {    
        string name;
        address owner;
        address[] subscribedMeTokens;
        address vault;
        address curve;
        // uint256 valueSet; NOTE: not needed as valueSet is mapped to hub
        Status status;
    }

    constructor(address _gov, address _vaultRegistry, address _curveRegistry, address _meTokenRegistry) public {
        gov = _gov;
        vaultRegistry = I_VaultRegistry(_vaultRegistry);
        curveRegistry = I_CurveRegistry(_curveRegistry);
        meTokenRegistry = I_MeTokenRegistry(_meTokenRegistry);
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
        I_Curve(_curve).registerValueSet(hubCount, _encodedValueSetArgs);
        
        // Create new vault
        // ALl new hubs will create a vault
        // TODO: way to group encoding of function arguments?
        vault = I_VaultFactory(_vaultFactory).createVault(_vaultName, _vaultOwner, hubCount, _curve, _encodedVaultAdditionalArgs);
        
        // Save the hub to the registry
        Hub storage hub = Hub(
            _name,
            _owner,
            address[],
            vault,
            _curve,
            ACTIVE
        );
        hubs[hubCount] = Hub;
        hubCount++;
    }

    function mint(address _meToken, uint256 collateralAssetDeposited) external {
        // find which hub meToken is a part of
        meTokenRegistry(0x0)
    }


    function burn(address _meToken, uint256 meTokenDeposited) {
        // Check if msg.sender is owner to give owner the sell rate vs. giving the buyer the burn rate
    }

    function deactivateHub(uint256 _hub) external {
        // TODO: access control
        require(_hub <= hubCount, "_hub exceeds hubCount");
        HubDetails storage hubDetails = hubs[_hub];

        require(hubDetails.active, "Hub not active");
        hubDetails.active = false;
        emit DeactivateHub(_hub);
    }

    /// @notice subscribe a newly instantiated meToken to a current hub
    function suscribeMeToken(address _meToken, uint256 _hub) external {
        // TODO: access control - 
        HubDetails storage hubDetails = hubs[hub];

        require(hubDetails);
    }




    // TODO: is this needed?
    // function reactivateHub() returns (uint256) {}

    function getHubCount() public view returns (uint256) {
        return hubCount;
    }

    function getHubStatus(uint256 _hub) public view returns (Status) {
        require(_hub < hubCount, "_hub exceeds hubCount");
        HubDetails memory hubDetails = hubs[_hub];
        return hubDetails.status;
    }

    function getHubDetails(uint256 _hub) external view returns (HubDetails calldata) {
        require(_hub < hubCount, "_hub exceeds hubCount");
        HubDetails memory hubDetails = hubs[_hub];
        return hubDetails;
    }

    function getHubVault(uint256 _hub) external view returns (address) {
        // TODO: is this excessive require from MeTokenRegistry already using this.isActiveHub()?
        require(_hub < hubCount, "_hub exceeds hubCount");
        HubDetails memory hubDetails = hubs[_hub];
        return hubDetails.vault;
    }

    function getHubValueSet(uint256 _hub) external view returns (address) {
        HubDetails memory hubDetails = hubs[_hub];
        require(_hub < hubCount, "_hub exceeds hubCount");
        return hubDetails.valueSet;
    }
}