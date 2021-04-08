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
        uint256 hubId
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
        address collateralAsset;
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
        uint256 _hubId
        // address[] calldata _collateralAssets
    ) external {
        // TODO: access control
        require(!meTokenOwners[_owner], "_owner already owns a meToken");
        
        // Use hubId to find vault
        require(hubRegistry.getHubStatus(_hubId) != "INACTIVE", "Hub not active");
        address vault = hubRegistry.getHubVault(_hubId);

        // Use vault to find collateral assets
        

        address meTokenAddr = meTokenFactory.createMeToken(
            _name, _owner, _symbol, _hubId
        );

        // Add meToken to registry
        MeTokenDetails storage meTokenDetails = MeTokenDetails(_owner) 

        meTokenOwners[_owner] = true;   

        emit RegisterMeToken(meTokenAddr, _owner,_name,_symbol, _hubId);
    }

    function isMeTokenOwner(address _owner) public view returns (bool) {

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