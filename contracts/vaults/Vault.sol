pragma solidity ^0.8.0;

contract Vault {

	address private collateralAsset;

    function getCollateralAsset() external view returns (address) {
        return collateralAsset;
    }

	//  TODO - figure out governance of updating the collateralAsset in a vault
	function setCollateralAsset(address _collateralAsset) public onlyGov {
        require(initialized, "!initialized");
    }