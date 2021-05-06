pragma solidity ^0.8.0;


/// @title Vault
/// @author Carl Farterson (@carlfarterson)
/// @notice Base vault contract inherited by all vaults
contract Vault {

    uint256 private PRECISION = 10**18;
    address public owner;
	address private collateralAsset;

    function getCollateralAsset() external view returns (address) {
        return collateralAsset;
    }

}