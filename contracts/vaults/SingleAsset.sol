// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "./Vault.sol";


/// @title ERC-20 (non-LP) token vault
/// @author Carl Farterson (@carlfarterson)
/// @notice Base single asset vault contract
/// @dev Only callable by the vault factory
contract SingleAsset is Vault, Initializable {

    constructor() {}

    function initialize(
        address _token,
        bytes memory _encodedAdditionalArgs
    ) initializer public {
        require(vaultRegistry.isApproved(msg.sender), "msg.sender not approved vault factory");

        // NOTE: these variables are initialized in Vault.sol
        token = _token;
        encodedAdditionalArgs = _encodedAdditionalArgs;

        // Approve Foundry to spend all collateral in vault
        IERC20(token).approve(foundry, 2**256 - 1);
    }
}