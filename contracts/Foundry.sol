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

        uint256 hubId;
        uint256 balancePooled;
        uint256 balanceLocked;
        uint256 migrating;
        (, hubId, balancePooled, balanceLocked, migrating) = meTokenRegistry.getMeTokenDetails(_meToken);
        // TODO: convert this handling logic to targetValueSet conditions
        require(!migrating, "meToken is migrating");

        HubDetails memory hubDetails = hubs[hubId];
        require(hubDetails.status != "INACTIVE", "Hub inactive");

        I_MeToken meToken = I_MeToken(_meToken);
        I_CurveValueSet curve = I_CurveValueSet(huDetails.curve);
        I_Vault vault = I_Vault(hubDetails.vault);
        I_ERC20 collateralToken = I_ERC20(vault.getCollateralAsset());

        uint256 fee = _collateralDeposited * fees.mintFee() / PRECISION;
        uint256 collateralDepositedAfterFees = _collateralDeposited - fee;

        // Calculate how much meToken is minted
        uint256 meTokensMinted = curve.calculateMintReturn(
            collateralDepositedAfterFees,
            hubId,
            meToken.totalSupply(),
            balancePooled
        );
        
        // Send collateral to vault and update balance pooled
        collateralToken.transferFrom(msg.sender, address(vault), _collateralDeposited);

        meTokenDetails.balancePooled += collateralDepositedAfterFees; // TODO

        // Transfer fees
        if (fee > 0) {vault.addFee(fee);}

        // Mint meToken to user
        meToken.mint(_recipient, meTokensMinted);
    }



    function burn(address _meToken, uint256 _meTokensBurned) external {

        uint256 hubId;
        uint256 balancePooled;
        uint256 balanceLocked;
        uint256 migrating;
        (owner, hubId, balancePooled, balanceLocked, migrating) = meTokenRegistry.getMeTokenDetails(_meToken);
        // TODO: convert this handling logic to targetValueSet conditions
        require(!migrating, "meToken is migrating");

        HubDetails memory hubDetails = hubs[hubId];
        require(hubDetails.status != "INACTIVE", "Hub inactive");

        I_MeToken meToken = I_MeToken(_meToken);
        I_CurveValueSet curve = I_CurveValueSet(huDetails.curve);
        I_Vault vault = I_Vault(hubDetails.vault);
        I_ERC20 collateralToken = I_ERC20(vault.getCollateralAsset());
        
        // Calculate how many collateral tokens are returned
        uint256 collateralReturned = curve.calculateBurnReturn(
            _meTokensBurned,
            hubId,
            meToken.totalSupply(),
            balancePooled
        );

        uint256 feeRate;
        uint256 collateralMultiplier;
        // If msg.sender == owner, give owner the sell rate.
        // If msg.sender != owner, give msg.sender the burn rate
        if (msg.sender == owner) {
            feeRate = fees.burnOwnerFee();
            collateralMultiplier = PRECISION + PRECISION * balanceLocked / meToken.totalSupply();
        } else {
            feeRate = fees.burnBuyerFee();
            collateralMultiplier = PRECISION - hubDetails.refundRatio;
        }

        uint256 collateralReturnedWeighted = collateralReturned * collateralMultiplier / PRECISION;
        uint256 fee = collateralReturnedWeighted * feeRate / PRECISION;

        uint256 collateralReturnedAfterFees = collateralReturnedWeighted - fee;

        // Burn metoken from user
        meToken.burn(msg.sender, _meTokensBurned);

        // Send collateral from vault
        collateralAsset.transferFrom(address(vault), msg.sender, collateralReturnedAfterFees);

        // TODO: Update balances pooled & locked
        meTokenDetails.balancePooled -= collateralReturned;
        meTokenDetails.balancedLocked += (collateralReturned - collateralReturnedWeighted);

        // Transfer fees
        if (fee > 0) {vault.addFee(fee);}

    }

}