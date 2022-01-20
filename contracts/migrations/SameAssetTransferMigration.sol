// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../libs/Details.sol";
import "../vaults/Vault.sol";
import "../interfaces/IMigration.sol";
import "../interfaces/ISingleAssetVault.sol";

/// @title Vault migrator from erc20 to erc20 (non-lp)
/// @author Carl Farterson (@carlfarterson)
/// @notice create a vault that instantly swaps token A for token B
///         when recollateralizing to a vault with a different base token
/// @dev This contract moves the pooled/locked balances from
///      one erc20 to another
contract SameAssetTransferMigration is ReentrancyGuard, Vault, IMigration {
    struct SameAssetMigration {
        // if migration is active
        bool isMigrating;
        // if migration is active and startMigration() has not been triggered
        bool started;
    }

    mapping(address => SameAssetMigration) private _sameAssetMigration;

    constructor(
        address _dao,
        address _foundry,
        IHub _hub,
        IMeTokenRegistry _meTokenRegistry,
        IMigrationRegistry _migrationRegistry
    ) Vault(_dao, _foundry, _hub, _meTokenRegistry, _migrationRegistry) {}

    function initMigration(
        address _meToken,
        bytes memory /* _encodedArgs */
    ) external override {
        require(msg.sender == address(meTokenRegistry), "!meTokenRegistry");

        Details.MeToken memory meToken_ = meTokenRegistry.getDetails(_meToken);
        Details.Hub memory hub_ = hub.getDetails(meToken_.hubId);
        Details.Hub memory targetHub_ = hub.getDetails(meToken_.targetHubId);

        require(hub_.asset == targetHub_.asset, "asset different");

        SameAssetMigration storage usts_ = _sameAssetMigration[_meToken];
        usts_.isMigrating = true;
    }

    function poke(address _meToken) external override nonReentrant {
        // Make sure meToken is in a state of resubscription
        // TODO can add a require that checks if _meToken is resubscribing
        SameAssetMigration storage usts_ = _sameAssetMigration[_meToken];
        Details.MeToken memory meToken_ = meTokenRegistry.getDetails(_meToken);
        Details.Hub memory hub_ = hub.getDetails(meToken_.hubId);
        if (usts_.isMigrating && !usts_.started) {
            ISingleAssetVault(hub_.vault).startMigration(_meToken);
            usts_.started = true;
        }
    }

    function finishMigration(address _meToken)
        external
        override
        nonReentrant
        returns (uint256 amountOut)
    {
        require(msg.sender == address(meTokenRegistry), "!meTokenRegistry");
        SameAssetMigration storage usts_ = _sameAssetMigration[_meToken];

        Details.MeToken memory meToken_ = meTokenRegistry.getDetails(_meToken);
        Details.Hub memory hub_ = hub.getDetails(meToken_.hubId);
        Details.Hub memory targetHub_ = hub.getDetails(meToken_.targetHubId);

        if (!usts_.started) {
            ISingleAssetVault(hub_.vault).startMigration(_meToken);
            usts_.started = true;
            // amountOut = _swap(_meToken);
        }
        amountOut = meToken_.balancePooled + meToken_.balanceLocked;

        // Send asset to new vault only if there's a migration vault
        IERC20(targetHub_.asset).transfer(targetHub_.vault, amountOut);

        // reset mappings
        delete _sameAssetMigration[_meToken];
    }

    function getDetails(address _meToken)
        external
        view
        returns (SameAssetMigration memory usts_)
    {
        usts_ = _sameAssetMigration[_meToken];
    }

    // Kicks off meToken warmup period
    function isValid(
        address _meToken,
        bytes memory /* _encodedArgs */
    ) public view override returns (bool) {
        Details.MeToken memory meToken_ = meTokenRegistry.getDetails(_meToken);
        // MeToken not subscribed to a hub
        if (meToken_.hubId == 0) return false;
        return true;
    }
}
