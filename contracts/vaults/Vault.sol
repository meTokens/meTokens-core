pragma solidity ^0.8.0;


/// @title Vault
/// @author Carl Farterson (@carlfarterson)
/// @notice Base vault contract inherited by all vaults
contract Vault {

    uint256 private PRECISION = 10**18;
	address private collateralAsset;
    bool private initialized;

    event SetCollateralAsset(address asset);

    function getCollateralAsset() external view returns (address) {
        return collateralAsset;
    }

	//  TODO - figure out governance of updating the collateralAsset in a vault
	function setCollateralAsset(address _collateralAsset) public onlyGov {
        require(initialized, "!initialized");
        require(_collateralAsset != collateralAsset, "Cannot change asset to same asset");
        collateralAsset = _collateralAsset;
        emit setCollateralAsset(_collateralAsset);
    }