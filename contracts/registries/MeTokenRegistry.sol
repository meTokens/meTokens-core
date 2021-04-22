pragma solidity ^0.8.0;

import "../interfaces/I_MeTokenRegistry.sol";
import "../MeToken.sol";
import "../interfaces/I_MeTokenFactory.sol";
import "../interfaces/I_HubRegistry.sol";


/// @title meToken registry
/// @author Carl Farterson (@carlfarterson)
/// @notice This contract tracks basic information about all meTokens
contract MeTokenRegistry is I_MeTokenRegistry {

    event RegisterMeToken(
        address indexed meToken,
        address indexed owner,
        string name,
        string symbol,
        uint256 hub
    );
    event SubscribeMeToken(address meToken, uint256 hub);

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

    /// @inheritdoc I_MeTokenRegistry
    function registerMeToken(
        string _name,
        address _owner,
        string _symbol,
        uint256 _hub,
        uint256 _collateralDeposited // TODO
    ) external {
        // TODO: access control
        require(!meTokenOwners[_owner], "_owner already owns a meToken");        
        require(hubRegistry.getHubStatus(_hub) != "INACTIVE", "Hub not active");

        // Use hub to find vault
        // Use vault to find collateral assets
        address vault = hubRegistry.getHubVault(_hub);
        
        address meTokenAddr = meTokenFactory.createMeToken(
            _name, _owner, _symbol, _hub
        );

        // Add meToken to registry
        MeTokenDetails storage meTokenDetails = MeTokenDetails(
            _owner, _hub, 0, 0, false
        );

        meTokens[meTokenAddr] = meTokenDetails;
        meTokenOwners[_owner] = true;

    }


    /// @inheritdoc I_MeTokenRegistry
    function toggleUpdating() override returns (bool) {
        require(msg.sender == 0x0, ""); // TODO
        updating = !updating;
        emit ToggleUpdating(updating);
    }


    /// @inheritdoc I_MeTokenRegistry
    function toggleMigrating() override returns (bool) {    
        require(msg.sender == 0x0, ""); // TODO
        migrating = !migrating;
        emit ToggleMigrating(migrating);
    }


    /// @inheritdoc I_MeTokenRegistry
    function isMeTokenOwner(address _owner) external view override returns (bool) {
        return meTokenOwners[_owner];
    }

    // TODO: natspec
    function getMeTokenOwner(address _meToken) public view override returns (address) {
        MeTokenDetails memory meTokenDetails = meTokens[_meToken];
        return meTokenDetails.owner;
    }

    /// @inheritdoc I_MeTokenRegistry
    function getMeTokenHub(address _meToken) external view override returns (uint256) {
        MeTokenDetails memory meTokenDetails = meTokens[_meToken];
        return meTokenDetails.hub;
    }

    /// @inheritdoc I_MeTokenRegistry
    function getMeTokenDetails(address _meToken) external view override returns (MeTokenDetails calldata) {
        MeTokenDetails memory meTokenDetails = meTokens[_meToken];
        return meTokenDetails;
    }


    // TODO
    // function migrate(uint256 meTokenAddress) external onlyOwner(meTokenAddress) returns(bool) {}
}