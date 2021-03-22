pragma solidity ^0.8.0;

import "../interfaces/I_VaultFactory.sol";
import "../interfaces/I_VaultRegistry.sol";
import "../interfaces/I_CurveValueSet.sol";


contract HubRegistry {

    // bytes4 encoded

    event RegisterHub(address factory, string name, uint256 hubId);
    event DeactivateHub(uint256 hubId);
    event ReactivateHub(uint256 hubId);

	mapping (uint256 => HubDetails) private hubs;
    uint256 private hubCount;
    address public gov;
    I_VaultRegistry public vaultRegistry;
    I_CurveRegistry public curveRegistry;

    struct HubDetails {
    	string name;
        address valueSet;
        address vault;
        address owner;
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
        require(vaultRegistry.isApprovedVaultFactory(_vaultFactory), "_vaultFactory not approved");
        require(curveRegistry.isApprovedValueSet(_valueSet), "_valueSet not approved");        

        // TODO: encode args to set the bancor value set
        address valueSet = I_ValueSet(_valueSet).registerValueSet();
        
        // Create new vault
        vault = I_VaultFactory(_vaultFactory).createVault(_vaultName, _vaultOwner, hubCount, valueSet, _encodedVaultAdditionalArgs);
        
        // Add the vault to the hub
        hubDetails memory h = HubDetails(name, valueSet, vault, _hubOwner, false);
        
        

        ++_hubCount;
    }

    function deactivateHub() returns (uint256) {}
    function reactivateHub() returns (uint256) {}

    function getHubCount() public view returns (uint256) {
        return hubCount;
    }
}