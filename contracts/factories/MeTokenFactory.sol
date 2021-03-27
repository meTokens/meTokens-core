pragma solidity ^0.8.0;

import "../MeToken.sol";
import "../interfaces/I_MeTokenRegistry.sol";


contract MeTokenFactory {
    
    event MeTokenInitialized(
        address indexed _meToken,
        address indexed _owner,
        string _name,
        string _symbol
    );

    I_MeTokenRegistry public meTokenRegistry;
    mapping(address => bool) private owners;
    
    MeToken public meToken;

    constructor (address _meTokenRegistry) {
        meTokenRegistry = _meTokenRegistry;
    }

    function createMeToken(
        string calldata _name,
        address _owner,
        string calldata _symbol,
		uint256 _hubId
    ) external returns (address) {
        require(msg.sender == meTokenRegistry, "!meTokenRegistry");

        // TODO: create2 shit
        meToken m = new MeToken(_owner, _name, _symbol);

        // Add metoken to meTokenRegistry
        meTokenRegistry.registerMeToken(); // TODO: args

        return address(m);
    }

}