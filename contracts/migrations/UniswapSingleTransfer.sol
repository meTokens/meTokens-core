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
    mapping(address => Details.UniswapSingleTransfer) public usts;

    // NOTE: this can be found at
    // github.com/Uniswap/uniswap-v3-periphery/blob/main/contracts/interfaces/ISwapRouter.sol
    ISwapRouter private immutable _router =
        ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564);

    // args for uniswap router
    uint24 public immutable fee = 3000; // NOTE: 0.3% - the default uniswap fee
    address public hub;
    uint256 public slippage;

    constructor(
        address _dao,
        address _foundry,
        address _hub
    ) Vault(_dao, _foundry) {
        hub = _hub;
    }

    function setSlippage(uint256 _slippage) external {
        require(msg.sender == dao, "!DAO");
        slippage = _slippage;
    }
    /*
    function initialize(
        uint256 _hubId,
        address _owner,
        address _initialVault,
        address _targetVault
    ) external initializer onlyOwner {
        // require(migrationRegistry.isApproved(msg.sender), "!approved");
        transferOwnership(_owner);

        hubId = _hubId;

        initialVault = _initialVault;
        targetVault = _targetVault;

        // token = IVault(_initialVault).getToken();
        // targetToken = IVault(_targetVault).getToken();
    }

    // sends targetVault.getToken() to targetVault
    function finishMigration(address _meToken) external {
        // TODO: foundry access control
        require(swapped && !finished);

        finished = true;

        // Send token to new vault
        // IERC20(token).transfer(targetVault, amountOut);
    }

    function isReady() external view returns (bool) {
        return swapped && finished;
    }

    function getMultiplier() external view returns (uint256) {
        return _multiplier;
    }

    // Trades vault.getToken() to targetVault.getToken();
    function swap(address _meToken) public {
        Details.UniswapSingleTransfer storage ust_ = usts[_meToken];
        Details.Hub memory hub_ = 

        require(!ust_.amountIn > 0, "No swap available");
        require(!ust_.swapped, "swapped");

        // amountIn = IERC20(token).balanceOf(address(this));
        // https://docs.uniswap.org/protocol/guides/swaps/single-swaps
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: ust_.initialToken,
                tokenOut: ust_.targetToken,
                fee: fee,
                recipient: msg.sender, // TODO: target vault
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });

        // The call to `exactInputSingle` executes the swap.
        amountOut = _router.exactInputSingle(params);
        // TODO: validate
        _multiplier = (PRECISION**2 * amountOut) / amountIn / PRECISION;

        // TODO: what if tokenOut changes balances?
        swapped = true;
        token = targetToken;
    }
    */
}
