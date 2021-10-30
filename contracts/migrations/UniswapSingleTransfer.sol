// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {ISwapRouter} from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

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
contract UniswapSingleTransfer is Initializable, Ownable, Vault, IMigration {
    mapping(address => uint256) public soonest;
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
    // TODO: configurable fee
    uint24 public immutable MINFEE = 500; // 0.05%
    uint24 public immutable MIDFEE = 3000; // 0.3% (Default fee)
    uint24 public immutable MAXFEE = 10000; // 1%

    constructor(
        address _dao,
        address _foundry,
        IHub _hub,
        IMeTokenRegistry _meTokenRegistry,
        IMigrationRegistry _migrationRegistry
    ) Vault(_dao, _foundry, _hub, _meTokenRegistry, _migrationRegistry) {}

    // Kicks off meToken warmup period
    function isValid(address _meToken, bytes memory _encodedArgs)
        public
        view
        override
        returns (bool)
    {
        require(_encodedArgs.length > 0, "_encodedArgs empty");
        (uint256 soon, uint24 fee) = abi.decode(
            _encodedArgs,
            (uint256, uint24)
        );
        require(soon >= block.timestamp, "Too soon");
        Details.MeToken memory meToken_ = meTokenRegistry.getDetails(_meToken);
        require(meToken_.hubId != 0, "MeToken not subscribed to a hub");
        require(fee == MINFEE || fee == MIDFEE || fee == MAXFEE, "Invalid fee");
        return true;
    }

    function initMigration(address _meToken, bytes memory _encodedArgs)
        external
        override
    {
        require(msg.sender == address(meTokenRegistry), "!meTokenRegistry");
        uint256 soon = abi.decode(_encodedArgs, (uint256));
        soonest[_meToken] = soon;
        started[_meToken] = true;
    }

    function poke(address _meToken) external override {
        // Make sure meToken is in a state of resubscription
        Details.MeToken memory meToken_ = meTokenRegistry.getDetails(_meToken);
        Details.Hub memory hub_ = hub.getDetails(meToken_.hubId);
        if (soonest[_meToken] != 0 && block.timestamp > soonest[_meToken]) {
            ISingleAssetVault(hub_.vault).startMigration(_meToken);
        }
        _swap(_meToken);
    }

    function finishMigration(address _meToken)
        external
        override
        returns (uint256 amountOut)
    {
        require(msg.sender == address(meTokenRegistry), "!meTokenRegistry");
        require(!finished[_meToken], "already finished");

        Details.MeToken memory meToken_ = meTokenRegistry.getDetails(_meToken);
        Details.Hub memory hub_ = hub.getDetails(meToken_.hubId);
        Details.Hub memory targetHub_ = hub.getDetails(meToken_.targetHubId);

        // TODO: require migration hasn't finished, block.timestamp > meToken_.startTime
        if (!started[_meToken]) {
            ISingleAssetVault(hub_.vault).startMigration(_meToken);
        }

        if (!swapped[_meToken]) {
            amountOut = _swap(_meToken);
        } else {
            // No swap, amountOut = amountIn
            amountOut = meToken_.balancePooled + meToken_.balanceLocked;
        }

        // Send asset to new vault only if there's a migration vault
        IERC20(targetHub_.asset).transfer(targetHub_.vault, amountOut);

        // reset mappings
        soonest[_meToken] = 0;
        swapped[_meToken] = false;
        started[_meToken] = false;
    }

    function _swap(address _meToken) private returns (uint256 amountOut) {
        Details.MeToken memory meToken_ = meTokenRegistry.getDetails(_meToken);
        Details.Hub memory hub_ = hub.getDetails(meToken_.hubId);
        Details.Hub memory targetHub_ = hub.getDetails(meToken_.targetHubId);

        // Only swap if
        // - The resubscription has started
        // - The asset hasn't been swapped
        // - Current time is past the soonest it can swap, and time to swap has been set
        if (
            !started[_meToken] ||
            swapped[_meToken] ||
            soonest[_meToken] == 0 ||
            soonest[_meToken] > block.timestamp
        ) {
            return 0;
        }

        uint256 amountIn = meToken_.balancePooled + meToken_.balanceLocked;

        // https://docs.uniswap.org/protocol/guides/swaps/single-swaps
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: hub_.asset,
                tokenOut: targetHub_.asset,
                fee: fee,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });

        swapped[_meToken] = true;

        // The call to `exactInputSingle` executes the swap
        amountOut = _router.exactInputSingle(params);

        // Based on amountIn and amountOut, update balancePooled and balanceLocked
        meTokenRegistry.updateBalances(_meToken, amountOut);
    }

    function getDetails(address _meToken)
        external
        view
        returns (Details.UniswapSingleTransfer memory ust_)
    {
        ust_ = usts[_meToken];
    }
}
