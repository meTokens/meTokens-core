contract Fees {
	
	uint initilizeFee; // when a new meToken ERC20 is initilized (deployed) from factory.sol
	uint mintFee; // when new meTokens are minted (supply increased)
	uint burnFee; // when existing meTokens are burned (supply decreased) by non-owners
	uint spendFee; // when meTokens are sent (spent) by non-owners to owners
	uint earnFee; // when existing meTokens are burned by owners
	uint yieldFee; // when vault funds yield APY
}
