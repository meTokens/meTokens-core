import "../Fees.sol";
import "../MeToken.sol";
import "../registries/MeTokenRegistry.sol";
import "../registries/HubRegistry.sol";
import "../registries/CurveRegistry.sol";

import "../interfaces/I_BancorZeroValues.sol";


contract Vault_SingleAsset is Fees, MeToken, MeTokenRegistry, HubRegistry, CurveRegistry {

	uint256 public hub;
	address public collateralAsset;

	mapping (address => MeTokenBalance) meTokenBalances;

	struct MeTokenBalance{
		uint256 supply;
		uint256 balancePooled;
		uint256 balanceLocked;
		bool active;
	}

    constructor(address _curveZeroValues) public {
        curveZeroValues = I_CurveZeroValues(_curveZeroValues);
    }

	/**
	 * TODO - figure out governance of updating the collateralAsset in a vault
	**/
	function updateCollateralAsset () returns(){}

	/**
	 * passes _valueSet through hub.curveDetails.values.calculateMintReturn() and ~.calculateBurnReturn()
	**/
    // TODO: http://coders-errand.com/hash-functions-for-smart-contracts-part-3/
	function mint(uint _amount, address _meToken) returns() {

        Hub memory h = hubs[hub];
        curveZeroValues memory c = I_Curve

        // TODO: load this properly
        amountMinted = calculateMintReturn();
		
        uint256 fee = mintFee();
        MeToken(_meToken).mint(msg.sender, amountMinted);
	}

	function burn(uint _amount, address _meToken) returns(){
        
		uint256 fee;
		uint256 amountToUser;
		uint256 feeToRecipient;
		
        MeTokenBalance memory mt = meTokenBalances[_meToken];
        uint256 burnReturn = calculateBurnReturn();
		address recipient = feeRecipient();

		if (msg.sender = meToken.owner) {
			fee = burnOwnerFee();
			uint256 earnedfromLocked = burnReturn / mt.supply * mt.lockedBalance;
			feeToRecipient = fee * burnReturn;
			amountToUser = burnReturn - feeToRecipient + earnedfromLocked;

            // decrease balance locked
            mt.balanceLocked = mt.balanceLocked - earnedfromLocked;
            
		} else {
			fee = burnBuyerFee();
			feeToRecipient = fee * burnReturn;
			amountToUser = burnReturn - feeToRecipient;
			uint256 amountToLock = _amount - amountToUser

            // increase balance locked (TODO: figure out calculation)
            mt.balanceLocked++; 
		}
		_meToken.transferFrom(msg.sender, toRecipient, toRecipient);
		_meToken.transferFrom(msg.sender, toUser, toUser);
		mt.balancePooled -- _amount;
    }

    /// @notice calculateLockedReturn is used to calculate the amount of locked Eth returned to the owner during a burn/spend
    function calculateLockedReturn(address _meToken, uint256 amountToken) returns (uint256) {
        return amountToken * lockedBalance / supply;
    }
}