pragma solidity ^0.8.0;

import "../interfaces/I_HubRegistry.sol";
import "../interfaces/I_VaultFactory.sol";
import "../interfaces/I_VaultRegistry.sol";
import "../interfaces/I_CurveRegistry.sol";
import "../interfaces/I_CurveValueSet.sol";
import "../interfaces/I_Vault.sol";


/// @title meToken hub
/// @author Carl Farterson (@carlfarterson)
/// @notice This contract tracks all combinations of vaults and curves,
///     and their respective subscribed meTokens 
contract HubRegistry is I_HubRegistry {

    event RegisterHub(string name, address indexed vault);  // TODO: decide on arguments
    event DeactivateHub(uint256 hub);

    address public gov;
    I_Curve public curve;
    I_VaultFactory public vaultFactory;
    I_VaultRegistry public vaultRegistry;
    I_MeTokenRegistry public meTokenRegistry;
    I_Fees public fees;

    mapping(uint256 => Hub) private hubs;
    uint256 private hubCount;

    enum Status { INACTIVE, ACTIVE, UPDATING, MIGRATING }
    struct HubDetails {    
        string name;
        address owner;
        address vault;
        address curve;
        Status status;
    }

    struct MeTokenDetails {
        address owner;
        uint256 hub;
		uint256 balancePooled;
		uint256 balanceLocked;
        bool migrating;
	}

    constructor(
        address _gov,
        address _vaultRegistry,
        address _curveRegistry,
        address _meTokenRegistry,
        address _fees
    ) public {
        gov = _gov;
        vaultRegistry = I_VaultRegistry(_vaultRegistry);
        curveRegistry = I_CurveRegistry(_curveRegistry);
        meTokenRegistry = I_MeTokenRegistry(_meTokenRegistry);
        fees = I_Fees(_fees);
    }


    /// @inheritdoc I_HubRegistry
    function registerHub(
        string calldata _name,
        address _owner,
        string calldata _vaultName,
        address _vaultOwner,
        address _vaultFactory,
        address _curve,
        bytes _encodedValueSetArgs,
        bytes _encodedVaultAdditionalArgs
    ) external override {
        // TODO: access control
        require(vaultRegistry.isApprovedVaultFactory(_vaultFactory), "_vaultFactory not approved");
        require(curveRegistry.isApprovedValueSet(_curve), "_curve not approved");        

        // Store value set base paramaters to `{CurveName}ValueSet.sol`
        // TODO: validate encoding with an additional parameter in function call (ie. hubCount)
        // https://docs.soliditylang.org/en/v0.8.0/units-and-global-variables.html#abi-encoding-and-decoding-functions
        // abi.encodePacked();
        I_CurveValueSet(_curve).registerValueSet(hubCount, _encodedValueSetArgs);
        
        // Create new vault
        // ALl new hubs will create a vault
        // TODO: way to group encoding of function arguments?
        vault = I_VaultFactory(_vaultFactory).createVault(_vaultName, _vaultOwner, hubCount, _curve, _encodedVaultAdditionalArgs);
        
        // Save the hub to the registry
        HubDetails memory hubDetails = HubDetails(
            _name,
            _owner,
            vault,
            _curve,
            ACTIVE
        );
        hubs[hubCount] = hubDetails;
        hubCount++;
    }


    /// @inheritdoc I_HubRegistry
    function mint(address _meToken, address _recipient, uint256 _collateralDeposited) external override {

        uint256 hub = meTokenRegistry.getMeTokenHub(_meToken);
        HubDetails memory hubDetails = hubs[hub];
        require(hubDetails.status != "INACTIVE", "Hub inactive");

        MeTokenDetails memory meTokenDetails = meTokenRegistry.getMeTokenDetails(_meToken);
        // TODO: convert this handling logic to targetValueSet conditions
        require(!meTokenDetails.migrating, "meToken is migrating");

        uint256 fee = _collateralDeposited * fees.mintFee() / PRECISION;
        uint256 collateralDepositedAfterFees = _collateralDeposited - fee;

        // Calculate how much meToken isminted
        uint256 meTokensMinted = I_CurveValueSet(hubDetails.curve).calculateMintReturn(
            hub,
            I_MeToken(_meToken).totalSupply(),
            meTokenDetails.balancePooled,
            collateralDepositedAfterFees
        );
        
        // update balancePooled (TODO)

        // Send fees to recipient
        collateralAsset.transferFrom(msg.sender, fees.feeRecipient(), fee);
        
        // Send collateral to vault
        collateralAsset.transferFrom(msg.sender, address(this), collateralDepositedAfterFees);

        // Mint meToken to user
        I_MeToken(_meToken).mint(_recipient, meTokensMinted);
    }


    /// @inheritdoc I_HubRegistry
    function burn(address _meToken, uint256 _meTokensBurned) external {

        uint256 hub = meTokenRegistry.getMeTokenHub(_meToken);
        HubDetails memory hubDetails = hubs[hub];
        require(hubDetails.status != "INACTIVE", "Hub inactive");

        MeTokenDetails memory meTokenDetails = meTokenRegistry.getMeTokenDetails(_meToken);
        // TODO: convert this handling logic to targetValueSet conditions
        require(!meTokenDetails.migrating, "meToken is migrating");

        uint256 fee;
        uint256 meTokensBurnedAfterFees;

        // If msg.sender == owner, give owner the sell rate.
        // If msg.sender != owner, give msg.sender the burn rate
        if (meTokenRegistry.getMeTokenOwner(_meToken) == msg.sender)
        if (msg.sender == meTokenDetails.owner) {
            fee = _meTokensBurned * fees.burnOwnerFee() / PRECISION;
            meTokensBurnedAfterFees = _meTokensBurned - fee + earnedFromLocked;  //TODO: earnedFromLocked
            uint256 meTokensFromLocked = _meTokensBurned * meTokenDetails.balanceLocked / I_MeToken(_meToken).totalSupply(); // TODO: total supply
            // decrease balance locked (TODO)
        } else {
            fee = _meTokensBurned * fees.getBuyerFee() / PRECISION;
            meTokensBurnedAfterFees = _meTokensBurned - fee;
            uint256 meTokensToLock = meTokensBurnedAfterFees * refundRatio / PRECISION; // TODO: refundRatio
            // increase balance locked (TODO)
        }

        // Calculate how many collateral tokens are returned
        uint256 collateralReturned = I_CurveValueSet(hubDetails.curve).calculateMintReturn(
            hub,
            I_MeToken(_meToken).totalSupply(),
            meTokenDetails.balancePooled,
            meTokensBurnedAfterFees
        );

        // TODO: Update balance pooled
                

        I_ERC20(_meToken).transfer(fees.feeRecipient(), fee);
        I_MeToken(_meToken).burn(msg.sender, meTokensBurnedAfterFees);
        I_ERC20(I_Vault(hubDetails.vault).getCollateralAsset()).transfer(msg.sender, collateralReturned);
    }


    /// @inheritdoc I_HubRegistry
    function deactivateHub(uint256 _hub) external override {
        // TODO: access control
        require(_hub <= hubCount, "_hub exceeds hubCount");
        HubDetails storage hubDetails = hubs[_hub];

        require(hubDetails.active, "Hub not active");
        hubDetails.active = false;
        emit DeactivateHub(_hub);
    }

    /// @inheritdoc I_HubRegistry
    function suscribeMeToken(address _meToken, uint256 _hub) external override {
        // TODO: access control - 
        require(msg.sender == address(meTokenRegistry), "Access denied");
        HubDetails storage hubDetails = hubs[_hub];
        hub.subscribedMeTokens.push(_meToken);
    }

    // TODO: is this needed?
    // function reactivateHub() returns (uint256) {}

    /// @inheritdoc I_HubRegistry
    function getHubStatus(uint256 _hub) public view override returns (Status) {
        require(_hub < hubCount, "_hub exceeds hubCount");
        HubDetails memory hubDetails = hubs[_hub];
        return hubDetails.status;
    }

    /// @inheritdoc I_HubRegistry
    function getHubDetails(uint256 _hub) external view override returns (HubDetails calldata) {
        require(_hub < hubCount, "_hub exceeds hubCount");
        HubDetails memory hubDetails = hubs[_hub];
        return hubDetails;
    }


    /// @inheritdoc I_HubRegistry
    function getHubVault(uint256 _hub) external view override returns (address) {
        // TODO: is this excessive require from MeTokenRegistry already using this.isActiveHub()?
        require(_hub < hubCount, "_hub exceeds hubCount");
        HubDetails memory hubDetails = hubs[_hub];
        return hubDetails.vault;
    }

}