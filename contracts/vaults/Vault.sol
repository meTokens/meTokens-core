pragma solidity ^0.8.0;

contract Vault {

    uint256 private MAX_NUM_COLLATERAL_ASSETS = 5;

	// uint256 hub;
	address collateralAsset;

	mapping (address => MeTokenBalances) MeTokenBalances;

	struct MeTokenBalances{
		uint256 balancePooled;
		uint256 balanceLocked;
	}

	/**
	 * TODO - figure out governance of updating the collateralAsset in a vault
	**/
	function updateCollateralAsset () onlyGov returns() {}

	/**
	 * passes _valueSet through hub.curves.values.calculateMintReturn() and ~.calculateBurnReturn()
	**/
	function mint(_valueSet, _meToken) returns() {}