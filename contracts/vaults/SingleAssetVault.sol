// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "./Vault.sol";
import "../libs/Details.sol";
import "../interfaces/IVaultRegistry.sol";
import "../interfaces/IMeTokenRegistry.sol";
import "../interfaces/IHub.sol";
import "../interfaces/IVault.sol";
import "../interfaces/IERC20.sol";

/// @title Vault
/// @author Carl Farterson (@carlfarterson)
/// @notice Implementation contract for SingleAssetFactory.sol
contract SingleAssetVault is Vault, Initializable {
    bool public migrated;

    // TODO: figure out where to set these
    IMeTokenRegistry public meTokenRegistry = IMeTokenRegistry(address(0));
    IHub public hub = IHub(address(0));
    address public foundry = address(0); // TODO

    function initialize(address _token) external initializer {
        // TODO: access control?
        token = _token;

        // Approve Foundry to spend all collateral in vault
        IERC20(token).approve(foundry, 2**256 - 1);
    }
}
