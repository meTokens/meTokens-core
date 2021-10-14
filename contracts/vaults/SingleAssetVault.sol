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

    function initialize(
        address _foundry,
        address _token,
        bytes memory _encodedAdditionalArgs
    ) external initializer {
        // TODO: access control?
        token = _token;
        encodedAdditionalArgs = _encodedAdditionalArgs;

        // Approve Foundry to spend all collateral in vault
        IERC20(token).approve(_foundry, 2**256 - 1);
    }
    /*
    // NOTE: this is only callable by hub
    function migrateFromHub(address _migration) external {
        // TODO: access control

        require(!migrated, "migrated");
        uint256 balanceAfterFees = IERC20(token).balanceOf(address(this)) -
            accruedFees;

        IERC20(token).transfer(_migration, balanceAfterFees);

        migrated = true;
        emit Migrate();
    }

    // This is only callable by meTokenRegistry
    function migrateFromRegistry(address _meToken, address _migration) external {
        meTokenRegistry.updateBalances(_meToken);

        Details.MeToken memory meToken_ = meTokenRegistry.getDetails(_meToken);
        Details.Hub memory hub_ = hub.getDetails(meToken_.hubId);

        require(
            hub_.vault == address(this),
            "Hub not subscribed to this vault"
        );

        uint256 amtToTransfer = meToken_.balancePooled + meToken_.balanceLocked;
        address tokenToTransfer = IVault(hub_.vault).getToken();

        IERC20(tokenToTransfer).transfer(_migration, amtToTransfer);
    }
*/
}
