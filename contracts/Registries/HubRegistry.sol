pragma solidity ^0.8.0;

import "../Interaces/I_VaultFactory.sol";
import "../Interaces/I_VaultRegistry.sol";

contract I_DefaultValueSetContract {
    function registerValueSet() external;
}

contract HubRegistry {

    bytes4 encoded    

    event RegisterHub(address factory, string name, uint256 hubId);
    event DeactivateHub(uint256 hubId);
    event ReactivateHub(uint256 hubId);

	mapping (uint256 => HubDetails) private hubs;
    uint256 private hubCount;
    address public gov;
    I_VaultRegistry public vaultRegistry;

    struct HubDetails {
    	string name;
        address valueSetAddress;
        address vault;
        address owner;
        bool active;
    }

    constructor(address _vaultRegistry, address _gov) public {
        require(_vaultRegistry != address(0), "_vaultRegistry cannot be 0 address");
        vaultRegistry = I_VaultRegistry(_vaultRegistry);
        gov = _gov;
    }

    function registerHub(
        string calldata _hubName,
        address _hubOwner,
        string calldata _vaultName,
        address _vaultOwner,
        address _valueSetAddress,
        address _vaultFactory, // TODO: hash vault function
        bytes4 _encodedVaultAdditionalArgs
    ) public {
        require(vaultRegistry.isApprovedVaultFactory(_vaultFactory), "_vaultFactory not approved");
        
        // Create new vault
        vault = I_VaultFactory(_vaultFactory).createVault(_vaultName, _vaultOwner, hubCount, _valueSetAddress, _encodedVaultAdditionalArgs);
        
        // Add the vault to the hub
        hubDetails memory h = HubDetails(name, _valueSetAddress, vault, _hubOwner, false);
        
        // TODO: encode args to set the bancor value set

        ++_hubCount;
    }

    function deactivateHub() returns (uint256) {}
    function reactivateHub() returns (uint256) {}

    function getHubCount() public view returns (uint256) {
        return hubCount;
    }
}