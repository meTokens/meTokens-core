pragma solidity ^0.8.0;

import "../MeToken.sol";
import "../interfaces/I_MeTokenFactory.sol";
import "../interfaces/I_HubRegistry.sol";


contract MeTokenRegistry{

    event RegisterMeToken(
        address indexed meToken,
        address indexed owner,
        string name,
        string symbol,
        uint256 hub
    );
    // event ApproveCollateralAsset(address asset);
    // event UnapproveCollateralAsset(address asset);

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

    function getMeTokenOwner(address _meToken) external view returns (address) {
        // TODO: validate MeTokenDetails struct wwill revert for missing meToken address
        MeTokenDetails memory meTokenDetails = meTokens[_meToken];
        return meTokenDetails.owner;
    }

    function getMeTokenHub(address _meToken) external view returns (uint256) {
        MeTokenDetails memory meTokenDetails = meTokens[_meToken];
        return meTokenDetails.hub;
    }

    function getMeTokenBalancePooled(address _meToken) external view returns (uint256) {
        MeTokenDetails memory meTokenDetails = meTokens[_meToken];
        return meTokenDetails.balancePooled;
    }

    function getMeTokenBalanceLocked(address _meToken) external view returns (uint256) {
        MeTokenDetails memory meTokenDetails = meTokens[_meToken];
        return meTokenDetails.balanceLocked;
    }

    function isMeTokenMigrating(address _meToken) external view returns (uint256) { 
        MeTokenDetails memory MeTokenDetails = meTokens[_meToken];
        return meTokenDetails.migrating;
    }

    /*
    function approveCollateralAsset(address _asset) external {
        // TODO: access control
        require(!approvedCollateralAssets[_asset], "Asset already approved");
        approvedCollateralAssets[_asset] = true;
        emit ApproveCollateralAsset(_asset);
    }

    function unapproveCollateralAsset(address _asset) external {
        require(approvedCollateralAssets[_asset], "Asset not approved");
        approvedCollateralAssets[_asset] = false;
        emit UnapproveCollateralAsset(_asset);
    }

    function isApprovedCollateralAsset(address _asset) external view returns (bool) {
        return approvedCollateralAssets[_asset];
    }
    */

    // TODO
    // function migrate(uint256 meTokenAddress) external onlyOwner(meTokenAddress) returns(bool) {}
}