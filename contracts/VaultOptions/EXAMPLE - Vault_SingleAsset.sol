import "../fees.sol";
import "../HubRegistry/HubRegistry.sol";

contract Vault_SingleAsset is Fees, MeToken, MeTokenRegistry, HubRegistry {

	uint256 hub;
	address collateralAsset;

	mapping (address => MeTokenBalances) MeTokenBalances;

	struct MeTokenBalances{
		uint256 supply;
		uint256 balancePooled;
		uint256 balanceLocked;
		bool subscribed;
	}

	/**
	 * TODO - figure out governance of updating the collateralAsset in a vault
	**/
	function updateCollateralAsset () returns(){}

	/**
	 * passes _valueSet through hub.curveOption.values.calculateMintReturn() and ~.calculateBurnReturn()
	**/
	function mint(uint _amount, address _meToken) returns(){
		uint256 fee = mintFee();
	}

	function burn(uint _amount, address _meToken) returns(){
		MeTokenBalances memory mt = MeTokenBalances[_meToken];
		uint burnReturn = calculateBurnReturn(/**hubValueSetId**/, mt.supply, mt.balancePooled, _amount); //figure out logic
		address recipient = feeRecipient();
		uint256 fee;
		uint256 toUser;
		uint256 toRecipient;
		uint256 toLock;

		if (msg.sender = meToken.owner){
			fee = earnFee();
			uint256 fromLocked = burnReturn / mt.supply * mt.lockedBalance;
			toRecipient = fee * burnReturn;
			toUser = burnReturn - toRecipient + fromLocked;
		} else {
			fee = burnFee();
			toRecipient = fee * burnReturn;
			toUser = burnReturn - toRecipient;
			toLock = 
		}
		_meToken.transferFrom(msg.sender, toRecipient, toRecipient);
		_meToken.transferFrom(msg.sender, toUser, toUser);
		mt.balancePooled -- _amount;
		mt.balanceLocked ++ 
		mt.balanceLocked -- fromLocked;
    }

    /// @notice calculateLockedReturn is used to calculate the amount of locked Eth returned to the owner during a burn/spend
    function calculateLockedReturn(uint256 amountToken, uint256 lockedBalance, uint256 supply) returns (uint256) {
        return amountToken * lockedBalance / supply;
    }
}
