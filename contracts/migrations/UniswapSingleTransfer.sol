// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import  {ISwapRouter} from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

import "./Migration.sol";

import {MeTokenDetails} from "../libs/Details.sol";


/// @title Vault migrator from erc20 to erc20 (non-lp)
/// @author Carl Farterson (@carlfarterson)
/// @notice create a vault that instantly swaps token A for token B
///         when recollateralizing to a vault with a different base token
/// @dev This contract moves the pooled/locked balances from
///      one erc20 to another
contract UniswapSingleTransfer is Migration, Initializable, Ownable {

    address private immutable WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address private immutable DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;

    uint public hubId;
    address public targetVault;
    bool private finished;
    bool private swapped;   

    // NOTE: this can be found at https://github.com/Uniswap/uniswap-v3-periphery/blob/main/contracts/interfaces/ISwapRouter.sol
    ISwapRouter private router = ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564);

    // args for uniswap router
    address public tokenIn;
    address public tokenOut;
    address public recipient;
    uint24 private immutable fee = 3000; // NOTE: 0.3%
    uint public amountIn;
    uint public amountOut;
    uint public sum;

    

    constructor () {}


    function initialize(
        uint _hubId,
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
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
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
        amountOut = router.exactInputSingle(params);

        swapped = true;
    }    


    // Get sum of balancePooled and balanceLocked for all meTokens subscribed to the hub/vault
    function sumBalances(uint _hubId) external returns (uint) {
        sum = 0;

        // Loop through all subscribed meTokens
        address[] memory subscribed = hub.getSubscribedMeTokens(_hubId);

        for (uint i=0; i<subscribed.length; i++) {
            address meToken = subscribed[i];
            MeTokenDetails memory meTokenDetails = meTokenRegistry.getDetails(meToken);
            sum += meTokenDetails.balancePooled + meTokenDetails.balanceLocked;
        }
        return sum;
    }

    // sends targetVault.getToken() to targetVault
    function finishMigration() external {
        require(swapped && !finished);
        require(sum > 0, "sum not set");

        // Determine rate of conversion
        uint rate = PRECISION * amountIn / amountOut;

        // Update balancePooled and balanceLocked

        address[] memory subscribed = hub.getSubscribedMeTokens(_hubId);


        // Send token to new vault
        IERC20(tokenOut).transfer(targetVault, amountOut);

        finished = true;
    }

}