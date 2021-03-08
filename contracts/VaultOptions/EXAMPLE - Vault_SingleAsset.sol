import "../Fees.sol";
import "../MeToken.sol";
import "../registries/MeTokenRegistry.sol";
import "../registries/HubRegistry.sol";
import "../registries/CurveRegistry.sol";

import "../interfaces/I_BancorZeroValues.sol";
import "../interfaces/I_ERC20.sol"; // TODO
import "../interfaces/I_MeToken.sol"; // TODO

contract Vault_SingleAsset is Fees, MeTokenRegistry, HubRegistry, CurveRegistry {

    uint256 private PRECISION = 10**18;
	uint256 public hubId;
    uint256 public collateralBalance;
	I_ERC20 public collateralAsset;
    I_CurveZeroValues public curve;

	mapping (address => MeTokenBalance) meTokenBalances;

	struct MeTokenBalance{
		uint256 supply;
		uint256 balancePooled;
		uint256 balanceLocked;
		bool active;
	}

    event SetCurve(address curveZeroValues);

    constructor(address _collateralAsset, address _curveZeroValues) public {
        collateralAsset = I_ERC20(_collateralAsset);
        curve = I_CurveZeroValues(_curveZeroValues);
    }

	/**
	 * passes _valueSet through hub.curveDetails.values.calculateMintReturn() and ~.calculateBurnReturn()
	**/
    // TODO: http://coders-errand.com/hash-functions-for-smart-contracts-part-3/
	function mint(uint _amount, address _meToken) {

        MeTokenBalance memory mt = meTokenBalances[_meToken];
        require(mt.active, "MeToken is not active");

        uint256 feeAmount = _amount * mintFee() / PRECISION;
        uint256 amountAfterFees = _amount - feeAmount;
		
        // Send fees to recipient (TODO: validate feeRecipient())
        collateralAsset.transferFrom(msg.sender, feeRecipient(), feeAmount);

        // Send collateral to vault
        collateralAsset.transferFrom(msg.sender, address(this), amountAfterFees);

        // Calculate how much meToken is minted
        amountMinted = valuesContract.calculateMintReturn(
            hubId,
            mt.supply,
            mt.balancePooled,
            amountAfterFees
        );

        // Update balances
        collateralBalance = collateralBalance + amountAfterFees;
        mt.balancePooled = mt.balancePooled + amountAfterFees;
        mt.supply = mt.supply + amountMinted;

        // Mint meToken
        I_MeToken(_meToken).mint(msg.sender, amountMinted);
	}

	function burn(uint _amount, address _meToken){

        MeTokenBalance memory mt = meTokenBalances[_meToken];
        require(mt.active, "MeToken is not active");
		
		uint256 feeToRecipient;
		uint256 amountToUser;
        uint256 burnReturn = calculateBurnReturn();
		address recipient = feeRecipient();

		if (msg.sender = meToken.owner) {
			uint256 earnedfromLocked = burnReturn / mt.supply * mt.lockedBalance;
			feeToRecipient = burnOwnerFee() * burnReturn;
			amountToUser = burnReturn - feeToRecipient + earnedfromLocked;

            // decrease balance locked
            mt.balanceLocked = mt.balanceLocked - earnedfromLocked;
            
		} else {
			feeToRecipient = burnBuyerFee() * burnReturn;
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

	//  TODO - figure out governance of updating the collateralAsset in a vault
	function setCollateralAsset(address _collateralAsset) public onlyGov {
    }

    // TODO: onlyGov modifier
    function setCurve(address _newCurveZeroValues) public onlyGov {
        require(_newCurveZeroValues != address(curve), "Same address");
        curve = I_CurveZeroValues(_newCurveZeroValues);
        emit SetCurve(_newCurveZeroValues);
    }
}