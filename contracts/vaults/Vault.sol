pragma solidity ^0.8.0;

import "../interfaces/I_ERC20.sol";
import "../interfaces/I_VaultRegistry.sol";


/// @title Vault
/// @author Carl Farterson (@carlfarterson)
/// @notice Base vault contract inherited by all vaults
contract Vault {

    modifier onlyVaultFactory(address _from) {
        require(vaultRegistry.isApprovedVaultFactory(msg.sender), "msg.sender not approved vault factory");
        _;
    }

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

    function withdrawFees(bool _max, uint256 _amount, address _to) external {
        require(msg.sender == gov, "!gov");
        if (_max) {
            _amount = accruedFees;
        } else {
            require(_amount <= accruedFees, "_amount cannot exceed feeBalance");
        }

        I_ERC20(collateralAsset).transfer(_to, _amount);
        emit WithdrawFees(_amount, _to);
    }


}