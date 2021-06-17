pragma solidity ^0.8.0;

contract MeTokenRegistryMock {
    
    mapping(address => bool) public owners;

    constructor () {
    }

    // NOTE: use default values of "", _owner, "", 0
    function registerMeToken(
        string calldata _name,
        address _owner,
        string calldata _symbol,
        uint256 _hubId
    ) external {
        owners[_owner] = true;
    }

    function isMeTokenOwner(
        address _owner
    ) external view returns (bool) {
        return owners[_owner];
    }
}
