pragma solidity ^0.8.0;

contract MeTokenRegistryMock is I_MeTokenRegistry {
    
    mapping(address => bool) public owners;

    constructor () public {
    }

    /// @dev: use default values of "", _owner, "", 0
    function registerMeToken(
        string calldata _name,
        address _owner,
        string calldata _symbol,
        uint256 _hub
    ) external override {
        owners[_owner] = true;
    }

    function isMeTokenOwner(
        address _owner
    ) external view override returns (bool) {
        return owners[_owner];
    }
}
