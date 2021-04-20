pragma solidity ^0.8.0;

import "./Vault.sol";
import "../Fees.sol";
import "../MeToken.sol";
import "../registries/MeTokenRegistry.sol";
import "../registries/HubRegistry.sol";
import "../registries/CurveRegistry.sol";


import "../interfaces/I_CurveValueSet.sol";
import "../interfaces/I_ERC20.sol"; // TODO
import "../interfaces/I_MeToken.sol";


/// @title ERC-20 (non-LP) token vault
/// @author Carl Farterson (@carlfarterson)
/// @notice Base single asset vault contract
/// @dev Only callable by the vault factory
contract SingleAsset is Vault {

    event SetCurve(address curveValueSet);

    bytes4 private encodedInitializeFunc = bytes(keccak256("_initialize(uint256,address)"));

    uint256 public id;
    address public owner;
    uint256 public collateralBalance;
    uint256 public refundRatio;
    I_CurveValueSet public curve;

    constructor() {}

    function initialize(
        uint256 _id,
        address _owner,
        // uint256 _hub,
        address _curveValueSet,
        bytes4 encodedArgs // NOTE: this is _refundRatio and _collateralAsset hashed
    ) public onlyVaultFactory {  // TODO: onlyVaultFactory
        require(!initialized, "already initialized");
        require(_refundRatio < PRECISION, "_refundRatio >= PRECISION");
        id = _id;
        owner = _owner;
        // hub = _hub; // TODO: require hub exists
        curve = I_CurveValueSet(_curveValueSet); // TODO: check valueSet approved?

        require(this.call(encodedInitializeFunc, encodedArgs), "Encoding failed");

        initialized = true;
    }

    function _initialize(uint256 _refundRatio, address _collateralAsset) private {
        refundRatio = _refundRatio;
        collateralAsset = I_ERC20(_collateralAsset);
    }

	/**
	 * passes _valueSet through hub.curveDetails.values.calculateMintReturn() and ~.calculateBurnReturn()
	**/
    // TODO: http://coders-errand.com/hash-functions-for-smart-contracts-part-3/
	function mint(address _meToken, uint256 _amount) {
        // require(initialized, "!initialized");

        // MeTokenBalance memory mt = meTokenBalances[_meToken];
        // require(mt.active, "MeToken is not active");

        // // TODO: validate mintFee() is proportional to PRECISION
        // uint256 feeAmount = _amount * mintFee() / PRECISION;
        // uint256 amountAfterFees = _amount - feeAmount;
		
        // // Calculate how much meToken is minted
        // amountMinted = valuesContract.calculateMintReturn(
        //     // hub,
        //     mt.supply,
        //     mt.balancePooled,
        //     amountAfterFees
        // );

        // Update balances
        collateralBalance = collateralBalance + amountAfterFees;
        mt.balancePooled = mt.balancePooled + amountAfterFees;
        mt.supply = mt.supply + amountMinted;

        // Send fees to recipient (TODO: validate feeRecipient())
        // collateralAsset.transferFrom(msg.sender, feeRecipient(), feeAmount);

        // // Send collateral to vault
        // collateralAsset.transferFrom(msg.sender, address(this), amountAfterFees);

        // // Mint meToken
        // I_MeToken(_meToken).mint(msg.sender, amountMinted);
	}

	function burn(uint256 _amount, address _meToken){
        require(intialized, "!initialized");

        MeTokenBalance memory mt = meTokenBalances[_meToken];
        require(mt.active, "MeToken is not active");
		
		uint256 feeAmount;
		uint256 amountAfterFees;

		if (msg.sender = meToken.owner) {
            feeAmount = _amount * burnOwnerFee() / PRECISION;
			amountAfterFees = _amount - feeAmount + earnedfromLocked;

			uint256 amountFromLocked = _amount * mt.balanceLocked / mt.supply;

            // decrease balance locked
            mt.balanceLocked = mt.balanceLocked - earnedfromLocked;
            
		} else {  // burner is not owner

			feeAmount = _amount * burnBuyerFee() / PRECISION;
			amountAfterFees = _amount - feeAmount;

			uint256 amountToLock = amountAfterFees * refundRatio / PRECISION;
            // uint256 amount

            // increase balance locked
            mt.balanceLocked = mt.balanceLocked + amountToLock; 
		}


		_meToken.transfer(feeRecipient(), feeAmount);
		_meToken.transferFrom(msg.sender, toUser, toUser);
		mt.balancePooled -- _amount;
    }

    // TODO: onlyGov modifier
    function setCurve(address _newCurveValueSet) public onlyGov {
        require(initialized, "!initialized");
        require(_newCurveValueSet != address(curve), "Same address");
        curve = I_CurveValueSet(_newCurveValueSet);
        emit SetCurve(_newCurveValueSet);
    }
}