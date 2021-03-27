pragma solidity ^0.8.0;

import "../interfaces/I_VaultFactory.sol";
import "../interfaces/I_VaultRegistry.sol";
import "../interfaces/I_CurveRegistry.sol";


contract HubRegistry {

    event RegisterHub(address factory, string name, uint256 hubId);
    event DeactivateHub(uint256 hubId);
    event ReactivateHub(uint256 hubId);

    uint256 private hubCount;
    address public gov;
    I_VaultRegistry public vaultRegistry;
    I_CurveRegistry public curveRegistry;

	mapping (uint256 => HubDetails) private hubs;

    struct HubDetails {
    	string name;
        address owner;
        address vault;
        address valueSet;
        bool active;
    }

    constructor(address _gov, address _vaultRegistry, address _curveRegistry) public {
        gov = _gov;
        vaultRegistry = I_VaultRegistry(_vaultRegistry);
        curveRegistry = I_CurveRegistry(_curveRegistry);
    }

    function registerHub(
        string calldata _hubName,
        address _hubOwner,
        string calldata _vaultName,
        address _vaultOwner,
        address _vaultFactory,
        address _valueSet,
        bytes4 _encodedValueSetArgs,
        bytes4 _encodedVaultAdditionalArgs
    ) public {
        // TODO: access control
        require(vaultRegistry.isApprovedVaultFactory(_vaultFactory), "_vaultFactory not approved");
        require(curveRegistry.isApprovedValueSet(_valueSet), "_valueSet not approved");        

        // Store value set base paramaters to `{CurveName}ValueSet.sol`
        // TODO: validate encoding with an additional parameter in function call (ie. hubCount)
        I_ValueSet(_valueSet).registerValueSet(++hubCount, _encodedValueSetArgs);
        
        // Create new vault
        vault = I_VaultFactory(_vaultFactory).createVault(_vaultName, _vaultOwner, hubCount, _valueSet, _encodedVaultAdditionalArgs);
        
        // Save the hub to the registry
        HubDetails storage hubDetails = HubDetails(_hubName, _hubOwner, vault, _valueSet, true);
        hubs[hubCount] = hubDetails;

    }


    function deactivateHub(uint256 _hubId) external {
        // TODO: access control
        require(isActiveHub(_hubId), "_hubId not active");
        HubDetails storage hubDetails = hubs[_hubId];
        hubDetails.active = false;
        emit DeactivateHub(_hubId);
    }

    // TODO: is this needed?
    // function reactivateHub() returns (uint256) {}

    function getHubCount() public view returns (uint256) {
        return hubCount;
    }

    function isActiveHub(uint256 _hubId) public view returns (bool) {
        require(_hubId <= hubCount, "_hubId exceeds hubCount");
        HubDetails memory hubDetails = hubs[_hubId];
        return hubDetails.active;
    }
}