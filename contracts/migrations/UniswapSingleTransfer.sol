// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import  {ISwapRouter} from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
// import {ExactInputSingleParams}

import "./Migration.sol";

/// @title Vault migrator from erc20 to erc20 (non-lp)
/// @author Carl Farterson (@carlfarterson)
/// @notice create a vault that instantly swaps token A for token B
///         when recollateralizing to a vault with a different base token
/// @dev This contract moves the pooled/locked balances from
///      one erc20 to another
contract UniswapSingleTransfer is Migration, Initializable, Ownable {

    bool private swapped;
    bool private finished;
    uint private immutable PRECISION = 10**18;
    address private immutable WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address private immutable DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;


    ISwapRouter private router;
    
    // NOTE: this can be found at https://github.com/Uniswap/uniswap-v3-periphery/blob/main/contracts/interfaces/ISwapRouter.sol
    ISwapRouter.ExactInputSingleParams private params;
    // struct ExactInputSingleParams {
    //     address tokenIn;
    //     address tokenOut;
    //     uint24 fee;
    //     address recipient;
    //     uint256 deadline;
    //     uint256 amountIn;
    //     uint256 amountOutMinimum;
    //     uint160 sqrtPriceLimitX96;
    // }


    constructor () {}

    function initialize(
        address _owner,
        ISwapRouter _router,
        address _tokenIn,
        address _tokenOut,
        address _recipient, // who receives the returned tokens
        uint256 _deadline
    ) external initializer onlyOwner {
        
        require(migrationRegistry.isApproved(msg.sender), "!approved");
        transferOwnership(_owner);
        router = _router;

        params.tokenIn = _tokenIn;
        params.tokenOut = _tokenOut;
        params.recipient = msg.sender;
        params.recipient = _recipient;
        params.deadline = _deadline;
    }

    // Trades vault.getToken() to targetVault.getToken();
    function swap() external {
        require(!swapped, "swapped");

        uint amountToSwap = IERC20(params.tokenIn).balanceOf(address(this));

        // params.fee = 3 * 10**16b;
        params.recipient = address(this);
        params.amountIn = amountToSwap;

        swapped = true;
    }    

    // sends targetVault.getToken() to targetVault
    function finishMigration() external {
        require(swapped && !finished);

        // Get sum of balancePooled and balanceLocked

        finished = true;
    }

}