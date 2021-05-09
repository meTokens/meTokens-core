pragma solidity ^0.8.0;


contract Foundry {
    
    constructor() {}

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
        I_ERC20(collateralAsset).transferFrom(msg.sender, fees.feeRecipient(), fee);
        
        // Send collateral to vault
        I_ERC20(collateralAsset).transferFrom(msg.sender, address(this), collateralDepositedAfterFees);

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
            uint256 meTokensToLock = meTokensBurnedAfterFees * hubDetails.refundRatio / PRECISION;
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
    


}