contract Vault_SingleAsset {

	uint256 hub;
	address collateralAsset;

	mapping (address => MeTokenBalances) MeTokenBalances;

	struct MeTokenBalances{
		uint256 balancePooled;
		uint256 balanceLocked;
	}

	/**
	 * TODO - figure out governance of updating the collateralAsset in a vault
	**/
	function updateCollateralAsset () returns(){}

	/**
	 * passes _valueSet through hub.curveOption.values.calculateMintReturn() and ~.calculateBurnReturn()
	**/
	function mint(_valueSet, _meToken) returns(){}
	function burn(_valueSet, _meToken) returns(){}

    /// @notice calculateFee is used to calculate the fee earned by the StakeOnMe Development Team whenever a MeToken Purchase or sale occurs throught contract
    function calculateFee(uint256 amountEth) returns (uint256) {
        return amountEth * percent / PRECISION;
    }

    /// @notice calculateLockedReturn is used to calculate the amount of locked Eth returned to the owner during a burn/spend
    function calculateLockedReturn(uint256 amountToken, uint256 lockedBalance, uint256 supply) returns (uint256) {
        return amountToken * lockedBalance / supply;
    }
}