// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {ISwapRouter} from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "../interfaces/IHub.sol";
import "../interfaces/IMeTokenRegistry.sol";
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
    uint256 public slippage;

    constructor(
        address _dao,
        address _foundry,
        IHub _hub,
        IMeTokenRegistry _meTokenRegistry
    ) Vault(_dao, _foundry) {
        hub = _hub;
        meTokenRegistry = _meTokenRegistry;
    }

    // TODO: validate we need this
    function setSlippage(uint256 _slippage) external {
        require(msg.sender == dao, "!DAO");
        slippage = _slippage;
    }

    function getVaultAsset(uint256 _hubId) private view returns (address) {
        Details.Hub memory hub_ = hub.getDetails(_hubId);
        return IVault(hub_.vault).getAsset(_hubId);
    }

    function initMigration(address _meToken, bytes memory _encodedArgs)
        external
    {}

    function poke(address _meToken) external {
        swap(_meToken);
    }

    function finishMigration(address _meToken) external {
        Details.UniswapSingleTransfer storage ust_ = usts[_meToken];

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
        Details.UniswapSingleTransfer storage ust_ = usts[_meToken];
        Details.MeToken memory meToken_ = meTokenRegistry.getDetails(_meToken);

        require(ust_.amountIn > 0, "No amountIn");
        require(ust_.amountOut == 0, "Already swapped");

        address initialToken = getVaultAsset(meToken_.hubId);
        address targetToken = getVaultAsset(meToken_.targetHubId);
        require(
            targetToken != address(0),
            "MeToken does not have a target hub"
        );

        // amountIn = IERC20(token).balanceOf(address(this));
        // https://docs.uniswap.org/protocol/guides/swaps/single-swaps
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: initialToken,
                tokenOut: targetToken,
                fee: fee,
                recipient: address(this), // TODO: target vault
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

    function getUniswapSingleTransferDetails(address _meToken)
        external
        view
        returns (Details.UniswapSingleTransfer memory ust_)
    {
        ust_ = usts[_meToken];
    }
}
