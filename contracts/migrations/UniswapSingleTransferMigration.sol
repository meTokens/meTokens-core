// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IHubFacet} from "../interfaces/IHubFacet.sol";
import {IMeTokenRegistryFacet} from "../interfaces/IMeTokenRegistryFacet.sol";
import {IMigration} from "../interfaces/IMigration.sol";
import {ISingleAssetVault} from "../interfaces/ISingleAssetVault.sol";
import {IV3SwapRouter} from "@uniswap/swap-router-contracts/contracts/interfaces/IV3SwapRouter.sol";
import {HubInfo} from "../libs/LibHub.sol";
import {MeTokenInfo} from "../libs/LibMeToken.sol";
import {Vault} from "../vaults/Vault.sol";
import "hardhat/console.sol";

/// @title Vault migrator from erc20 to erc20 (non-lp)
/// @author Carter Carlson (@cartercarlson), Chris Robison (@cbobrobison), Parv Garg (@parv3213)
/// @notice create a vault that instantly swaps token A for token B
///         when recollateralizing to a vault with a different base token
/// @dev This contract moves the pooled/locked balances from
///      one erc20 to another
contract UniswapSingleTransferMigration is ReentrancyGuard, Vault, IMigration {
    using SafeERC20 for IERC20;

    struct UniswapSingleTransfer {
        // Fee configured to pay on swap
        uint24 fee;
        // if migration is active and startMigration() has not been triggered
        bool started;
    }

    mapping(address => UniswapSingleTransfer) private _uniswapSingleTransfers;

    // NOTE: this can be found at
    // github.com/Uniswap/uniswap-v3-periphery/blob/main/contracts/interfaces/ISwapRouter.sol
    IV3SwapRouter private immutable _router =
        IV3SwapRouter(0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45);

    // args for uniswap router
    uint24 public constant MINFEE = 500; // 0.05%
    uint24 public constant MIDFEE = 3000; // 0.3% (Default fee)
    uint24 public constant MAXFEE = 1e4; // 1%

    modifier onlyDiamond() {
        require(msg.sender == diamond, "!diamond");
        _;
    }

    constructor(address _dao, address _diamond) Vault(_dao, _diamond) {}

    /// @inheritdoc IMigration
    function initMigration(address meToken, bytes memory encodedArgs)
        external
        override
        onlyDiamond
    {
        MeTokenInfo memory meTokenInfo = IMeTokenRegistryFacet(diamond)
            .getMeTokenInfo(meToken);
        console.log("## initMigration uni ");
        require(
            IHubFacet(diamond).getHubInfo(meTokenInfo.hubId).asset !=
                IHubFacet(diamond).getHubInfo(meTokenInfo.targetHubId).asset,
            "same asset"
        );

        _uniswapSingleTransfers[meToken].fee = abi.decode(
            encodedArgs,
            (uint24)
        );
    }

    /// @inheritdoc IMigration
    function poke(address meToken) external override nonReentrant {
        UniswapSingleTransfer storage usts = _uniswapSingleTransfers[meToken];
        MeTokenInfo memory meTokenInfo = IMeTokenRegistryFacet(diamond)
            .getMeTokenInfo(meToken);

        console.log("## poke uni ");
        if (
            usts.fee != 0 && // make sure meToken is in a state of resubscription
            block.timestamp > meTokenInfo.startTime && // swap can only happen after resubscribe
            !usts.started // should skip if already started
        ) {
            ISingleAssetVault(
                IHubFacet(diamond).getHubInfo(meTokenInfo.hubId).vault
            ).startMigration(meToken);
            console.log("## poke WILL START SWAP !!!! uni ");
            usts.started = true;
            _swap(meToken);
        }
    }

    /// @inheritdoc IMigration
    function finishMigration(address meToken)
        external
        override
        nonReentrant
        onlyDiamond
    {
        MeTokenInfo memory meTokenInfo = IMeTokenRegistryFacet(diamond)
            .getMeTokenInfo(meToken);
        HubInfo memory targetHubInfo = IHubFacet(diamond).getHubInfo(
            meTokenInfo.targetHubId
        );
        console.log("## finishMigration uni ");
        uint256 amountOut;
        if (!_uniswapSingleTransfers[meToken].started) {
            ISingleAssetVault(
                IHubFacet(diamond).getHubInfo(meTokenInfo.hubId).vault
            ).startMigration(meToken);
            amountOut = _swap(meToken);
        } else {
            // No swap, amountOut = amountIn
            amountOut = meTokenInfo.balancePooled + meTokenInfo.balanceLocked;
        }

        // Send asset to new vault only if there's a migration vault
        IERC20(targetHubInfo.asset).safeTransfer(
            targetHubInfo.vault,
            amountOut
        );

        // reset mappings
        delete _uniswapSingleTransfers[meToken];
    }

    /// @inheritdoc IMigration
    function isStarted(address meToken) external view override returns (bool) {
        return _uniswapSingleTransfers[meToken].started;
    }

    function getDetails(address meToken)
        external
        view
        returns (UniswapSingleTransfer memory usts)
    {
        usts = _uniswapSingleTransfers[meToken];
    }

    /// @inheritdoc Vault
    function isValid(address meToken, bytes memory encodedArgs)
        external
        view
        override
        returns (bool)
    {
        // encodedArgs empty
        if (encodedArgs.length == 0) return false;

        MeTokenInfo memory meTokenInfo = IMeTokenRegistryFacet(diamond)
            .getMeTokenInfo(meToken);
        uint24 fee = abi.decode(encodedArgs, (uint24));

        // MeToken not subscribed to a hub
        if (meTokenInfo.hubId == 0) return false;
        // Invalid fee
        if (fee == MINFEE || fee == MIDFEE || fee == MAXFEE) {
            return true;
        } else {
            return false;
        }
    }

    /// @inheritdoc IMigration
    function migrationStarted(address meToken)
        external
        view
        override
        returns (bool started)
    {
        return _uniswapSingleTransfers[meToken].started;
    }

    /// @dev parent call must have reentrancy check
    function _swap(address meToken) private returns (uint256 amountOut) {
        UniswapSingleTransfer storage usts = _uniswapSingleTransfers[meToken];
        MeTokenInfo memory meTokenInfo = IMeTokenRegistryFacet(diamond)
            .getMeTokenInfo(meToken);
        HubInfo memory hubInfo = IHubFacet(diamond).getHubInfo(
            meTokenInfo.hubId
        );
        HubInfo memory targetHubInfo = IHubFacet(diamond).getHubInfo(
            meTokenInfo.targetHubId
        );
        uint256 amountIn = meTokenInfo.balancePooled +
            meTokenInfo.balanceLocked;

        // Only swap if
        // - There are tokens to swap
        // - The resubscription has started
        // - The asset hasn't been swapped
        // - Current time is past the startTime it can swap, and time to swap has been set
        if (amountIn == 0) {
            return 0;
        }

        // Approve router to spend
        IERC20(hubInfo.asset).safeApprove(address(_router), amountIn);

        // https://docs.uniswap.org/protocol/guides/swaps/single-swaps
        IV3SwapRouter.ExactInputSingleParams memory params = IV3SwapRouter
            .ExactInputSingleParams({
                tokenIn: hubInfo.asset,
                tokenOut: targetHubInfo.asset,
                fee: usts.fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });

        // The call to `exactInputSingle` executes the swap
        amountOut = _router.exactInputSingle(params);

        // Based on amountIn and amountOut, update balancePooled and balanceLocked
        IMeTokenRegistryFacet(diamond).updateBalances(meToken, amountOut);
    }
}
