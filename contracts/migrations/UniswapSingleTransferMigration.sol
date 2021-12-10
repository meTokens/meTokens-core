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
contract UniswapSingleTransferMigration is
    Initializable,
    Ownable,
    Vault,
    IMigration
{
    struct UniswapSingleTransfer {
        // The earliest time that the swap can occur
        uint256 soonest;
        // Fee configured to pay on swap
        uint24 fee;
        // if migration is active and startMigration() has not been triggered
        bool started;
        // meToken has executed the swap and can finish migrating
        bool swapped;
        // finishMigration() has been called so it's not recallable
        bool finished;
    }

    mapping(address => UniswapSingleTransfer) private _uniswapSingleTransfers;

    // NOTE: this can be found at
    // github.com/Uniswap/uniswap-v3-periphery/blob/main/contracts/interfaces/ISwapRouter.sol
    ISwapRouter private immutable _router =
        ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564);

    // args for uniswap router
    // TODO: configurable fee
    uint24 public constant MINFEE = 500; // 0.05%
    uint24 public constant MIDFEE = 3000; // 0.3% (Default fee)
    uint24 public constant MAXFEE = 10000; // 1%

    constructor(
        address _dao,
        address _foundry,
        IHub _hub,
        IMeTokenRegistry _meTokenRegistry,
        IMigrationRegistry _migrationRegistry
    ) Vault(_dao, _foundry, _hub, _meTokenRegistry, _migrationRegistry) {}

    function initMigration(address _meToken, bytes memory _encodedArgs)
        external
        override
    {
        require(msg.sender == address(meTokenRegistry), "!meTokenRegistry");

        (uint256 soonest, uint24 fee) = abi.decode(
            _encodedArgs,
            (uint256, uint24)
        );
        UniswapSingleTransfer storage usts_ = _uniswapSingleTransfers[_meToken];
        usts_.fee = fee;
        usts_.soonest = soonest;
        usts_.started = true;
    }

    function poke(address _meToken) external override {
        // Make sure meToken is in a state of resubscription
        UniswapSingleTransfer memory usts_ = _uniswapSingleTransfers[_meToken];
        Details.MeToken memory meToken_ = meTokenRegistry.getDetails(_meToken);
        Details.Hub memory hub_ = hub.getDetails(meToken_.hubId);
        if (usts_.soonest != 0 && block.timestamp > usts_.soonest) {
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
        UniswapSingleTransfer storage usts_ = _uniswapSingleTransfers[_meToken];
        require(!usts_.finished, "finished");

        Details.MeToken memory meToken_ = meTokenRegistry.getDetails(_meToken);
        Details.Hub memory hub_ = hub.getDetails(meToken_.hubId);
        Details.Hub memory targetHub_ = hub.getDetails(meToken_.targetHubId);

        // TODO: require migration hasn't finished, block.timestamp > meToken_.startTime
        if (!usts_.started) {
            ISingleAssetVault(hub_.vault).startMigration(_meToken);
        }

        if (
            !usts_.swapped &&
            meToken_.balancePooled + meToken_.balanceLocked > 0
        ) {
            amountOut = _swap(_meToken);
        } else {
            // No swap, amountOut = amountIn
            amountOut = meToken_.balancePooled + meToken_.balanceLocked;
        }

        // Send asset to new vault only if there's a migration vault
        IERC20(targetHub_.asset).transfer(targetHub_.vault, amountOut);

        // reset mappings
        delete _uniswapSingleTransfers[_meToken];
    }

    function getDetails(address _meToken)
        external
        view
        returns (UniswapSingleTransfer memory usts_)
    {
        usts_ = _uniswapSingleTransfers[_meToken];
    }

    // Kicks off meToken warmup period
    function isValid(address _meToken, bytes memory _encodedArgs)
        public
        view
        override
        returns (bool)
    {
        // _encodedArgs empty
        if (_encodedArgs.length == 0) return false;
        (uint256 soon, uint24 fee) = abi.decode(
            _encodedArgs,
            (uint256, uint24)
        );
        // Too soon
        if (soon < block.timestamp) return false;
        Details.MeToken memory meToken_ = meTokenRegistry.getDetails(_meToken);
        // MeToken not subscribed to a hub
        if (meToken_.hubId == 0) return false;
        // Invalid fee
        if (fee == MINFEE || fee == MIDFEE || fee == MAXFEE) {
            return true;
        } else {
            return false;
        }
    }

    function _swap(address _meToken) private returns (uint256 amountOut) {
        UniswapSingleTransfer storage usts_ = _uniswapSingleTransfers[_meToken];
        Details.MeToken memory meToken_ = meTokenRegistry.getDetails(_meToken);
        Details.Hub memory hub_ = hub.getDetails(meToken_.hubId);
        Details.Hub memory targetHub_ = hub.getDetails(meToken_.targetHubId);

        // Only swap if
        // - The resubscription has started
        // - The asset hasn't been swapped
        // - Current time is past the soonest it can swap, and time to swap has been set
        if (
            !usts_.started ||
            usts_.swapped ||
            usts_.soonest == 0 ||
            usts_.soonest > block.timestamp
        ) {
            return 0;
        }

        uint256 amountIn = meToken_.balancePooled + meToken_.balanceLocked;

        // https://docs.uniswap.org/protocol/guides/swaps/single-swaps
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: hub_.asset,
                tokenOut: targetHub_.asset,
                fee: usts_.fee,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });

        usts_.swapped = true;

        // The call to `exactInputSingle` executes the swap
        amountOut = _router.exactInputSingle(params);

        // Based on amountIn and amountOut, update balancePooled and balanceLocked
        meTokenRegistry.updateBalances(_meToken, amountOut);
    }
}
