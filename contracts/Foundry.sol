pragma solidity ^0.8.0;

import "./interfaces/I_Fees.sol";
import "./interfaces/I_MeTokenRegistry.sol";
import "./interfaces/I_MeToken.sol";
import "./interfaces/I_ERC20.sol";
import "./interfaces/I_CurveValueSet.sol";
import "./interfaces/I_Vault.sol";


contract Foundry {
    
    uint256 private PRECISION = 10**18;

    I_Fees public fees;
    I_MeTokenRegistry public meTokenRegistry;

    constructor(
        address _fees,
        address _meTokenRegistry
    ) {
        fees = I_Fees(_fees);
        meTokenRegistry = I_MeTokenRegistry(_meTokenRegistry);
    }

    function mint(address _meToken, address _recipient, uint256 _collateralDeposited) external override {

        uint256 hub = meTokenRegistry.getMeTokenHub(_meToken);
        HubDetails memory hubDetails = hubs[hub];
        require(hubDetails.status != "INACTIVE", "Hub inactive");

        MeTokenDetails memory meTokenDetails = meTokenRegistry.getMeTokenDetails(_meToken);
        // TODO: convert this handling logic to targetValueSet conditions
        require(!meTokenDetails.migrating, "meToken is migrating");

        I_MeToken meToken = I_MeToken(_meToken);
        I_CurveValueSet curve = I_CurveValueSet(huDetails.curve);
        I_Vault vault = I_Vault(hubDetails.vault);
        I_ERC20 collateralToken = I_ERC20(vault.getCollateralAsset());

        uint256 fee = _collateralDeposited * fees.mintFee() / PRECISION;
        uint256 collateralDepositedAfterFees = _collateralDeposited - fee;

        // Calculate how much meToken is minted
        uint256 meTokensMinted = curve.calculateMintReturn(
            hub,
            meToken.totalSupply(),
            meTokenDetails.balancePooled,
            collateralDepositedAfterFees // TODO: do we use this calculation or collateralDeposited
        );
        
        // update balancePooled (TODO)

        // Send collateral to vault
        collateralToken.transferFrom(msg.sender, address(this), collateralDeposited);

        // Send fees to recipient
        if (fee > 0) {vault.addFee(fee);}
        // collateralToken.transferFrom(msg.sender, fees.feeRecipient(), fee);

        // Mint meToken to user
        meToken.mint(_recipient, meTokensMinted);
    }



    function burn(address _meToken, uint256 _meTokensBurned) external {

        uint256 hub = meTokenRegistry.getMeTokenHub(_meToken);
        HubDetails memory hubDetails = hubs[hub];
        require(hubDetails.status != "INACTIVE", "Hub inactive");

        MeTokenDetails memory meTokenDetails = meTokenRegistry.getMeTokenDetails(_meToken);
        // TODO: convert this handling logic to targetValueSet conditions
        require(!meTokenDetails.migrating, "meToken is migrating");

        I_MeToken meToken = I_MeToken(_meToken);
        I_CurveValueSet curve = I_CurveValueSet(huDetails.curve);
        I_Vault vault = I_Vault(hubDetails.vault);
        I_ERC20 collateralToken = I_ERC20(vault.getCollateralAsset());

        uint256 fee;
        uint256 burnReturn;

        // If msg.sender == owner, give owner the sell rate.
        // If msg.sender != owner, give msg.sender the burn rate
        if (meTokenRegistry.getMeTokenOwner(_meToken) == msg.sender) {

            fee = _meTokensBurned * fees.burnOwnerFee() / PRECISION;
            uint256 earnedFromLocked = _meTokensBurned * meTokenDetails.balanceLocked / meToken.totalSupply();
            burnReturn = _meTokensBurned - fee + earnedFromLocked;

            // decrease balance locked (TODO)

        } else {
            fee = _meTokensBurned * fees.getBuyerFee() / PRECISION;
            burnReturn = _meTokensBurned - fee;
            uint256 meTokensToLock = burnReturn * hubDetails.refundRatio / PRECISION;

            // increase balance locked (TODO)

        }

        // Calculate how many collateral tokens are returned
        uint256 collateralReturned = curve.calculateMintReturn(
            hub,
            meToken.totalSupply(),
            meTokenDetails.balancePooled,
            burnReturn
        );

        // TODO: Update balance pooled

        // Burn metoken from user
        meToken.burn(msg.sender, burnReturn);

        // Send collateral from vault
        collateralAsset.transferFrom(hubDetails.vault, msg.sender, collateralReturned);        

        // Transfer fees
        // TODO: Would fees be in meToken
        meToken.transfer(fees.feeRecipient(), fee);
        if (fee > 0) {vault.addFee(fee);}

    }



}