pragma solidity ^0.8.0;

import "../Interaces/I_VaultFactory.sol";

contract HubRegistry {

	mapping (uint256 => HubDetails) hubs;
    uint256 private _hubCount;

    struct HubDetails {
    	string name;
        uint256 curveDetails;
        address vault;
    }

    function registerHub(
        string calldata _name,
        uint256 _curveDetails,
        address _vaultFactory
    ) public {
        // TODO: require _vaultFactory to be an approved factory

        // Create new vault

    }

    function deactivateHub() returns (uint256) {}
    function reactivateHub() returns (uint256) {}

    function getHubCount() public view returns (uint256) {
        return _hubCount;
    }
}