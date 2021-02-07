pragma solidity ^0.8.0;

import "../MeToken.sol";

contract MeTokenFactory {
    
    event MeTokenCreated(
        address indexed _meToken,
        address indexed _owner,
        string _name,
        string _symbol
    );

    struct MeTokenDetails {
        address _tokenAddress,
        address _owner,
        string _name,
        string _symbol
    }

    address public owner;
    MeTokenDetails[] public meTokens;

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
        meTokenDetail = MeTokenDetails(
            m,
            _owner,
            _name,
            _symbol
        );

        meTokens.push(meTokenDetails);
        
        emit meTokenCreated(
            m,
            _owner,
            _name,
            _symbol
        );

        return m;
    }


}