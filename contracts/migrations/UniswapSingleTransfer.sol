// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {ISwapRouter} from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "../interfaces/IHub.sol";
import "../interfaces/IMeTokenRegistry.sol";
import "../interfaces/IMigrationRegistry.sol";
import "../libs/Details.sol";
import "../vaults/Vault.sol";

/// @title Vault migrator from erc20 to erc20 (non-lp)
/// @author Carl Farterson (@carlfarterson)
/// @notice create a vault that instantly swaps token A for token B
///         when recollateralizing to a vault with a different base token
/// @dev This contract moves the pooled/locked balances from
///      one erc20 to another
contract UniswapSingleTransfer is Initializable, Ownable, Vault {
    // NOTE: keys are the meToken address
    // mapping(address => Details.UniswapSingleTransfer) public usts;
    /// @dev key = meToken address, value = if meToken has executed the swap and can finish migrating
    mapping(address => bool) public swapped;
    /// @dev key = meToken address, value = if migration is active and startMigration() has not been triggered
    mapping(address => bool) public started;
    /// @dev key = meToken address, value = finishMigration() has been called so it's not recallable
    mapping(address => bool) public finished;

    // NOTE: this can be found at
    // github.com/Uniswap/uniswap-v3-periphery/blob/main/contracts/interfaces/ISwapRouter.sol
    ISwapRouter private immutable _router =
        ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564);

    // args for uniswap router
    uint24 public immutable fee = 3000; // NOTE: 0.3% - the default uniswap fee
    IHub public hub;
    IMeTokenRegistry public meTokenRegistry;
    IMigrationRegistry public migrationRegistry;
    uint256 public slippage;

    constructor(
        address _dao,
        address _foundry,
        IHub _hub,
        IMeTokenRegistry _meTokenRegistry,
        IMigrationRegistry _migrationRegistry
    ) Vault(_dao, _foundry) {
        hub = _hub;
        meTokenRegistry = _meTokenRegistry;
        migrationRegistry = _migrationRegistry;
    }

    function register(uint256 _hubId, bytes memory _encodedArgs)
        public
        override
    {}

    // function register(address _meToken, bytes memory _encodedArgs) public override {}

    // TODO: validate we need this
    function setSlippage(uint256 _slippage) external {
        require(msg.sender == dao, "!DAO");
        slippage = _slippage;
    }

    function getVaultAsset(uint256 _hubId) private view returns (address) {
        Details.Hub memory hub_ = hub.getDetails(_hubId);
        return IVault(hub_.vault).getAsset(_hubId);
    }

    // Kicks off meToken warmup period
    function initMigration(
        address _meToken,
        address _migration,
        uint256 _targetHubId
    ) external {
        Details.MeToken memory meToken_ = meTokenRegistry.getDetails(_meToken);
        Details.Hub memory hub_ = hub.getDetails(meToken_.hubId);
        Details.Hub memory targetHub_ = hub.getDetails(meToken_.targetHubId);

        require(targetHub_.active, "Inactive _targetHubId");

        // Make sure initial hub, migration, and target hub are a valid path
        require(
            migrationRegistry.isApproved(
                hub_.vault,
                _migration,
                targetHub_.vault
            ),
            "invalid migration path"
        );

        // Get asset of initialHub and targetHub, If they're the same w/ no migration address, we're good
        // TODO: is this needed
        address initialAsset = IVault(hub_.vault).getAsset(meToken_.hubId);
        address targetAsset = IVault(targetHub_.vault).getAsset(
            meToken_.targetHubId
        );

        // NOTE: Target hub already knows the asset you're migrating to
        // Set meToken startTime, endTime, endCooldown, targetHubId, migration
        // meTokenRegistry.
    }

    // Warmup period has ended, send asset to migrationVault
    function startMigration(address _meToken) public {
        Details.MeToken memory meToken_ = meTokenRegistry.getDetails(_meToken);
        Details.Hub memory hub_ = hub.getDetails(meToken_.hubId);

        require(meToken_.targetHubId != 0, "No targetHubId");
        require(
            block.timestamp > meToken_.startTime,
            "Too soon to start migration"
        );
        require(!started[_meToken], "Already started");

        // get asset used as collateral
        address initialAsset = IVault(hub_.vault).getAsset(meToken_.hubId);
        uint256 balance = meToken_.balancePooled + meToken_.balanceLocked;

        // Only transfer to migrationVault if there is one
        if (meToken_.migration != address(0)) {
            IERC20(initialAsset).transferFrom(
                hub_.vault,
                address(this),
                balance
            );
        }

        started[_meToken] = true;
    }

    function poke(address _meToken) external {
        // Make sure meToken is in a state of resubscription

        if (!started[_meToken]) {
            startMigration(_meToken);
        }
        if (!swapped[_meToken]) {
            swap(_meToken);
        }
    }

    function finishMigration(address _meToken)
        external
        returns (uint256 amountOut)
    {
        require(msg.sender == address(meTokenRegistry), "!meTokenRegistry");

        Details.MeToken memory meToken_ = meTokenRegistry.getDetails(_meToken);

        require(!finished[_meToken], "already finished");

        // TODO: require migration hasn't finished, block.timestamp > meToken_.startTime
        if (!started[_meToken]) {
            startMigration(_meToken);
        }

        if (!swapped[_meToken]) {
            amountOut = swap(_meToken);
        } else {
            // No swap, amountOut = amountIn
            amountOut = meToken_.balancePooled + meToken_.balanceLocked;
        }

        Details.Hub memory targetHub_ = hub.getDetails(meToken_.targetHubId);
        address asset = IVault(targetHub_.vault).getAsset(meToken_.targetHubId);

        // Send asset to new vault only if there's a migration vault

        IERC20(asset).transfer(targetHub_.vault, amountOut);

        // reset mappings
        started[_meToken] = false;
        swapped[_meToken] = false;
    }

    function swap(address _meToken) public returns (uint256) {
        Details.MeToken memory meToken_ = meTokenRegistry.getDetails(_meToken);
        Details.Hub memory hub_ = hub.getDetails(meToken_.hubId);
        Details.Hub memory targetHub_ = hub.getDetails(meToken_.targetHubId);

        require(
            meToken_.migration == address(this),
            "This is not the migration vault"
        );
        require(started[_meToken] && !swapped[_meToken], "Not ready to swap");

        address initialAsset = IVault(hub_.vault).getAsset(meToken_.hubId);
        address targetAsset = IVault(targetHub_.vault).getAsset(
            meToken_.targetHubId
        );

        uint256 amountIn = meToken_.balancePooled + meToken_.balanceLocked;
        // Only swap if there's a change in asset
        if (initialAsset == targetAsset) {
            return amountIn;
        }

        // https://docs.uniswap.org/protocol/guides/swaps/single-swaps
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: initialAsset,
                tokenOut: targetAsset,
                fee: fee,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });

        swapped[_meToken] = true;

        // The call to `exactInputSingle` executes the swap
        uint256 amountOut = _router.exactInputSingle(params);

        // Based on amountIn and amountOut, update balancePooled and balanceLocked
        meTokenRegistry.updateBalances(_meToken, amountOut);
    }
}
