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
    mapping(address => Details.UniswapSingleTransfer) public usts;

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
    function startMigration(address _meToken) external {
        Details.MeToken memory meToken_ = meTokenRegistry.getDetails(_meToken);
        Details.Hub memory hub_ = hub.getDetails(meToken_.hubId);
        Details.UniswapSingleTransfer storage ust_ = usts[_meToken];

        require(
            block.timestamp > meToken_.startTime,
            "Too soon to start migration"
        );
        require(ust_.amountIn == 0, "Already started");

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

        ust_.amountIn = balance;
    }

    function poke(address _meToken) external {
        Details.MeToken memory meToken_ = meTokenRegistry.getDetails(_meToken);
        Details.UniswapSingleTransfer memory ust_ = usts[_meToken];

        if (block.timestamp > meToken_.startTime && ust_.amountOut == 0) {
            swap(_meToken);
        }
    }

    function finishMigration(address _meToken) external {
        Details.UniswapSingleTransfer storage ust_ = usts[_meToken];
        // TODO: require migration hasn't finished, block.timestamp > meToken_.startTime

        uint256 amountOut;
        if (ust_.amountOut > 0) {
            amountOut = ust_.amountOut;
        } else {
            amountOut = swap(_meToken);
        }

        Details.MeToken memory meToken_ = meTokenRegistry.getDetails(_meToken);
        Details.Hub memory targetHub_ = hub.getDetails(meToken_.targetHubId);
        address asset = getVaultAsset(meToken_.targetHubId);
        require(asset != address(0), "No target asset");

        // Send token to new vault
        IERC20(asset).transfer(targetHub_.vault, amountOut);

        ust_.amountIn = 0;
        ust_.amountOut = 0;
    }

    function swap(address _meToken) public returns (uint256) {
        // TODO: only swap if initialAsset !=
        Details.UniswapSingleTransfer storage ust_ = usts[_meToken];
        Details.MeToken memory meToken_ = meTokenRegistry.getDetails(_meToken);
        Details.Hub memory hub_ = hub.getDetails(meToken_.hubId);
        Details.Hub memory targetHub_ = hub.getDetails(meToken_.targetHubId);

        require(ust_.amountIn > 0, "No amountIn");
        require(ust_.amountOut == 0, "Already swapped");

        address initialAsset = IVault(hub_.vault).getAsset(meToken_.hubId);
        address targetAsset = IVault(targetHub_.vault).getAsset(
            meToken_.targetHubId
        );
        require(
            targetAsset != address(0),
            "MeToken does not have a target hub"
        );

        // Only swap if there's a change in asset
        if (initialAsset == targetAsset) {
            return 0;
        }

        // amountIn = IERC20(token).balanceOf(address(this));
        // https://docs.uniswap.org/protocol/guides/swaps/single-swaps
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: initialAsset,
                tokenOut: targetAsset,
                fee: fee,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: ust_.amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });

        // The call to `exactInputSingle` executes the swap.
        ust_.amountOut = _router.exactInputSingle(params);
        return ust_.amountOut;
    }

    function calcMultiplier(address _meToken)
        external
        view
        returns (uint256 multiplier)
    {
        Details.UniswapSingleTransfer memory ust_ = usts[_meToken];
        require(
            ust_.amountOut > 0 && ust_.amountIn > 0,
            "Multiplier unavailable"
        );
        // TODO: validate
        multiplier =
            (PRECISION**2 * ust_.amountOut) /
            ust_.amountIn /
            PRECISION;
    }

    function getDetails(address _meToken)
        external
        view
        returns (Details.UniswapSingleTransfer memory ust_)
    {
        ust_ = usts[_meToken];
    }
}
