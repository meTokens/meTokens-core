// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {ISwapRouter} from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "../libs/Details.sol";
import "../vaults/Vault.sol";

/// @title Vault migrator from erc20 to erc20 (non-lp)
/// @author Carl Farterson (@carlfarterson)
/// @notice create a vault that instantly swaps token A for token B
///         when recollateralizing to a vault with a different base token
/// @dev This contract moves the pooled/locked balances from
///      one erc20 to another
contract UniswapSingleTransfer is Initializable, Ownable, Vault {
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
    uint24 public immutable fee = 3000; // NOTE: 0.3% - the default uniswap fee
    uint256 public slippage;

    constructor(
        address _dao,
        address _foundry,
        IHub _hub,
        IMeTokenRegistry _meTokenRegistry,
        IMigrationRegistry _migrationRegistry
    ) Vault(_dao, _foundry, _hub, _meTokenRegistry, _migrationRegistry) {}

    // function register(address _meToken, bytes memory _encodedArgs) public override {}

    // TODO: validate we need this
    function setSlippage(uint256 _slippage) external {
        require(msg.sender == dao, "!DAO");
        slippage = _slippage;
    }

    // Kicks off meToken warmup period
    function isValid(address _meToken, bytes memory _encodedArgs)
        public
        pure
        override
        returns (bool)
    {
        require(_encodedArgs.length > 0, "_encodedArgs empty");
        uint256 soon = abi.decode(_encodedArgs, (uint256));
        require(soon == 0, "soon needs a value");
        return true;
    }

    function initMigration(address _meToken, bytes memory _encodedArgs)
        external
    {
        // TODO: access control

        uint256 soon = abi.decode(_encodedArgs, (uint256));
        // TODO: allowable timefame of swap?
        soonest[_meToken] = soon;
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

        // Send asset to new vault only if there's a migration vault

        IERC20(targetHub_.asset).transfer(targetHub_.vault, amountOut);

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

        address initialAsset = hub_.asset;
        address targetAsset = hub_.asset;

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
