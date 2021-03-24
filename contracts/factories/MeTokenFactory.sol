pragma solidity ^0.8.0;

import "../MeToken.sol";

contract MeTokenFactory {
    
    event MeTokenInitialized(
        address indexed _meToken,
        address indexed _owner,
        string _name,
        string _symbol
    );

    struct MeTokenDetails{
        address owner;
        uint256 hub;
        uint256 migrationDuration;
        bool migrating;
    }

    address public owner;
    mapping(address => bool) private owners;

    MeTokenDetails[] public meTokens;
    
    Metoken public meToken;

    constructor (address _owner) {
        owner = owner;
    }

    function initialize(
        address _owner,
        string _name,
        string _symbol,
		uint256 hub
    ) public view returns (address _meToken) {

        require(!isOwner(_owner), "initialize: address has already created their meToken");

        meToken m = new MeToken(_owner, _name, _symbol);
        meTokenDetail = MeTokenDetails(m,_owner,_name,_symbol);

        // Register meToken

        meTokens.push(meTokenDetails);
        
        emit MeTokenCreated(m, _owner,_name,_symbol);

        return m;
    }

    function isOwner(address _address) public view returns (bool) {
        return owners[_address];
    }

}