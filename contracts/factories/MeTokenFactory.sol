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
        address _owner,
        string calldata _name,
        string calldata _symbol,
		string calldata hub
    ) external returns (address) {
        require(msg.sender == meTokenRegistry, "!meTokenRegistry");

        // TODO: create2 shit
        meToken m = new MeToken(_owner, _name, _symbol);

        // Add metoken to meTokenRegistry
        meTokenRegistry.registerMeToken(); // TODO: args

        // TODO: subscribe meToken

        return address(m);
    }

}