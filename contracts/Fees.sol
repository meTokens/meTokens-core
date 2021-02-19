contract Fees {
	
	uint256 initializeFee; // when a new meToken ERC20 is initialized (deployed) from factory.sol
	uint256 mintFee; // when new meTokens are minted (supply increased)
	uint256 burnFee; // when existing meTokens are burned (supply decreased) by non-owners
	uint256 spendFee; // when meTokens are sent (spent) by non-owners to owners
	uint256 earnFee; // when existing meTokens are burned by owners
	uint256 yieldFee; // when vault funds yield APY
}