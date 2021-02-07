pragma solidity ^0.8.0;

import "../MeToken.sol";

contract MeTokenFactory {
    
    event MeTokenCreated(
        address indexed _meToken,
        address         
    );

    struct MeTokenDetails {
        address indexed tokenAddress,
        address indexed owner,
        string name,
        string symbol
    }

    address public owner;
    address[] public meTokens;

    Metoken public meToken;

    constructor (address _owner) {
        owner = owner;
    }

    function initialize(
        address _owner,
        string _name,
        string _symbol
    ) public view returns (address _meToken) {
        meToken m = new meToken(_owner, _name, _symbol);
        meTokens.push(m);
        emit meTokenCreated(m)
    }


}