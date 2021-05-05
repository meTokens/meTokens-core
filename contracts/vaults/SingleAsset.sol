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

    // TODO: arguments
    bytes4 private encodedInitialize = bytes(keccak256("_initialize(uint256,address)"));

    // TODO: does hub need to be included in vault details?
    uint256 public id;
    address public owner;
    uint256 public collateralBalance;
    uint256 public refundRatio;
    I_CurveValueSet public curve;

    constructor() {}

    function initialize(
        uint256 _id,
        address _owner,
        address _curveValueSet,
        bytes4 encodedArgs // NOTE: this is _refundRatio and _collateralAsset hashed
    ) initializer onlyVaultFactory public {  // TODO: onlyVaultFactory
        require(_refundRatio < PRECISION, "_refundRatio >= PRECISION");
        id = _id;
        owner = _owner;
        curve = I_CurveValueSet(_curveValueSet); // TODO: check valueSet approved?

        require(this.call(encodedInitialize, encodedArgs), "Encoding failed");
    }

    function _initialize(uint256 _refundRatio, address _collateralAsset) private {
        refundRatio = _refundRatio;
        collateralAsset = I_ERC20(_collateralAsset);
    }

}