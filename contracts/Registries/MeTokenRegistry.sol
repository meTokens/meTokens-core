pragma solidity ^0.8.0;

import "../MeToken.sol";

contract MeTokenRegistry{

    modifier onlyOwner(address _meTokenAddress) {
        meToken m = MeToken(address);
    }

    // NOTE: hubs point at vaults, don't need vault address in struct
    struct MeTokenDetails{
        address owner;
        uint256 hub;
        uint256 migrationDuration;
        bool migrating;
    }

    mapping (address => MeTokenDetails) meTokens; // key pair: ERC20 address

    // TODO: access control
    function registerMeToken(
        address _owner,
        uint256 _hub,
        uint256 _migrationDuration,
        bool _migrating
    ) public returns () {
        MeTokenDetails memory meTokenDetails = ()
    }

    // TODO: access control
    function initialize(
        address _owner,
        string _name,
        string _symbol,
        address hub
    ) public view returns (address _meToken) {
        require(!meTokens(_owner), "initialize: address has already created their meToken");

        
        meToken m = new MeToken(_owner, _name, _symbol);
        
        // meTokens.push(meTokenDetails);

        emit MeTokenInitialized(m,_owner,_name,_symbol);

        return m;
    }

    function migrate(uint256 meTokenAddress) external onlyOwner(meTokenAddress) returns(bool) {

    }
}