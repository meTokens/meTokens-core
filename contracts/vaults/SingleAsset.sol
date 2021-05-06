pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

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
contract SingleAsset is Vault, Initializable {

    event SetCurve(address curveValueSet);

    // TODO: does hub need to be included in vault details?

    address public owner;
    // TODO: move refundRatio to hub level
    // uint256 public refundRatio;
    // note: add this require statement for refundRatio 
    // require(_refundRatio < PRECISION, "_refundRatio >= PRECISION");

    constructor() {}

    function initialize(
        address _owner,
        address _collateralAsset
    ) initializer onlyVaultFactory public {  // TODO: onlyVaultFactory
        owner = _owner;
        collateralAsset = I_ERC20(_collateralAsset);
    }


}