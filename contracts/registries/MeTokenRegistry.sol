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
    event TransferMeTokenOwnership(address from, address to, address meToken);

    I_MeTokenFactory public meTokenFactory;
    I_HubRegistry public hubRegistry;

    mapping (address => MeTokenDetails) private meTokens; // key pair: ERC20 address
    mapping (address => bool) private meTokenOwners;  // key: address of owner, value: address of meToken
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
        string _symbol,
        uint256 _hub,
        uint256 _collateralDeposited
    ) external {
        // TODO: access control
        require(!meTokenOwners[msg.sender], "msg.sender already owns a meToken");        
        require(hubRegistry.getHubStatus(_hub) != "INACTIVE", "Hub not active");
        
        // Initial collateral deposit from owner by finding the vault,
        // and then the collateral asset tied to that vault
        address vault = hubRegistry.getHubVault(_hub);
        address collateralAsset = I_Vault(vault).getCollateralAsset();
        require(
            I_ERC20(collateralAsset).balanceOf(msg.sender) <= _collateralDeposited,
            "Collateral deposited cannot exceed balance"
        );

        // Create meToken erc20 contract
        address meTokenAddr = meTokenFactory.createMeToken(
            _name, msg.sender, _symbol
        );

        // Add meToken to registry
        MeTokenDetails memory meTokenDetails = MeTokenDetails(
            msg.sender, _hub, _collateralDeposited, 0, false
        );
        meTokens[meTokenAddr] = meTokenDetails;

        // Register the address which created a meToken
        meTokenOwners[msg.sender] = true;

        // Get curve information from hub
        I_CurveValueSet curveValueSet = I_CurveValueSet(hubRegistry.getHubCurve);

        uint256 meTokensMinted = curveValueSet.calculateMintReturn(
            _collateralDeposited,   // _deposit_amount
            _hub,                   // _hub
            0,                      // _supply
            0                       // _balancePooled
        );

        // Transfer collateral to vault and return the minted meToken
        I_ERC20(collateralAsset).transferFrom(msg.sender, vault, _collateralDeposited);
        I_MeToken(meTokenAddr).mint(msg.sender, meTokensMinted);

        emit RegisterMeToken(_meToken, msg.sender, _name, _symbol, _hub);
    }


    function transferMeTokenOwnership(address _meToken, address _newOwner) external {
        require(!meTokenOwners[_newOwner], "_newOwner already owns a meToken");
        MeTokenDetails storage meTokenDetails = meTokens[_meToken];
        require(msg.sender == meTokenDetails.owner, "!owner");

        meTokenOwners[msg.sender] = false;
        meTokenOwners[_newOwner] = true;
        meTokenDetails.owner = _newOwner;

        emit TransferMeTokenOwnership(msg.sender, _newOwner, _meToken);
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