// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../libs/Details.sol";
import "../vaults/Vault.sol";
import "../interfaces/IMigration.sol";
import "../interfaces/ISingleAssetVault.sol";

import {ISwapRouter} from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Vault} from "../vaults/Vault.sol";
import {IMigration} from "../interfaces/IMigration.sol";
import {ISingleAssetVault} from "../interfaces/ISingleAssetVault.sol";
import {MeTokenInfo} from "../libs/LibMeToken.sol";
import {HubInfo} from "../libs/LibHub.sol";

/// @title Vault migrator from erc20 to erc20 (non-lp)
/// @author Carl Farterson (@carlfarterson), Chris Robison (@cbobrobison), Parv Garg (@parv3213)
/// @notice create a vault that instantly swaps token A for token B
///         when recollateralizing to a vault with a different base token
/// @dev This contract moves the pooled/locked balances from
///      one erc20 to another
contract UniswapSingleTransferMigration is ReentrancyGuard, Vault, IMigration {
    struct UniswapSingleTransfer {
        // The earliest time that the swap can occur
        uint256 soonest;
        // Fee configured to pay on swap
        uint24 fee;
        // if migration is active and startMigration() has not been triggered
        bool started;
        // meToken has executed the swap and can finish migrating
        bool swapped;
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
    uint24 public constant MAXFEE = 1e4; // 1%

    constructor(
        address dao,
        address foundry,
        IHub hub,
        IMeTokenRegistry meTokenRegistry,
        IMigrationRegistry migrationRegistry
    ) Vault(dao, foundry, hub, meTokenRegistry, migrationRegistry) {}

    function initMigration(address meToken, bytes memory encodedArgs)
        external
        override
    {
        require(msg.sender == address(meTokenRegistry), "!meTokenRegistry");

        MeTokenInfo memory info = meTokenRegistry.getMeTokenDetails(meToken);
        HubInfo memory hubInfo = hub.getHubDetails(info.hubId);
        HubInfo memory targetHub = hub.getHubDetails(info.targetHubId);

        require(hubInfo.asset != targetHub.asset, "same asset");

        (uint256 soonest, uint24 fee) = abi.decode(
            encodedArgs,
            (uint256, uint24)
        );
        UniswapSingleTransfer storage usts = _uniswapSingleTransfers[meToken];
        usts.fee = fee;
        usts.soonest = soonest;
    }

    function poke(address meToken) external override nonReentrant {
        // Make sure meToken is in a state of resubscription
        UniswapSingleTransfer storage usts = _uniswapSingleTransfers[meToken];
        MeTokenInfo memory info = meTokenRegistry.getMeTokenDetails(meToken);
        HubInfo memory hubInfo = hub.getHubDetails(info.hubId);
        if (
            usts.soonest != 0 && block.timestamp > usts.soonest && !usts.started
        ) {
            ISingleAssetVault(hubInfo.vault).startMigration(meToken);
            usts.started = true;
            _swap(meToken);
        }
    }

    function finishMigration(address meToken)
        external
        override
        nonReentrant
        returns (uint256 amountOut)
    {
        require(msg.sender == address(meTokenRegistry), "!meTokenRegistry");
        UniswapSingleTransfer storage usts = _uniswapSingleTransfers[meToken];
        require(usts.soonest < block.timestamp, "timestamp < soonest");

        MeTokenInfo memory info = meTokenRegistry.getMeTokenDetails(meToken);
        HubInfo memory hubInfo = hub.getHubDetails(info.hubId);
        HubInfo memory targetHub = hub.getHubDetails(info.targetHubId);

        // TODO: require migration hasn't finished, block.timestamp > meToken.startTime
        if (!usts.started) {
            ISingleAssetVault(hubInfo.vault).startMigration(meToken);
            usts.started = true;
            amountOut = _swap(meToken);
        } else {
            // No swap, amountOut = amountIn
            amountOut = info.balancePooled + info.balanceLocked;
        }

        // Send asset to new vault only if there's a migration vault
        IERC20(targetHub.asset).transfer(targetHub.vault, amountOut);

        // reset mappings
        delete _uniswapSingleTransfers[meToken];
    }

    function getDetails(address meToken)
        external
        view
        returns (UniswapSingleTransfer memory usts)
    {
        usts = _uniswapSingleTransfers[meToken];
    }

    // Kicks off meToken warmup period
    function isValid(address meToken, bytes memory encodedArgs)
        external
        view
        override
        returns (bool)
    {
        // encodedArgs empty
        if (encodedArgs.length == 0) return false;
        (uint256 soon, uint24 fee) = abi.decode(encodedArgs, (uint256, uint24));
        // Too soon
        if (soon < block.timestamp) return false;
        MeTokenInfo memory info = meTokenRegistry.getMeTokenDetails(meToken);
        // MeToken not subscribed to a hub
        if (info.hubId == 0) return false;
        // Invalid fee
        if (fee == MINFEE || fee == MIDFEE || fee == MAXFEE) {
            return true;
        } else {
            return false;
        }
    }

    function _swap(address meToken) private returns (uint256 amountOut) {
        UniswapSingleTransfer storage usts = _uniswapSingleTransfers[meToken];
        MeTokenInfo memory info = meTokenRegistry.getMeTokenDetails(meToken);
        HubInfo memory hubInfo = hub.getHubDetails(info.hubId);
        HubInfo memory targetHub = hub.getHubDetails(info.targetHubId);
        uint256 amountIn = info.balancePooled + info.balanceLocked;

        // Only swap if
        // - There are tokens to swap
        // - The resubscription has started
        // - The asset hasn't been swapped
        // - Current time is past the soonest it can swap, and time to swap has been set
        if (
            amountIn == 0 ||
            !usts.started ||
            usts.swapped ||
            usts.soonest == 0 ||
            usts.soonest > block.timestamp
        ) {
            return 0;
        }

        // Approve router to spend
        IERC20(hubInfo.asset).approve(address(_router), amountIn);

        // https://docs.uniswap.org/protocol/guides/swaps/single-swaps
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: hubInfo.asset,
                tokenOut: targetHub.asset,
                fee: usts.fee,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });

        usts.swapped = true;

        // The call to `exactInputSingle` executes the swap
        amountOut = _router.exactInputSingle(params);

        // Based on amountIn and amountOut, update balancePooled and balanceLocked
        meTokenRegistry.updateBalances(meToken, amountOut);
    }
}
