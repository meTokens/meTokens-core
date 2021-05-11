pragma solidity ^0.8.0;

import "../interfaces/I_VaultRegistry.sol";


/// @title Vault
/// @author Carl Farterson (@carlfarterson)
/// @notice Base vault contract inherited by all vaults
contract Vault {

    event WithdrawFees(uint256 amount, address to);

    uint256 private PRECISION = 10**18;
    address foundry = address(0x0);  // TODO
    address gov = address(0x0);  // TODO
    I_VaultRegistry public vaultRegistry = I_VaultRegistry(0x0); // TODO


    address public owner;
	address private collateralAsset;
    uint256 accruedFees;

    function getCollateralAsset() external view returns (address) {
        return collateralAsset;
    }

}