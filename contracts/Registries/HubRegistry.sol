pragma solidity ^0.8.0;

import "../Interaces/I_VaultFactory.sol";
import "../Interaces/I_VaultRegistry.sol";

contract HubRegistry {

    event RegisterHub(address factory, string name, uint256 hubId);
    event DeactivateHub(uint256 hubId);
    event ReactivateHub(uint256 hubId);

	mapping (uint256 => HubDetails) private hubs;
    uint256 private _hubCount;
    address public gov;
    I_VaultRegistry public vaultRegistry;

    struct HubDetails {
    	string name;
        uint256 curveDetails;
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
        string calldata _name,
        uint256 _curveDetails,
        address _vaultFactory,
    ) public {
        require(vaultRegistry.isApprovedVaultFactory(_vaultFactory), "_vaultFactory not approved");
        

        // Create new vault

    }

    function deactivateHub() returns (uint256) {}
    function reactivateHub() returns (uint256) {}

    function getHubCount() public view returns (uint256) {
        return _hubCount;
    }
}