pragma solidity ^0.8.0;

import "../MeToken.sol";
import "../interfaces/I_MeTokenRegistry.sol";


contract MeTokenFactory {

    I_MeTokenRegistry public meTokenRegistry;
    
    MeToken public meToken;

    constructor (address _meTokenRegistry) {
        meTokenRegistry = _meTokenRegistry;
    }

    function createMeToken(
        string calldata _name,
        address _owner,
        string calldata _symbol,
		uint256 calldata hub
    ) external returns (address) {
        require(msg.sender == meTokenRegistry, "!meTokenRegistry");

        // TODO: create2 shit
        meToken m = new MeToken(_name, _owner,  _symbol);   

        return address(m);
    }

}