// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {ISwapRouter} from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "../libs/Details.sol";

/// @title Vault migrator from erc20 to erc20 (non-lp)
/// @author Carl Farterson (@carlfarterson)
/// @notice create a vault that instantly swaps token A for token B
///         when recollateralizing to a vault with a different base token
/// @dev This contract moves the pooled/locked balances from
///      one erc20 to another
contract UniswapSingleTransfer is Initializable, Ownable {
    address public constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;

    uint256 public hubId;
    address public targetVault;
    bool public finished;
    bool public swapped;

    // NOTE: this can be found at
    // github.com/Uniswap/uniswap-v3-periphery/blob/main/contracts/interfaces/ISwapRouter.sol
    ISwapRouter private immutable _router =
        ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564);

    // args for uniswap router
    address public tokenIn;
    address public tokenOut;
    address public recipient;
    uint24 public immutable fee = 3000; // NOTE: 0.3%
    uint256 public amountIn;
    uint256 public amountOut;
    uint256 public sum;

    function initialize(
        uint256 _hubId,
        address _owner,
        address _targetVault,
        address _tokenIn,
        address _tokenOut
    ) external initializer onlyOwner {
        require(migrationRegistry.isApproved(msg.sender), "!approved");
        transferOwnership(_owner);

        hubId = _hubId;

        tokenIn = _tokenIn;
        tokenOut = _tokenOut;
        targetVault = _targetVault;
    }

    // Trades vault.getToken() to targetVault.getToken();
    function swap() external {
        require(!swapped, "swapped");

        amountIn = IERC20(tokenIn).balanceOf(address(this));
        // https://docs.uniswap.org/protocol/guides/swaps/single-swaps
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });

        // The call to `exactInputSingle` executes the swap.
        amountOut = _router.exactInputSingle(params);

        swapped = true;
    }

    // Get sum of balancePooled and balanceLocked for all meTokens
    //      subscribed to the hub/vault
    function sumBalances() external returns (uint256) {
        sum = 0;

        // Loop through all subscribed meTokens
        address[] memory subscribed = hub.getSubscribedMeTokens(hubId);

        for (uint256 i = 0; i < subscribed.length; i++) {
            address meToken = subscribed[i];
            Details.MeTokenDetails memory meTokenDetails = meTokenRegistry
                .getDetails(meToken);
            sum += meTokenDetails.balancePooled + meTokenDetails.balanceLocked;
        }
        return sum;
    }

    // sends targetVault.getToken() to targetVault
    function finishMigration() external {
        require(swapped && !finished);
        require(sum > 0, "sum not set");

        finished = true;

        // Send token to new vault
        IERC20(tokenOut).transfer(targetVault, amountOut);
    }
}
