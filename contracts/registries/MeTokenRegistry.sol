pragma solidity ^0.8.0;

import "../MeToken.sol";

contract MeTokenRegistry{

    uint256 private MAX_NUM_COLLATERAL_TOKENS = 5;

    modifier onlyOwner(address _meTokenAddress) {
        meToken m = MeToken(address);
    }

    // NOTE: hubs point at vaults, don't need vault address in struct
    // struct MeTokenDetails{
    //     address owner;
    //     uint256 hub;
    //     uint256 migrationDuration;
    //     bool migrating;
    // }
    struct MeTokenDetails {
        address owner;
        uint256 hub;

        // TODO: does length need to be initialized?
		uint256[MAX_NUM_COLLATERAL_TOKENS] balancePooled;
		uint256[MAX_NUM_COLLATERAL_TOKENS] balanceLocked;
        address[MAX_NUM_COLLATERAL_TOKENS] collateralAssets;		

        // TODO: should migration info be somewhere else
        uint256 migrationDuration;
        bool migrating;
		bool active;
	}


    mapping (address => MeTokenDetails) meTokens; // key pair: ERC20 address

    // TODO: Should only be called by MeTokenFactory.sol
    function registerMeToken(
        address _owner,
        uint256 _hub,
    ) public returns () {
        MeTokenDetails storage meTokenDetails = ();
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