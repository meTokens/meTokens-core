pragma solidity ^0.8.0;

import "../MeToken.sol";
import "../interfaces/I_MeTokenRegistry.sol";

/// @title meToken factory
/// @author Carl Farterson (@carlfarterson)
/// @notice This contract creates and deploys a users' meToken
contract MeTokenFactory {

    I_MeTokenRegistry public meTokenRegistry;
    
    MeToken public meToken;

    constructor (address _meTokenRegistry) {
        meTokenRegistry = _meTokenRegistry;
    }

    /// @notice create and register a meToken
    /// @param _name name of meToken
    /// @param _owner owner of meToken
    /// @param _symbol symbol of meToken
    /// @param _hub Hub identifier
    function createMeToken(
        string calldata _name,
        address _owner,
        string calldata _symbol,
		uint256 calldata _hub
    ) external returns (address) {
        require(msg.sender == meTokenRegistry, "!meTokenRegistry");

        // TODO: create2 shit
        meToken m = new MeToken(_name, _owner,  _symbol);   

        return address(m);
    }

}