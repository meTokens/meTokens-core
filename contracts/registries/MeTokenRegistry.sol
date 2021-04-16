pragma solidity ^0.8.0;

import "../MeToken.sol";
import "../interfaces/I_MeTokenFactory.sol";
import "../interfaces/I_HubRegistry.sol";


/// @title meToken registry
/// @author Carl Farterson (@carlfarterson)
/// @notice This contract tracks basic information about all meTokens
contract MeTokenRegistry{

    event RegisterMeToken(
        address indexed meToken,
        address indexed owner,
        string name,
        string symbol,
        uint256 hub
    );

    I_MeTokenFactory public meTokenFactory;
    I_HubRegistry public hubRegistry;

    mapping (address => MeTokenDetails) private meTokens; // key pair: ERC20 address
    mapping (address => bool) private meTokenOwners;
    mapping (address => bool) private approvedCollateralAssets;

    struct MeTokenDetails {
        address owner;
        uint256 hub;
		uint256 balancePooled;
		uint256 balanceLocked;
        bool migrating;
	}

    constructor(address _meTokenFactory, address _hubRegistry) public {
        meTokenFactory = I_MeTokenFactory(_meTokenFactory);
        hubRegistry = I_HubRegistry(_hubRegistry);
    }

    function registerMeToken(
        string _name,
        address _owner,
        string _symbol,
        uint256 _hub
    ) external {
        // TODO: access control
        require(!meTokenOwners[_owner], "_owner already owns a meToken");
        
        // Use hub to find vault
        require(hubRegistry.getHubStatus(_hub) != "INACTIVE", "Hub not active");
        address vault = hubRegistry.getHubVault(_hub);

        // Use vault to find collateral assets
        

        address meTokenAddr = meTokenFactory.createMeToken(
            _name, _owner, _symbol, _hub
        );

        // Add meToken to registry
        MeTokenDetails storage meTokenDetails = MeTokenDetails(_owner);

        meTokenOwners[_owner] = true;   

        emit RegisterMeToken(meTokenAddr, _owner,_name,_symbol, _hub);
    }

    function isMeTokenOwner(address _owner) external view returns (bool) {
        return meTokenOwners[_owner];
    }

    function getMeTokenHub(address _meToken) external view returns (uint256) {
        MeTokenDetails memory meTokenDetails = meTokens[_meToken];
        return meTokenDetails.hub;
    }

    function getMeTokenDetails(address _meToken) external view returns (MeTokenDetails calldata) {
        MeTokenDetails memory meTokenDetails = meTokens[_meToken];
        return meTokenDetails;
    }
    // TODO
    // function migrate(uint256 meTokenAddress) external onlyOwner(meTokenAddress) returns(bool) {}
}