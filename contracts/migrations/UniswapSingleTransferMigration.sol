// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IChainlinkFeedRegistry} from "../interfaces/IChainlinkFeedRegistry.sol";
import {IHubFacet} from "../interfaces/IHubFacet.sol";
import {IMeTokenRegistryFacet} from "../interfaces/IMeTokenRegistryFacet.sol";
import {IMigration} from "../interfaces/IMigration.sol";
import {ISingleAssetVault} from "../interfaces/ISingleAssetVault.sol";
import {IV3SwapRouter} from "@uniswap/swap-router-contracts/contracts/interfaces/IV3SwapRouter.sol";
import {IQuoter} from "@uniswap/v3-periphery/contracts/interfaces/IQuoter.sol";
import {HubInfo} from "../libs/LibHub.sol";
import {MeTokenInfo} from "../libs/LibMeToken.sol";
import {Vault} from "../vaults/Vault.sol";

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
    IChainlinkFeedRegistry private immutable _feedRegistry =
        IChainlinkFeedRegistry(0x47Fb2585D2C56Fe188D0E6ec628a38b74fCeeeDf);

    // args for uniswap router
    uint24 public constant MINFEE = 500; // 0.05%
    uint24 public constant MIDFEE = 3000; // 0.3% (Default fee)
    uint24 public constant MAXFEE = 1e4; // 1%

    uint256 public constant MIN_PCT_OUT = 95 * 1e16; // 95% returned - 5% slippage

    address public constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address public constant ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant WBTC = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599;
    address public constant BTC = 0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant USD = 0x0000000000000000000000000000000000000348;
    mapping(address => bool) private _stable;

    constructor(address _dao, address _diamond) Vault(_dao, _diamond) {
        _stable[DAI] = true;
        _stable[USDC] = true;
    }

    /// @inheritdoc IMigration
    function initMigration(address meToken, bytes memory encodedArgs)
        external
        override
        onlyDiamond
    {
        MeTokenInfo memory meTokenInfo = IMeTokenRegistryFacet(diamond)
            .getMeTokenInfo(meToken);
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
        if (
            usts.fee != 0 && // make sure meToken is in a state of resubscription
            block.timestamp > meTokenInfo.startTime && // swap can only happen after resubscribe
            !usts.started // should skip if already started
        ) {
            ISingleAssetVault(
                IHubFacet(diamond).getHubInfo(meTokenInfo.hubId).vault
            ).startMigration(meToken);
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
    function isValid(bytes memory encodedArgs)
        external
        pure
        override
        returns (bool)
    {
        // encodedArgs empty
        if (encodedArgs.length == 0) return false;
        uint24 fee = abi.decode(encodedArgs, (uint24));

        // Invalid fee
        return (fee == MINFEE || fee == MIDFEE || fee == MAXFEE);
    }

    function expectedAmountOutMinimum(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) public view returns (uint256) {
        return
            (_calculateAmountOutWithChainlink(tokenIn, tokenOut, amountIn) *
                MIN_PCT_OUT) / PRECISION;
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
                amountOutMinimum: expectedAmountOutMinimum(
                    hubInfo.asset,
                    targetHubInfo.asset,
                    amountIn
                ),
                sqrtPriceLimitX96: 0
            });

        // The call to `exactInputSingle` executes the swap
        amountOut = _router.exactInputSingle(params);

        // Based on amountIn and amountOut, update balancePooled and balanceLocked
        IMeTokenRegistryFacet(diamond).updateBalances(meToken, amountOut);
    }

    function _calculateAmountOutWithChainlink(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) private view returns (uint256 amountOut) {
        uint256 decimalsIn = IERC20Metadata(tokenIn).decimals();
        uint256 decimalsOut = IERC20Metadata(tokenOut).decimals();

        (address base, address quote, uint256 convertedAmountIn) = _convert(
            tokenIn,
            tokenOut,
            amountIn
        );
        uint256 price;

        // Chainlink oracles commonly use XXX / USD and XXX / ETH as "base" / "quote"
        if (quote == USD && base == USD) {
            // NOTE: if both currencies are stables - amountOut should be 1:1 after applying
            // discount rates to peg the stablecoins to $1.
            amountOut = convertedAmountIn;
        } else if (quote == USD || (quote == ETH && base != USD)) {
            // NOTE: && condition handles for failed USD / ETH price as feed does not exist
            uint256 decimalsQuote = _feedRegistry.decimals(base, quote);
            price = uint256(_feedRegistry.latestAnswer(base, quote));
            amountOut = (convertedAmountIn * price) / 10**decimalsQuote;
        } else if (base == USD || base == ETH) {
            uint256 decimalsQuote = _feedRegistry.decimals(quote, base);
            price = uint256(_feedRegistry.latestAnswer(quote, base));
            // need to multiply by price since we switch the order of base/quote in the feedRegistry query
            amountOut = (convertedAmountIn * 10**decimalsQuote) / price;
        } else {
            // Chainlink doesn't return a price for the pair, so we can't protect from slippage
            amountOut = 0;
        }
        amountOut = (amountOut * 10**decimalsOut) / 10**decimalsIn;
    }

    function _convert(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    )
        private
        view
        returns (
            address base,
            address quote,
            uint256 convertedAmountIn
        )
    {
        // handle tokenIn (aka "base") - we divide by price
        if (_stable[tokenIn]) {
            base = USD;
            // - Apply discount rate - if DAI = $0.9998, convert amount to that instead of 1:1
            // - Then, if the stablecoin depegs, meToken will still migrate with the proper
            // slippage protection, even though the price of the stablecoin isn't stable.
            // - Scenario: swap $100 DAI => ETH, 1 DAI = $0.5, we'll get the quote of ETH/USD and
            // use that quote with saying our amountIn is $50
            amountIn =
                (amountIn * 1e8) /
                uint256(_feedRegistry.latestAnswer(tokenIn, USD));
        } else if (tokenIn == WETH) {
            base = ETH;
        } else if (tokenIn == WBTC) {
            base = BTC;
            // wbtc depeg migration protection
            amountIn =
                (amountIn * 1e8) /
                uint256(_feedRegistry.latestAnswer(WBTC, BTC));
        } else {
            base = tokenIn;
        }

        // handle tokenOut (aka "quote") - we multiply by price
        if (_stable[tokenOut]) {
            quote = USD;
            // Scenario: swap $100 DAI => ETH, 1 DAI = $2.0, we'll get the quote of ETH/USD and
            // use that quote with saying our amountIn is $200
            amountIn =
                (amountIn *
                    uint256(_feedRegistry.latestAnswer(tokenOut, USD))) /
                1e8;
        } else if (tokenOut == WETH) {
            quote = ETH;
        } else if (tokenOut == WBTC) {
            quote = BTC;
            // wbtc depeg migration protection
            amountIn =
                (amountIn * uint256(_feedRegistry.latestAnswer(WBTC, BTC))) /
                1e8;
        } else {
            quote = tokenOut;
        }

        convertedAmountIn = amountIn;
    }
}
